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

// ── Proxy a request to the Anthropic API ────────────────────────
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
    res.writeHead(200, {
      'Content-Type':  mime,
      'Cache-Control': ext === '.html' ? 'no-cache' : 'public, max-age=3600',
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
