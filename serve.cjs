#!/usr/bin/env node
/**
 * ClawSkin Local Server
 * Zero-dependency HTTP server for running ClawSkin locally.
 *
 * Usage:
 *   npm start                → opens http://localhost:3000 in browser
 *   npm start -- --no-open   → start without opening browser
 *   npm start -- --port 8080 → custom port
 *   npx clawskin
 */

const http = require('http');
const fs = require('fs');
const path = require('path');

const MIME = {
  '.html': 'text/html', '.css': 'text/css', '.js': 'application/javascript',
  '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg',
  '.gif': 'image/gif', '.svg': 'image/svg+xml', '.ico': 'image/x-icon',
  '.woff': 'font/woff', '.woff2': 'font/woff2',
};

const args = process.argv.slice(2);
const portIdx = args.indexOf('--port');
const basePort = portIdx >= 0 ? parseInt(args[portIdx + 1], 10) || 3000 : 3000;
const shouldOpen = !args.includes('--no-open');
const publicDir = path.join(__dirname, 'public');

// Security: only bind to localhost by default. Use --host 0.0.0.0 to expose.
const hostIdx = args.indexOf('--host');
const bindHost = hostIdx >= 0 ? args[hostIdx + 1] : '127.0.0.1';

// Read local OpenClaw config for auto-connect
function getLocalGatewayConfig() {
  const os = require('os');
  const configPaths = [
    path.join(os.homedir(), '.openclaw', 'openclaw.json'),
    path.join(os.homedir(), '.openclaw', 'config.json'),
  ];
  for (const p of configPaths) {
    try {
      const raw = fs.readFileSync(p, 'utf8');
      const config = JSON.parse(raw);
      const gw = config.gateway || {};
      const port = gw.port || 18789;
      const agentsList = (config.agents?.list || []).map(a => ({
        id: a.id,
        name: a.identity?.name || a.name || a.id,
      }));
      return {
        gatewayUrl: `ws://localhost:${port}`,
        // Safe to expose token on localhost — serve.cjs binds to 127.0.0.1 by default.
        // The token never leaves the local machine.
        token: (gw.auth && gw.auth.token) || '',
        agents: agentsList,
      };
    } catch { continue; }
  }
  return null;
}

// Security headers applied to every response
function setSecurityHeaders(res) {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Content-Security-Policy',
    "default-src 'self'; " +
    "script-src 'self' 'unsafe-inline'; " +
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; " +
    "font-src 'self' https://fonts.gstatic.com; " +
    "connect-src 'self' ws: wss:; " +
    "img-src 'self' data:; " +
    "frame-ancestors 'self'"
  );
}

function handleRequest(req, res) {
  // Only allow GET requests
  if (req.method !== 'GET') {
    res.writeHead(405); res.end('Method Not Allowed'); return;
  }

  let urlPath = decodeURIComponent(req.url.split('?')[0]);

  // Local-only API: serve gateway config for auto-connect (token is NEVER exposed)
  if (urlPath === '/api/config') {
    const config = getLocalGatewayConfig();
    const body = JSON.stringify(config || { gatewayUrl: 'ws://localhost:18789', hasAuth: false });
    setSecurityHeaders(res);
    res.writeHead(200, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
    res.end(body);
    return;
  }

  if (urlPath === '/') urlPath = '/app.html';
  const filePath = path.join(publicDir, urlPath);
  if (!filePath.startsWith(publicDir)) { res.writeHead(403); res.end('Forbidden'); return; }
  fs.readFile(filePath, (err, data) => {
    if (err) { res.writeHead(err.code === 'ENOENT' ? 404 : 500); res.end(err.code === 'ENOENT' ? 'Not Found' : 'Internal Error'); return; }
    const ext = path.extname(filePath).toLowerCase();
    setSecurityHeaders(res);
    res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream', 'Cache-Control': 'no-cache' });
    res.end(data);
  });
}

function onReady(actualPort) {
  const url = `http://localhost:${actualPort}`;
  console.log(`\n  🐾 ClawSkin running at ${url}\n`);
  console.log(`  → Opens app.html by default`);
  console.log(`  → Auto-connects to OpenClaw Gateway at ws://localhost:18789`);
  if (bindHost === '127.0.0.1') {
    console.log(`  → Bound to localhost only (use --host 0.0.0.0 to expose to network)\n`);
  } else {
    console.log(`  ⚠ Bound to ${bindHost} — accessible from the network\n`);
  }
  if (shouldOpen) {
    const { exec } = require('child_process');
    const cmd = process.platform === 'darwin' ? 'open' : process.platform === 'win32' ? 'start' : 'xdg-open';
    exec(`${cmd} ${url}`);
  }
}

function tryListen(port) {
  const server = http.createServer(handleRequest);
  server.once('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.log(`  ⚠ Port ${port} in use, trying ${port + 1}...`);
      tryListen(port + 1);
    } else { throw err; }
  });
  server.listen(port, bindHost, () => onReady(port));
}

tryListen(basePort);
