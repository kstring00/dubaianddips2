/* Dubai & Dips build. Run by Vercel (see vercel.json) and locally with
   `npm run build`; writes the whole site into dist/.

   1. Every existing file is copied into dist/ as it is. The homepage is
      hand-written and only gets its structured data added to <head>.
   2. The inner pages (/menu, /catering, /visit, /visit/<shop>, /blog,
      /blog/<post>, 404) are generated from config/ordering.js, hours.js,
      menu-board.json and content/blog, reusing the homepage's own header,
      footer and CSS.
   3. sitemap.xml and robots.txt are written last.
   VERCEL_ENV=production leaves draft posts out entirely. */
import fs from 'node:fs';
import path from 'node:path';
import { ROOT, DIST, PROD, CFG, SITE, READY, MISSING_LOCATIONS, HOME_CSS_FILE, FLIGHTS_CSS, flightsSection, read, write, jsonldTag, restaurant, organization, website, lastmod } from './lib.mjs';
import { menuPage, cateringPage, visitIndex, locationPage, notFoundPage, gelatoPage, teamPage, feedPage } from './pages.mjs';
import { buildBlog } from './blog.mjs';

const t0 = Date.now();
const SKIP = new Set(['.git', 'node_modules', 'dist', 'build', 'scripts', 'source', 'content', '.vercel',
  'package.json', 'package-lock.json', '.gitignore', '.vercelignore', 'vercel.json', 'ORDERING.md', '404.html']);

fs.rmSync(DIST, { recursive: true, force: true });
fs.mkdirSync(DIST, { recursive: true });

/* 1. copy */
(function copy(rel) {
  for (const name of fs.readdirSync(path.join(ROOT, rel))) {
    const r = path.join(rel, name);
    if (SKIP.has(r) || name === 'README.md' || name.startsWith('.DS_Store')) continue;
    const src = path.join(ROOT, r), st = fs.statSync(src);
    if (st.isDirectory()) { fs.mkdirSync(path.join(DIST, r), { recursive: true }); copy(r); }
    else fs.copyFileSync(src, path.join(DIST, r));
  }
})('');

/* the homepage: structured data into <head>, nothing else */
const home = read('index.html');
const MARK = '<!-- build:jsonld (structured data is generated from config at build time) -->';
if (!home.includes(MARK)) throw new Error('index.html is missing the build:jsonld marker');
const FL = '<!-- build:flights (the Connecting Flights map, generated from config/flights.js) -->';
if (!home.includes(FL) || !home.includes('/* build:flights-css */')) throw new Error('index.html is missing the build:flights markers');
write('index.html', home.replace(MARK, jsonldTag([organization(), website(), ...READY.map(restaurant)]))
  .replace(FL, flightsSection({ heading: 'Connecting *flights*', lead: 'Six routes out of Houston. Every one lands somewhere on this site.' }))
  .replace('/* build:flights-css */', FLIGHTS_CSS));
write(HOME_CSS_FILE.path.slice(1), HOME_CSS_FILE.body);

/* 2. pages */
const pages = {
  'menu/index.html': menuPage(),
  'catering/index.html': cateringPage(),
  'visit/index.html': visitIndex(),
  /* ready for content: built, noindex, and kept out of the sitemap */
  'gelato/index.html': gelatoPage(),
  'team/index.html': teamPage(),
  'feed/index.html': feedPage(),
  '404.html': notFoundPage()
};
for (const l of READY) pages[`visit/${l.slug}/index.html`] = locationPage(l);
const blog = buildBlog();
Object.assign(pages, blog.files);
for (const [f, html] of Object.entries(pages)) write(f, html);

/* 3. sitemap + robots */
const today = new Date().toISOString().slice(0, 10);
const urls = [
  ['/', lastmod(['index.html', 'config/ordering.js', 'menu-board.json'])],
  ['/menu', lastmod(['menu-board.json', 'build/pages.mjs'])],
  ['/catering', lastmod(['build/pages.mjs', 'config/ordering.js'])],
  ['/visit', lastmod(['build/pages.mjs', 'config/ordering.js'])],
  ...READY.map(l => ['/visit/' + l.slug, lastmod(['build/pages.mjs', 'config/ordering.js'])]),
  ...(blog.posts.some(p => !p.draft) ? [['/blog', blog.posts.filter(p => !p.draft).map(p => p.updated).sort().pop()]] : []),
  ...blog.posts.filter(p => !p.draft).map(p => ['/blog/' + p.slug, p.updated || p.date])
];
write('sitemap.xml', `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map(([u, d]) => `  <url><loc>${SITE}${u === '/' ? '/' : u}</loc><lastmod>${d || today}</lastmod></url>`).join('\n')}
</urlset>
`);
write('robots.txt', PROD
  ? `User-agent: *\nAllow: /\nDisallow: /order-demo\n\nSitemap: ${SITE}/sitemap.xml\n`
  : `# Preview build: not for search engines.\nUser-agent: *\nDisallow: /\n`);

const n = Object.keys(pages).length;
console.log(`built ${n} pages + homepage into dist/ in ${Date.now() - t0}ms (${PROD ? 'production' : 'preview'}: ${blog.posts.length} posts, ${blog.posts.filter(p => p.draft).length} drafts)`);
if (MISSING_LOCATIONS.length) console.log(`note: ${MISSING_LOCATIONS.length} location(s) in config/ordering.js are incomplete and were not published`);
