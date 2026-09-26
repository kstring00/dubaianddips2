/* Pre-flight checks for the ordering work. Run: node scripts/check.mjs
   Needs Playwright with Chromium (npm i -g playwright && npx playwright
   install chromium, or the pre-installed one). Static checks first, then
   the browser walks every Order button on every page twice: once with
   TOAST_ORDER_URL empty (the sheet must open) and once with a dummy URL
   (same tab on a phone, new tab on a desktop), then the demo flow. */
import fs from 'node:fs';
import path from 'node:path';
import { server } from './serve.mjs';
const root = path.resolve(new URL('..', import.meta.url).pathname);
let fails = 0, passes = 0;
const ok = (cond, msg) => { if (cond) { passes++; } else { fails++; console.log('  FAIL ' + msg); } };
/* the checks run against the built site: run `npm run build` first (npm run check does both) */
const read = f => fs.readFileSync(path.join(root, 'dist', f), 'utf8');
const PAGES = ['index.html', 'order-demo.html', '404.html', 'menu/index.html', 'catering/index.html', 'visit/index.html', 'visit/clear-lake/index.html', 'blog/index.html', ...fs.readdirSync(path.join(root, 'dist/blog')).filter(d => d !== 'index.html').map(d => 'blog/' + d + '/index.html')];
const SERVED = ['index.html', 'order-demo.html', '404.html', 'site.js', 'demo.js', 'track.js', 'sw.js', 'manifest.webmanifest'];

console.log('static checks');
/* lorem, hardcoded money outside config */
for (const f of SERVED) ok(!/lorem/i.test(read(f)), f + ' contains "lorem"');
const cfg = read('config/ordering.js');
const nums = [/4\.99/, /2\.99/, /\$\s?15\b/, /\$\s?25\b/, /\$\s?40\b/, /\$\s?50\b/, /\b5 miles\b/, /\b15 minimum\b/, /8\.25/];
/* inline SVG path data (the logo sprite) is coordinates, not prices */
const noSvg = f => read(f).replace(/<svg[\s\S]*?<\/svg>/g, '');
for (const f of SERVED) for (const re of nums) ok(!re.test(noSvg(f)), f + ' has hardcoded ' + re);
ok(/DELIVERY_MINIMUM: 15/.test(cfg) && /DELIVERY_RADIUS_MILES: 5/.test(cfg) && /GROUP_ORDER_MINIMUM: 50/.test(cfg), 'config carries the minimums');
ok(!/order\.example\.com/.test(read('index.html')), 'old placeholder order URL gone');
/* one h1, title + description mention the shop, Houston and the subject */
const titles = new Set(), descs = new Set();
for (const f of PAGES) {
  const s = read(f);
  ok((s.match(/<h1[\s>]/g) || []).length === 1, f + ' has exactly one h1');
  const title = /<title>([^<]+)<\/title>/.exec(s)?.[1] || '', desc = /<meta name="description" content="([^"]+)"/.exec(s)?.[1] || '';
  ok(/Dubai &amp; Dips/.test(title) && /Houston/.test(title), f + ' title mentions Dubai & Dips and Houston: ' + title);
  ok(/Dubai &amp; Dips/.test(desc) && /Houston/.test(desc), f + ' description mentions Dubai & Dips and Houston');
  ok(!titles.has(title) && !descs.has(desc), f + ' title/description unique'); titles.add(title); descs.add(desc);
  ok(/rel="icon"/.test(s), f + ' has a favicon');
  /* every logo <use> points at the sprite on the same page */
  const uses = [...s.matchAll(/<use href="([^"]+)"/g)].map(m => m[1]);
  ok(uses.every(u => u.startsWith('#') && s.includes('id="' + u.slice(1) + '"')), f + ' every <use> resolves on the page (' + uses.filter(u => !u.startsWith('#')).join(',') + ')');
  ok(/property="og:image"/.test(s), f + ' has an OG image');
  ok(/href="tel:\+?\d+"/.test(s), f + ' has a tel: link');
  const imgs = s.match(/<img\b[^>]*>/g) || [];
  ok(imgs.every(t => /\balt="/.test(t)), f + ' every <img> has alt (' + imgs.length + ' images)');
  ok(/rel="manifest"/.test(s), f + ' links the manifest');
}
ok(fs.existsSync(path.join(root, 'dist/404.html')), '404.html is built');
const man = JSON.parse(read('manifest.webmanifest'));
ok(man.display === 'standalone' && man.start_url && man.icons.length >= 3, 'manifest is standalone with icons');
for (const i of man.icons) {
  const f = path.join(root, 'dist', i.src); ok(fs.existsSync(f), 'icon exists ' + i.src);
  if (fs.existsSync(f)) { const b = fs.readFileSync(f); const w = b.readUInt32BE(16), h = b.readUInt32BE(20); ok(i.sizes === w + 'x' + h, i.src + ' is ' + w + 'x' + h); }
}
const sw = read('sw.js');
ok(/url\.origin !== self\.location\.origin\) return/.test(sw) && /mp4/.test(sw), 'service worker skips cross-origin (Toast) and videos');
ok(/order-demo/.test(fs.readFileSync(path.join(root, 'vercel.json'), 'utf8')), 'vercel.json rewrites /order-demo');
ok(!/<input[^>]*(cc-|card)/i.test(read('order-demo.html')) && !/cc-|card-number|cvv|cvc/i.test(read('demo.js')), 'demo has no card inputs');
ok(!/confirmation/i.test(read('demo.js')), 'demo has no confirmation numbers');
ok(/prefers-reduced-motion/.test(read('index.html')) && /prefers-reduced-motion/.test(read('order-demo.html')), 'reduced motion handled');
ok(/DEMO/.test(read('demo.js')) && /demoPill/.test(read('demo.js')), 'demo pill reads the DEMO flag');
ok(!/DoorDash|Uber/i.test(read('index.html') + cfg), 'no third-party apps named');
console.log('  static: ' + passes + ' passed, ' + fails + ' failed');

