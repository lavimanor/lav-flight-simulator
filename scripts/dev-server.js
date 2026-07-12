// Minimal static file server for browser-based smoke testing (no Electron).
// Serves the repo root so /src/index.html and /node_modules/three resolve.
//   node scripts/dev-server.js [port]
const http = require('http');
const { createReadStream, existsSync, statSync } = require('fs');
const { join, normalize, extname } = require('path');

const root = join(__dirname, '..');
const port = Number(process.argv[2]) || Number(process.env.PORT) || 8347;

const mime = {
  '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript',
  '.css': 'text/css', '.json': 'application/json', '.png': 'image/png',
  '.jpg': 'image/jpeg', '.glb': 'model/gltf-binary', '.wav': 'audio/wav',
  '.svg': 'image/svg+xml', '.ico': 'image/x-icon'
};

http.createServer((req, res) => {
  let urlPath = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  // index.html is served at '/', so its relative references (data/, css/, js/,
  // assets/) must map into src/ exactly as they do under Electron's file://.
  if (/^\/(data|css|js|assets)\//.test(urlPath)) urlPath = '/src' + urlPath;
  let filePath = normalize(join(root, urlPath));
  if (!filePath.startsWith(root)) { res.writeHead(403); res.end(); return; }
  if (urlPath === '/') filePath = join(root, 'src', 'index.html');
  if (!existsSync(filePath) || !statSync(filePath).isFile()) {
    res.writeHead(404); res.end('not found: ' + urlPath); return;
  }
  res.writeHead(200, { 'Content-Type': mime[extname(filePath).toLowerCase()] || 'application/octet-stream', 'Cache-Control': 'no-store' });
  createReadStream(filePath).pipe(res);
}).listen(port, () => console.log(`[dev-server] serving ${root} on http://localhost:${port}/`));
