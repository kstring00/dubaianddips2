/* Follows every link on every page of the built site (nav, footer, menu
   sheet, in-page) and fails on anything dead: an internal page that does
   not return 200, or a #fragment with no matching id on its page.
   External links are listed, not fetched. Needs the local server:
   node scripts/serve.mjs 4173 & node scripts/crawl-links.mjs */
import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';
const base = process.argv[2] || 'http://localhost:4173';
const start = ['/', '/menu', '/catering', '/visit', '/blog', '/order-demo', '/definitely-missing'];
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1280, height: 900 } });
const seen = new Set(), queue = [...start], external = new Map(), dead = [], ids = {};
let checked = 0;
while (queue.length) {
  const path = queue.shift();
  if (seen.has(path)) continue;
  seen.add(path);
  const res = await p.goto(base + path, { waitUntil: 'domcontentloaded' });
  const st = res ? res.status() : 0;
  if (path !== '/definitely-missing' && st !== 200) { dead.push(`${path} -> ${st}`); continue; }
  await p.waitForTimeout(250);
  const info = await p.evaluate(() => ({
    ids: [...document.querySelectorAll('[id]')].map(e => e.id),
    links: [...document.querySelectorAll('a[href]')].map(a => ({ href: a.getAttribute('href'), text: (a.textContent || '').trim().slice(0, 30), hidden: !!a.closest('[hidden]') }))
  }));
  ids[path.split('#')[0]] = new Set(info.ids);
  for (const l of info.links) {
    if (l.hidden) continue;
    checked++;
    const h = l.href;
    if (/^(tel:|mailto:)/.test(h)) continue;
    if (/^https?:/.test(h)) { if (!h.startsWith(base)) { external.set(h, (external.get(h) || 0) + 1); continue; } }
    const u = new URL(h, base + path);
    if (u.origin !== new URL(base).origin) continue;
    const target = u.pathname;
    if (u.hash) {
      const pg = target;
      (ids.__pending ||= []).push([pg, decodeURIComponent(u.hash.slice(1)), path, l.text]);
    }
    if (!seen.has(target) && !/\.(png|jpg|webp|svg|xml|txt|json|js|css|webmanifest)$/.test(target)) queue.push(target);
    else if (/\.(xml|txt|webp|png|svg)$/.test(target)) { const r = await p.request.get(base + target); if (r.status() !== 200) dead.push(`${target} (from ${path}) -> ${r.status()}`); }
  }
}
/* resolve #fragments: /menu/<slug> redirects land on /menu#<slug> */
for (const [pg, frag, from, text] of ids.__pending || []) {
  let set = ids[pg];
  if (!set) { const r = await p.goto(base + pg); set = ids[pg] = new Set(await p.evaluate(() => [...document.querySelectorAll('[id]')].map(e => e.id))); }
  if (!set.has(frag)) dead.push(`${pg}#${frag} (from ${from} "${text}") -> no such id`);
}
for (const r of ['/menu/frappes', '/menu/', '/visit/clear-lake/']) {
  const res = await p.request.get(base + r, { maxRedirects: 0 });
  console.log('redirect', r, '->', res.status(), res.headers().location);
}
console.log(`${seen.size} pages, ${checked} links checked`);
console.log('external:', [...external.keys()].join('\n  '));
console.log(dead.length ? 'DEAD:\n  ' + dead.join('\n  ') : 'no dead links');
await b.close();
process.exit(dead.length ? 1 : 0);
