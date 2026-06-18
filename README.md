# Chronica — History Magazine

## Quick Start

### Requirements
- Node.js 14 or higher (https://nodejs.org)
- An Anthropic API key (https://console.anthropic.com)

### Setup (2 steps)

**Step 1 — Set your API key**

Mac / Linux:
```bash
export ANTHROPIC_API_KEY=sk-ant-your-key-here
```

Windows (Command Prompt):
```cmd
set ANTHROPIC_API_KEY=sk-ant-your-key-here
```

Windows (PowerShell):
```powershell
$env:ANTHROPIC_API_KEY="sk-ant-your-key-here"
```

**Step 2 — Start the server**
```bash
node server.js
```

**Step 3 — Open in browser**
```
http://localhost:3000
```

---

## Why a server?

Browsers block direct calls to the Anthropic API from local files (CORS policy).
The server acts as a secure proxy — your API key stays on your machine and is
never exposed to the browser.

## Files

| File | Purpose |
|------|---------|
| `index.html` | Site structure and HTML |
| `style.css` | All styling |
| `script.js` | All JavaScript |
| `server.js` | Local proxy server (Node.js, no dependencies) |

## Editor Access

Click **✎ Editor** in the top right. Default password: `chronica2024`

## AI Features

All AI features require the server to be running with a valid API key:
- **✦ AI Generate Article** — writes a full article with cover image
- **✦ Generate AI Cover from Title** — generates a cover image via Pollinations
- **✦ Write with AI** — writes the article body from a title
- **This Day in History** widget — generates 3 historical events for today's date
- **Auto-generate articles** — generates 2–3 articles daily on first load
