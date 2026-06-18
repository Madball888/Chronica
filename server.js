/**
 * Chronica — Local API Proxy Server
 * 
 * Keeps your Anthropic API key server-side (never exposed to the browser),
 * proxies AI requests, and serves the site files.
 * 
 * Usage:
 *   1. Set your API key:  export ANTHROPIC_API_KEY=sk-ant-...
 *   2. Run:               node server.js
 *   3. Open:              http://localhost:3000
 */

const http  = require('http');
const https = require('https');
const fs    = require('fs');
const path  = require('path');
const url   = require('url');

const PORT   = process.env.PORT || 3000;
const APIKEY = process.env.ANTHROPIC_API_KEY || '';

// MIME types
const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css':  'text/css; charset=utf-8',
  '.js':   'application/javascript; charset=utf-8',
  '.json': 'application/json',
  '.png':  'image/png',
  '.jpg':  'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg':  'image/svg+xml',
  '.ico':  'image/x-icon',
  '.woff2':'font/woff2',
};

// ── Proxy a request to the Anthropic API (non-streaming) ───────
function proxyAnthropic(req, res) {
  let body = '';
  req.on('data', chunk => body += chunk);
  req.on('end', () => {
    if (!APIKEY) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'ANTHROPIC_API_KEY not set on server. See server.js for instructions.' }));
      return;
    }

    const options = {
      hostname: 'api.anthropic.com',
      path:     '/v1/messages',
      method:   'POST',
      headers: {
        'Content-Type':      'application/json',
        'x-api-key':         APIKEY,
        'anthropic-version': '2023-06-01',
        'Content-Length':    Buffer.byteLength(body),
      },
    };

    const proxyReq = https.request(options, proxyRes => {
      res.writeHead(proxyRes.statusCode, {
        'Content-Type':                'application/json',
        'Access-Control-Allow-Origin': '*',
      });
      proxyRes.pipe(res);
    });

    proxyReq.on('error', err => {
      console.error('Anthropic proxy error:', err.message);
      res.writeHead(502, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Upstream error: ' + err.message }));
    });

    proxyReq.write(body);
    proxyReq.end();
  });
}

// ── Proxy streaming response to the browser via SSE ─────────────
function proxyAnthropicStream(req, res) {
  let body = '';
  req.on('data', chunk => body += chunk);
  req.on('end', () => {
    if (!APIKEY) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'ANTHROPIC_API_KEY not set on server. See server.js for instructions.' }));
      return;
    }

    let parsed;
    try {
      parsed = JSON.parse(body);
    } catch {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Invalid JSON body' }));
      return;
    }

    // Force streaming
    parsed.stream = true;

    const payload = JSON.stringify(parsed);

    res.writeHead(200, {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
    });

    function sse(data) {
      res.write('data: ' + JSON.stringify(data) + '\n\n');
    }

    // notify ready
    sse({ type: 'status', text: 'connected' });

    const options = {
      hostname: 'api.anthropic.com',
      path:     '/v1/messages',
      method:   'POST',
      headers: {
        'Content-Type':      'application/json',
        'x-api-key':         APIKEY,
        'anthropic-version': '2023-06-01',
        'Content-Length':    Buffer.byteLength(payload),
      },
    };

    const proxyReq = https.request(options, proxyRes => {
      proxyRes.on('data', chunk => {
        const text = chunk.toString('utf8');
        // Anthropic streams as JSON lines. We forward each line as a 'delta'.
        // If parsing fails, we still forward raw text as best-effort.
        const lines = text.split(/\r?\n/).filter(l => l.trim().length > 0);
        for (const line of lines) {
          try {
            const obj = JSON.parse(line);
            // Commonly: { type: 'content_block_delta', delta: { text: '...' } } or final message.
            sse({ type: 'anthropic', payload: obj });
          } catch {
            sse({ type: 'raw', payload: line });
          }
        }
      });

      proxyRes.on('end', () => {
        sse({ type: 'done' });
        res.end();
      });
    });

    proxyReq.on('error', err => {
      console.error('Anthropic stream proxy error:', err.message);
      try {
        sse({ type: 'error', error: err.message });
      } catch {}
      res.end();
    });

    proxyReq.write(payload);
    proxyReq.end();
  });
}


// ── Serve static files ───────────────────────────────────────────
function serveStatic(req, res) {
  let filePath = path.join(__dirname, req.url === '/' ? 'index.html' : req.url);
  // Security: prevent directory traversal
  if (!filePath.startsWith(__dirname)) {
    res.writeHead(403); res.end('Forbidden'); return;
  }

  fs.readFile(filePath, (err, data) => {
    if (err) {
      if (err.code === 'ENOENT') { res.writeHead(404); res.end('Not found'); }
      else { res.writeHead(500); res.end('Server error'); }
      return;
    }
    const ext  = path.extname(filePath).toLowerCase();
    const mime = MIME[ext] || 'application/octet-stream';
    // Don't cache code/markup so edits show up on refresh during development.
    // Long-lived caching is reserved for binary assets (images, fonts).
    const longCacheExts = ['.png', '.jpg', '.jpeg', '.svg', '.ico', '.woff2'];
    res.writeHead(200, {
      'Content-Type':  mime,
      'Cache-Control': longCacheExts.includes(ext)
        ? 'public, max-age=3600'
        : 'no-cache',
    });
    res.end(data);
  });
}

// ── Main server ──────────────────────────────────────────────────
const server = http.createServer((req, res) => {
  const { pathname } = url.parse(req.url);

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin':  '*',
      'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, x-api-key, anthropic-version',
    });
    res.end();
    return;
  }

  // Proxy Anthropic API calls
  if (pathname === '/v1/messages' && req.method === 'POST') {
    proxyAnthropic(req, res);
    return;
  }
  if (pathname === '/v1/messages/stream' && req.method === 'POST') {
    proxyAnthropicStream(req, res);
    return;
  }


  // Serve static site files
  serveStatic(req, res);
});

server.listen(PORT, () => {
  console.log('\n╔════════════════════════════════════════╗');
  console.log('║         CHRONICA SERVER RUNNING        ║');
  console.log('╠════════════════════════════════════════╣');
  console.log(`║  Site:  http://localhost:${PORT}           ║`);
  console.log(`║  API:   ${APIKEY ? '✓ Key loaded' : '✗ No API key — set ANTHROPIC_API_KEY'} ${APIKEY ? '         ' : '  '}║`);
  console.log('╠════════════════════════════════════════╣');
  console.log('║  Stop server:  Ctrl + C                ║');
  console.log('╚════════════════════════════════════════╝\n');

  if (!APIKEY) {
    console.log('⚠  To enable AI features, set your API key before starting:\n');
    console.log('   Mac/Linux:  export ANTHROPIC_API_KEY=sk-ant-...');
    console.log('   Windows:    set ANTHROPIC_API_KEY=sk-ant-...\n');
    console.log('   Then restart:  node server.js\n');
  }
});
