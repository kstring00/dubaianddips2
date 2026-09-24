/* A tiny local server for the built site (run `npm run build` first). It
   mirrors vercel.json: dist/ is the root, /x serves dist/x/index.html,
   /x/ redirects to /x (trailingSlash: false), /menu/<slug> redirects to
   /menu#<slug>, /order-demo serves its page, and anything missing gets
   dist/404.html with a 404.
   Usage: node scripts/serve.mjs [port]   (default 8787) */
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
const root = path.resolve(new URL('../dist', import.meta.url).pathname);
const port = parseInt(process.argv[2] || process.env.PORT || '8787', 10);
const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css', '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.mp4': 'video/mp4', '.woff2': 'font/woff2', '.txt': 'text/plain', '.xml': 'application/xml' };
function send(res, file, status = 200) {
  const ext = path.extname(file);
  res.writeHead(status, { 'Content-Type': types[ext] || 'application/octet-stream', 'Cache-Control': 'no-store' });
  fs.createReadStream(file).pipe(res);
}
const isFile = f => f.startsWith(root) && fs.existsSync(f) && fs.statSync(f).isFile();
export const server = http.createServer((req, res) => {
  const u = new URL(req.url, 'http://x');
  let p = decodeURIComponent(u.pathname);
  const slug = /^\/menu\/([a-z0-9-]+)\/?$/.exec(p);
  if (slug) { res.writeHead(308, { Location: '/menu#' + slug[1] }); return res.end(); }
  if (p.length > 1 && p.endsWith('/')) { res.writeHead(308, { Location: p.slice(0, -1) + u.search }); return res.end(); }
  if (p === '/') p = '/index.html';
  else if (p === '/order-demo') p = '/order-demo.html';
  const file = path.join(root, p);
  if (isFile(file)) return send(res, file);
  if (isFile(path.join(file, 'index.html'))) return send(res, path.join(file, 'index.html'));
  send(res, path.join(root, '404.html'), 404);
});
if (process.argv[1] && process.argv[1].endsWith('serve.mjs')) server.listen(port, () => console.log('serving ' + root + ' on http://localhost:' + port));
