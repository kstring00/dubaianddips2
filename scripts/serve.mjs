/* A tiny local server that mirrors vercel.json: /menu/:slug and
   /order-demo serve their pages, missing paths get 404.html with a 404.
   Usage: node scripts/serve.mjs [port]   (default 8787) */
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
const root = path.resolve(new URL('..', import.meta.url).pathname);
const port = parseInt(process.argv[2] || process.env.PORT || '8787', 10);
const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css', '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.mp4': 'video/mp4', '.woff2': 'font/woff2', '.txt': 'text/plain' };
function send(res, file, status = 200) {
  const ext = path.extname(file);
  res.writeHead(status, { 'Content-Type': types[ext] || 'application/octet-stream', 'Cache-Control': 'no-store' });
  fs.createReadStream(file).pipe(res);
}
export const server = http.createServer((req, res) => {
  let p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  if (p === '/') p = '/index.html';
  else if (/^\/menu\/[a-z0-9-]+\/?$/.test(p)) p = '/index.html';
  else if (p === '/order-demo' || p === '/order-demo/') p = '/order-demo.html';
  const file = path.join(root, p);
  if (file.startsWith(root) && fs.existsSync(file) && fs.statSync(file).isFile()) return send(res, file);
  send(res, path.join(root, '404.html'), 404);
});
if (process.argv[1] && process.argv[1].endsWith('serve.mjs')) server.listen(port, () => console.log('serving ' + root + ' on http://localhost:' + port));