/* ------------------------------------------------------------ browser */
let chromium;
try { ({ chromium } = await import('playwright')); } catch { try { ({ chromium } = await import('/opt/node22/lib/node_modules/playwright/index.mjs')); } catch { console.log('Playwright not found: browser checks skipped'); process.exit(fails ? 1 : 0); } }
await new Promise(r => server.listen(0, r));
const base = 'http://localhost:' + server.address().port;
const browser = await chromium.launch();
const DUMMY = 'https://order.toasttab.example/dubai-and-dips';
const configWith = (page, url) => page.route('**/config/ordering.js', async r => {
  const res = await r.fetch(); const body = (await res.text()).replace(/TOAST_ORDER_URL: "[^"]*"/, 'TOAST_ORDER_URL: "' + url + '"');
  await r.fulfill({ status: 200, body, headers: { 'content-type': 'text/javascript' } });
});
const VIEWS = [{ name: 'phone 360', w: 360, h: 780, mobile: true }, { name: 'desktop', w: 1280, h: 800, mobile: false }];
const ROUTES = ['/', '/menu', '/catering', '/visit/clear-lake', '/definitely-missing'];
let errors = [];

for (const v of VIEWS) {
  console.log('browser: ' + v.name);
  /* Service workers are blocked in this context so the config override
     always reaches the page; registration is checked in its own context. */
  const ctx = await browser.newContext({ viewport: { width: v.w, height: v.h }, isMobile: v.mobile, hasTouch: v.mobile, deviceScaleFactor: 1, serviceWorkers: 'block' });
  const page = await ctx.newPage();
  page.on('pageerror', e => errors.push(v.name + ': ' + e.message));

  /* --- empty URL: every button opens the sheet --- */
  await configWith(page, '');
  for (const r of ROUTES) {
    await page.goto(base + r); await page.waitForTimeout(300);
    const n = await page.evaluate(() => document.querySelectorAll('[data-order]').length);
    if (r.includes('404') || r.includes('missing')) ok((await page.evaluate(() => !!document.querySelector('a[href^="tel:"]'))), '404 page reachable phone');
    let opened = 0;
    for (let i = 0; i < n; i++) {
      const res = await page.evaluate(i => {
        const el = document.querySelectorAll('[data-order]')[i];
        el.click();
        const sh = document.getElementById('orderSheet');
        const shown = !sh.hidden && getComputedStyle(sh).display !== 'none';
        const tel = sh.querySelector('a[href^="tel:"]') && sh.querySelector('.sheet__hours tr');
        DD.closeSheet();
        return { shown, tel: !!tel, href: el.getAttribute('href'), place: el.getAttribute('data-place') };
      }, i);
      if (res.shown && res.tel && !/^https?:/.test(res.href)) opened++; else ok(false, r + ' button ' + i + ' (' + res.place + ') did not open the sheet: ' + JSON.stringify(res));
    }
    ok(opened === n, r + ': ' + opened + '/' + n + ' order buttons open the sheet with TOAST_ORDER_URL empty');
    const evs = await page.evaluate(() => DD.events.filter(e => e.name === 'order_click').length);
    ok(evs === n, r + ': ' + evs + ' order_click events tracked for ' + n + ' clicks');
  }

  /* --- dummy URL: every button carries it, target by viewport, click really goes there --- */
  await page.unroute('**/config/ordering.js');
  await configWith(page, DUMMY);
  await ctx.route(DUMMY + '**', r => r.fulfill({ status: 200, contentType: 'text/html', body: '<title>toast</title>ok' }));
  for (const r of ['/', '/menu/matchas']) {
    await page.goto(base + r); await page.waitForTimeout(300);
    const info = await page.evaluate(() => [...document.querySelectorAll('[data-order]')].map(el => ({ href: el.getAttribute('href'), target: el.getAttribute('target'), place: el.getAttribute('data-place'), mode: el.getAttribute('data-order') })));
    ok(info.length > 0 && info.every(x => x.href === DUMMY), r + ': all ' + info.length + ' buttons point at the Toast URL');
    ok(info.every(x => v.mobile ? !x.target : x.target === '_blank'), r + ': target is ' + (v.mobile ? 'same tab' : 'new tab') + ' for ' + v.name);
    ok(await page.evaluate(() => document.querySelector('.thumbbar__call').getAttribute('href').startsWith('tel:')), r + ': call is a tel: link');
    /* click a sample of buttons for real */
    const sample = [...new Set(info.map(x => x.place))].map(p => info.findIndex(x => x.place === p));
    /* Real pointer clicks (a synthetic click cannot open a new tab): the
       landing copy is scrolled into its live position, a closed board row
       is opened first, and a control hidden at this width is skipped. */
    for (const i of sample) {
      await page.goto(base + r); await page.waitForTimeout(200);
      const el = page.locator('[data-order]').nth(i);
      const place = info[i].place;
      if (place === 'hero') { await page.evaluate(() => window.scrollTo(0, 0)); await page.waitForTimeout(900); }
      else if (place === 'hero-landing') { await page.evaluate(() => window.scrollTo(0, (document.getElementById('top').offsetHeight - innerHeight) * .71)); await page.waitForTimeout(1600); }
      else if (place === 'header') { await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight / 2)); await page.waitForTimeout(900); }
      else if (place === 'item' || place === 'category') { await el.evaluate(e => e.closest('.brow').querySelector('.brow__btn').click()); await page.waitForTimeout(300); }
      /* the footer's mailing-box lid opens once most of the footer is in view */
      else if (place === 'footer') { await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight)); await page.waitForTimeout(1500); }
      if (place !== 'hero' && place !== 'hero-landing' && place !== 'header' && place !== 'footer') { await el.evaluate(e => e.scrollIntoView({ block: 'center' })); await page.waitForTimeout(150); }
      if (!(await el.isVisible())) { console.log('  skip ' + place + ' (not shown at ' + v.name + ')'); continue; }
      const click = () => el.click({ timeout: 5000 }).catch(e => { ok(false, r + ' click ' + place + ' failed: ' + String(e).split('\n').slice(0, 14).join(' | ')); });
      if (v.mobile) {
        await Promise.all([page.waitForURL(u => u.href.startsWith(DUMMY), { timeout: 5000 }).catch(() => null), click()]);
        ok(page.url().startsWith(DUMMY), r + ' click ' + place + ' navigates same tab on phone (' + page.url() + ')');
      } else {
        const [pop] = await Promise.all([ctx.waitForEvent('page', { timeout: 5000 }).catch(() => null), click()]);
        ok(pop && pop.url().startsWith(DUMMY), r + ' click ' + place + ' opens a new tab on desktop');
        if (pop) await pop.close();
        ok(page.url().startsWith(base), r + ' original tab stays put on desktop');
      }
    }
  }
  await ctx.unroute(DUMMY + '**'); await page.unroute('**/config/ordering.js');

  /* --- 404 with a URL set --- */
  await configWith(page, DUMMY);
  await page.goto(base + '/nope'); ok((await page.getAttribute('[data-place="404"]', 'href')) === DUMMY, '404 order link uses the Toast URL when set');
  await page.unroute('**/config/ordering.js');

  /* --- layout: overflow, tap targets, sticky bar, hero CTA first paint --- */
  for (const r of ['/', '/order-demo', '/404.html', '/menu', '/catering', '/visit', '/visit/clear-lake', '/blog', '/blog/dubai-chocolate-houston-explained']) {
    await page.goto(base + r); await page.waitForTimeout(300);
    const sw = await page.evaluate(() => document.documentElement.scrollWidth);
    ok(sw <= v.w, r + ' no horizontal overflow at ' + v.w + ' (scrollWidth ' + sw + ')');
    const small = await page.evaluate(() => [...document.querySelectorAll('a,button')].filter(el => {
      const rct = el.getBoundingClientRect(); const cs = getComputedStyle(el);
      if (cs.display === 'none' || cs.visibility === 'hidden' || rct.width === 0 || rct.height === 0) return false;
      if (el.closest('[hidden]') || el.classList.contains('skip') || el.classList.contains('vh')) return false;
      return rct.height < 44 || rct.width < 44;
    }).map(el => (el.className || el.tagName) + ' ' + Math.round(el.getBoundingClientRect().width) + 'x' + Math.round(el.getBoundingClientRect().height)));
    /* nav links, footer links and review arrows are pre-existing text links; only ordering controls are held to 44px here */
    const orderSmall = small.filter(s => /order|thumbbar|sheet|btn|mode|qty|chips|dhead|act/.test(s));
    ok(orderSmall.length === 0, r + ' ordering tap targets >= 44px: ' + orderSmall.join(', '));
  }
  await page.goto(base + '/'); await page.waitForTimeout(200);
  const cta = await page.evaluate(() => { const r = document.querySelector('#heroCta [data-order="pickup"]').getBoundingClientRect(); return { top: r.top, bottom: r.bottom, w: r.width, h: r.height }; });
  ok(cta.top >= 0 && cta.bottom <= v.h && cta.h >= 44, 'hero pickup CTA inside first viewport at scroll 0: ' + JSON.stringify(cta));
  if (v.mobile) {
    const bar = await page.evaluate(() => { const b = document.querySelector('.thumbbar').getBoundingClientRect(); const pad = parseFloat(getComputedStyle(document.body).paddingBottom); const cs = getComputedStyle(document.querySelector('.thumbbar')); return { visible: b.height > 0, bottom: b.bottom, pad, h: b.height, safe: cs.paddingBottom, ctaBottom: document.querySelector('#heroCta').getBoundingClientRect().bottom, barTop: b.top }; });
    ok(bar.visible && Math.abs(bar.bottom - v.h) < 1, 'sticky bar sits at the bottom edge');
    ok(bar.pad >= bar.h, 'body padding-bottom (' + bar.pad + ') covers the bar (' + bar.h + ') so nothing is hidden');
    ok(bar.ctaBottom < bar.barTop, 'hero CTA clears the sticky bar');
    ok(/env\(safe-area-inset-bottom/.test(read('index.html').split('.thumbbar{')[1]), 'sticky bar pads for the iOS safe area');
    const order = await page.evaluate(() => { const a = document.querySelector('.thumbbar a'); return a.textContent.trim() + '|' + a.getAttribute('data-order'); });
    ok(order === 'Order pickup|pickup', 'sticky bar: pickup first (' + order + ')');
  }
  /* header: out of the way during the opening intro, slides in after it,
     hides again at the top, and shows at once when focused */
  const navTop = () => page.evaluate(() => document.getElementById('nav').getBoundingClientRect().bottom);
  ok((await navTop()) <= 1, 'header hidden during the opening intro (bottom ' + (await navTop()) + ')');
  await page.focus('.nav__order'); await page.waitForTimeout(350);
  ok((await navTop()) > 40, 'header shows at once when the Order button takes focus');
  await page.evaluate(() => document.activeElement.blur()); await page.waitForTimeout(350);
  ok((await navTop()) <= 1, 'header hides again when focus leaves during the intro');
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight / 2)); await page.waitForTimeout(900);
  ok(await page.evaluate(() => getComputedStyle(document.querySelector('.nav__order')).opacity === '1' && document.querySelector('.nav__order').getBoundingClientRect().top >= 0), 'header Order button visible mid-page');
  await page.evaluate(() => window.scrollTo(0, 0)); await page.waitForTimeout(1200);
  ok((await navTop()) <= 1, 'header hides again back at the top');

  /* --- film deferred: no video bytes requested before load --- */
  const reqs = [];
  const p2 = await ctx.newPage(); p2.on('request', q => reqs.push({ url: q.url(), t: Date.now() }));
  const t0 = Date.now(); await p2.goto(base + '/', { waitUntil: 'domcontentloaded' });
  const firstPaintVideo = reqs.some(q => /hero\.mp4/.test(q.url));
  ok(!firstPaintVideo, 'no hero video request before DOMContentLoaded');
  await p2.waitForLoadState('load'); await p2.waitForTimeout(500);
  ok(reqs.some(q => /hero\.mp4/.test(q.url)), 'hero video requested after load');
  ok(!reqs.some(q => /craft\.mp4/.test(q.url)), 'craft video not requested at load');
  await p2.close();

  /* --- social wall on /feed: built from config/feed.js, follow links right, no embed
     script until a card is opened, the modal falls back to the poster --- */
  {
    const sc = await browser.newContext({ viewport: { width: v.w, height: v.h }, isMobile: v.mobile, hasTouch: v.mobile });
    const sp = await sc.newPage(), ext = [];
    sp.on('request', q => { if (/tiktok\.com|instagram\.com/.test(q.url())) ext.push(q.url()); });
    await sp.route('**/config/feed.js', async r => { const t = await (await r.fetch()).text(); r.fulfill({ body: t.replace('url: ""', 'url: "https://www.tiktok.com/@dubai.dips/video/7300000000000000000"'), contentType: 'text/javascript' }); });
    await sp.route(/(tiktok|instagram)\.com\/embed\.js/, r => r.abort());
    await sp.goto(base + '/feed'); await sp.evaluate(() => document.getElementById('social').scrollIntoView()); await sp.waitForTimeout(900);
    const w = await sp.evaluate(() => ({
      cards: document.querySelectorAll('#socialWall .bp').length,
      follow: [...document.querySelectorAll('#socialWall .bp--follow')].map(a => a.href + '|' + a.target + '|' + a.rel),
      links: [...document.querySelectorAll('#socialWall a.bp')].every(a => /^https:\/\/www\.(tiktok\.com\/@dubai\.dips|instagram\.com\/dubaianddips\/)$/.test(a.href) && a.target === '_blank' && /noopener/.test(a.rel)),
      imgs: [...document.querySelectorAll('#socialWall img')].every((i, k) => i.alt.length > 10 && (k < 3 ? i.loading !== 'lazy' : i.loading === 'lazy') && i.decoding === 'async' && i.width && i.height),
      over: document.documentElement.scrollWidth - innerWidth,
      nav: ![...document.querySelectorAll('.nav__links a')].some(a => a.getAttribute('href').startsWith('#')),
      h2: document.getElementById('social-title').tagName
    }));
    ok(w.cards === 10, 'social: 8 posts + 2 follow tickets (' + w.cards + ')');
    ok(w.follow.join() === 'https://www.tiktok.com/@dubai.dips|_blank|noopener,https://www.instagram.com/dubaianddips/|_blank|noopener', 'social: follow tickets link the right profiles in a new tab');
    ok(w.links && w.imgs, 'social: every card link opens a profile in a new tab; every image has alt, async, size; lazy after the first three');
    ok(w.over <= 0, 'social: no horizontal overflow (' + w.over + ')');
    ok(w.nav && w.h2 === 'H1', 'nav has page links only (no scroll-to-section links); the Feed title is the h1');
    ok(ext.length === 0, 'social: no TikTok/Instagram request before a card is opened');
    await sp.click('#socialWall button[data-post="0"]'); await sp.waitForTimeout(400);
    ok(await sp.evaluate(() => !document.getElementById('swm').hidden && document.activeElement.classList.contains('swm__close') && getComputedStyle(document.querySelector('.swm__fallback')).display !== 'none' && /Open on TikTok/.test(document.querySelector('.swm__open').textContent)), 'social: modal opens on the poster fallback with an Open on TikTok button');
    ok(ext.some(u => /tiktok\.com\/embed\.js/.test(u)), 'social: TikTok embed script requested only after the click');
    await sp.keyboard.press('Escape');
    ok(await sp.evaluate(() => document.getElementById('swm').hidden && document.activeElement.getAttribute('data-post') === '0'), 'social: Esc closes and returns focus to the card');
    await sc.close();
  }

  /* --- the board and the footer gate tell the truth about the hours
     (shop time via ?at=, America/Chicago) --- */
  for (const [at, want] of [['2026-09-28T14:10', 'open'], ['2026-09-28T21:45', 'soon'], ['2026-09-28T22:30', 'closed'], ['2026-09-26T00:30', 'closed-sat']]) {
    const hc = await browser.newContext({ viewport: { width: v.w, height: v.h }, isMobile: v.mobile, hasTouch: v.mobile });
    const hp = await hc.newPage();
    await hp.goto(base + '/?at=' + at); await hp.evaluate(() => document.getElementById('board').scrollIntoView()); await hp.waitForTimeout(1400);
    const got = await hp.evaluate(() => ({
      row1: [...document.querySelector('.brow').querySelectorAll('.flap__ch')].map(c => c.textContent).join('').trim(),
      nb: [...document.querySelectorAll('.brow')].some(r => [...r.querySelectorAll('.flap__ch')].map(c => c.textContent).join('').includes('NOW BOARDING')),
      sr: document.querySelector('.brow__sr').textContent,
      gate: document.getElementById('gateState').textContent + ' | ' + document.getElementById('gateCount').textContent,
      over: document.documentElement.scrollWidth - document.documentElement.clientWidth
    }));
    if (want === 'open') ok(got.row1 === 'NOW BOARDING' && /Open now/.test(got.sr) && /Open now · closes 10 PM \| Closes in 7h 50m/.test(got.gate), 'hours open: ' + JSON.stringify(got));
    if (want === 'soon') ok(got.row1 === 'FINAL CALL' && /Final call · closes 10 PM \| Closes in 15m/.test(got.gate), 'hours closing soon: ' + JSON.stringify(got));
    if (want === 'closed') ok(got.row1 === 'OPENS TUE 9AM' && !got.nb && /Closed, opens Tuesday 9 AM/.test(got.sr) && /Closed · opens Tue 9 AM \| Opens in 10h 30m/.test(got.gate), 'hours closed: ' + JSON.stringify(got));
    if (want === 'closed-sat') ok(got.row1 === 'OPENS 9AM' && !got.nb && /Opens in 8h 30m/.test(got.gate), 'hours closed after Friday midnight: ' + JSON.stringify(got));
    ok(got.over <= 0, 'no horizontal overflow with the board at ' + at);
    await hc.close();
  }

  /* --- reduced motion: CTA visible --- */
  const rm = await browser.newContext({ viewport: { width: v.w, height: v.h }, isMobile: v.mobile, hasTouch: v.mobile, reducedMotion: 'reduce' });
  const rp = await rm.newPage(); await rp.goto(base + '/'); await rp.waitForTimeout(300);
  ok(await rp.evaluate(() => { const el = document.querySelector('#heroLand [data-order="pickup"]'); const r = el.getBoundingClientRect(); return getComputedStyle(document.getElementById('heroLand')).opacity === '1' && r.top >= 0 && r.bottom <= innerHeight; }), 'reduced motion: landing pickup CTA visible');
  await rm.close();

  /* --- contact form --- */
  await page.goto(base + '/'); await page.waitForTimeout(200);
  await page.fill('#cName', 'Test'); await page.fill('#cEmail', 't@example.com'); await page.fill('#cMsg', 'Hi');
  await page.evaluate(() => document.getElementById('contactForm').requestSubmit());
  ok(await page.evaluate(() => document.getElementById('thanks').classList.contains('is-on')), 'contact form submit shows the thanks state');

  /* --- service worker + manifest --- */
  const swc = await browser.newContext({ viewport: { width: v.w, height: v.h } }); const swp = await swc.newPage();
  await swp.goto(base + '/'); await swp.waitForLoadState('load');
  const reg = await swp.evaluate(async () => { const r = await navigator.serviceWorker.ready; return !!r.active || !!r.installing || !!r.waiting; }).catch(() => false);
  ok(reg, 'service worker registers on localhost');
  await swp.waitForTimeout(800);
  const cached = await swp.evaluate(async () => { const keys = await caches.keys(); const c = await caches.open(keys[0]); const all = (await c.keys()).map(r => new URL(r.url).pathname); return { n: all.length, mp4: all.some(p => /mp4/.test(p)), shell: all.includes('/site.js') && all.includes('/config/ordering.js'), foreign: all.some(p => false) }; }).catch(e => ({ err: String(e) }));
  ok(cached.shell && !cached.mp4, 'service worker cached the shell and no video: ' + JSON.stringify(cached));
  await swc.close();
  const manRes = await page.request.get(base + '/manifest.webmanifest');
  ok(manRes.ok() && (await manRes.json()).display === 'standalone', 'manifest served');

  /* --- the demo --- */
  await page.goto(base + '/order-demo'); await page.waitForTimeout(300);
  const C = await page.evaluate(() => DD_CONFIG);
  ok(await page.isVisible('#demoPill'), 'demo pill shown when DEMO is true');
  ok(await page.evaluate(() => document.querySelectorAll('input').length === document.querySelectorAll('input[type=radio]').length), 'demo: the only inputs are modifier radios (no card fields)');
  await page.click('[data-mode="delivery"]'); await page.waitForTimeout(250);
  ok(await page.evaluate(() => document.querySelector('.screen[data-step="2"]').classList.contains('is-on')), 'demo: step 1 -> 2 without reload');
  ok(await page.evaluate(() => document.querySelectorAll('#items .item').length === 6), 'demo: 6 items');
  ok(await page.evaluate(() => document.querySelectorAll('#items .item img').length === 5 && document.querySelectorAll('#items .item__plate').length === 1), 'demo: 5 photos + 1 typographic plate');
  await page.click('.item[data-id="dubai-frappe"] [data-add]'); await page.waitForTimeout(100);
  ok(await page.isDisabled('#actBtn') === false, 'demo: cart button enabled after add');
  await page.click('#actBtn'); await page.waitForTimeout(250);
  const t1 = await page.evaluate(() => document.getElementById('totals').textContent);
  ok(/Delivery fee/.test(t1) && await page.isVisible('#minNotice') && await page.isDisabled('#actBtn'), 'demo: below-minimum delivery blocks checkout with a notice');
  await page.goBack(); await page.waitForTimeout(250);
  ok(await page.evaluate(() => document.querySelector('.screen[data-step="2"]').classList.contains('is-on')), 'demo: browser back walks to the previous step');
  await page.click('.item[data-id="kunafa"] [data-add]'); await page.click('.item[data-id="kunafa"] [data-inc]'); await page.waitForTimeout(100);
  await page.click('#actBtn'); await page.waitForTimeout(250);
  const calc = await page.evaluate(() => { const t = [...document.querySelectorAll('#totals li')].map(li => li.textContent.replace(/\s+/g, ' ').trim()); return t; });
  const sub = 8.5 + 9 * 2, expFee = [...C.DELIVERY_FEE_TIERS].sort((a, b) => a.min - b.min).reduce((f, t) => sub >= t.min ? t.fee : f, null);
  const total = sub + sub * C.DEMO_TAX_RATE + expFee + sub * 0.15;
  ok(calc[0].includes('$' + sub.toFixed(2)) && calc[2].includes('$' + expFee.toFixed(2)) && calc[4].includes('$' + total.toFixed(2)), 'demo: subtotal, tier fee and total computed from config: ' + calc.join(' | '));
  await page.click('#tipChips button:nth-child(4)'); await page.waitForTimeout(100);
  ok((await page.evaluate(() => document.querySelector('#totals .is-total').textContent)).includes('$' + (sub + sub * C.DEMO_TAX_RATE + expFee + sub * 0.2).toFixed(2)), 'demo: tip selector changes the total');
  await page.click('#timeChips button:nth-child(2)'); await page.waitForTimeout(100);
  ok(await page.isVisible('#timeSel') && (await page.evaluate(() => document.querySelectorAll('#timeSel option').length)) > 0, 'demo: time picker offers slots from the hours');
  ok(await page.isEnabled('#actBtn'), 'demo: checkout enabled above minimum');
  await page.click('#actBtn'); await page.waitForTimeout(250);
  const hand = await page.evaluate(() => document.querySelector('.screen[data-step="4"]').textContent);
  ok(/This is where Toast takes over/.test(hand.replace(/\s+/g, ' ')) && /Nothing on this site touches cards/.test(hand), 'demo: hand-off copy present');
  ok(await page.evaluate(() => !!document.querySelector('.diagram') && /Website/.test(document.querySelector('.diagram').textContent) && /Kitchen/.test(document.querySelector('.diagram').textContent) && /Driver/.test(document.querySelector('.diagram').textContent)), 'demo: diagram Website -> Toast -> Kitchen / Driver');
  ok(!/\b(?=[A-Z0-9-]*\d)[A-Z0-9-]{6,}\b/.test(hand) && !/confirmation/i.test(hand), 'demo: no confirmation number');
  const steps = await page.evaluate(() => DD.events.filter(e => e.name === 'demo_step_complete').map(e => e.props.step));
  ok([1, 2, 3, 4].every(s => steps.includes(s)), 'demo: step-completion events tracked: ' + steps.join(','));
  const dsw = await page.evaluate(() => document.documentElement.scrollWidth);
  ok(dsw <= v.w, 'demo: no overflow on hand-off screen');
  /* DEMO false hides the pill */
  await page.route('**/config/ordering.js', async r => { const res = await r.fetch(); await r.fulfill({ status: 200, body: (await res.text()).replace('DEMO: true', 'DEMO: false'), headers: { 'content-type': 'text/javascript' } }); });
  await page.goto(base + '/order-demo'); await page.waitForTimeout(200);
  ok(!(await page.isVisible('#demoPill')), 'demo pill hidden when DEMO is false');
  await page.unroute('**/config/ordering.js');
  await ctx.close();
}
ok(errors.length === 0, 'no page errors: ' + errors.join(' / '));
await browser.close(); server.close();
console.log((fails ? 'FAILED: ' : 'OK: ') + passes + ' passed, ' + fails + ' failed');
process.exit(fails ? 1 : 0);
