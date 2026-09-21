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
const read = f => fs.readFileSync(path.join(root, f), 'utf8');
const PAGES = ['index.html', 'order-demo.html', '404.html'];
const SERVED = ['index.html', 'order-demo.html', '404.html', 'site.js', 'demo.js', 'track.js', 'sw.js', 'manifest.webmanifest'];

console.log('static checks');
/* lorem, hardcoded money outside config */
for (const f of SERVED) ok(!/lorem/i.test(read(f)), f + ' contains "lorem"');
const cfg = read('config/ordering.js');
const nums = [/4\.99/, /2\.99/, /\$\s?15\b/, /\$\s?25\b/, /\$\s?40\b/, /\$\s?50\b/, /\b5 miles\b/, /\b15 minimum\b/, /8\.25/];
for (const f of SERVED) for (const re of nums) ok(!re.test(read(f)), f + ' has hardcoded ' + re);
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
  ok(/property="og:image"/.test(s), f + ' has an OG image');
  ok(/href="tel:\+?\d+"/.test(s), f + ' has a tel: link');
  const imgs = s.match(/<img\b[^>]*>/g) || [];
  ok(imgs.every(t => /\balt="/.test(t)), f + ' every <img> has alt (' + imgs.length + ' images)');
  ok(/rel="manifest"/.test(s), f + ' links the manifest');
}
ok(fs.existsSync(path.join(root, '404.html')), '404.html exists');
const man = JSON.parse(read('manifest.webmanifest'));
ok(man.display === 'standalone' && man.start_url && man.icons.length >= 3, 'manifest is standalone with icons');
for (const i of man.icons) {
  const f = path.join(root, i.src); ok(fs.existsSync(f), 'icon exists ' + i.src);
  if (fs.existsSync(f)) { const b = fs.readFileSync(f); const w = b.readUInt32BE(16), h = b.readUInt32BE(20); ok(i.sizes === w + 'x' + h, i.src + ' is ' + w + 'x' + h); }
}
const sw = read('sw.js');
ok(/url\.origin !== self\.location\.origin\) return/.test(sw) && /mp4/.test(sw), 'service worker skips cross-origin (Toast) and videos');
ok(/order-demo/.test(read('vercel.json')), 'vercel.json rewrites /order-demo');
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
const ROUTES = ['/', '/menu/frappes', '/404.html', '/definitely-missing'];
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
    if (r.includes('404') || r.includes('missing')) {
      const href = await page.getAttribute('#orderLink', 'href');
      ok(href === '/#order', '404 order link falls back to /#order with empty URL (' + href + ')');
      ok((await page.evaluate(() => !!document.querySelector('a[href^="tel:"]'))), '404 page reachable phone');
      continue;
    }
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
      else if (place === 'item' || place === 'category') { await el.evaluate(e => e.closest('.brow').querySelector('.brow__btn').click()); await page.waitForTimeout(300); }
      if (place !== 'hero' && place !== 'hero-landing') { await el.evaluate(e => e.scrollIntoView({ block: 'center' })); await page.waitForTimeout(150); }
      if (!(await el.isVisible())) { console.log('  skip ' + place + ' (not shown at ' + v.name + ')'); continue; }
      const click = () => el.click({ timeout: 5000 }).catch(e => { ok(false, r + ' click ' + place + ' failed: ' + String(e).split('\n')[0]); });
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
  await page.goto(base + '/nope'); ok((await page.getAttribute('#orderLink', 'href')) === DUMMY, '404 order link uses the Toast URL when set');
  await page.unroute('**/config/ordering.js');

  /* --- layout: overflow, tap targets, sticky bar, hero CTA first paint --- */
  for (const r of ['/', '/order-demo', '/404.html']) {
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
  /* header order visible at load and after scrolling */
  const hdr = await page.evaluate(() => { const o = document.querySelector('.nav__order'); const r = o.getBoundingClientRect(); return { op: getComputedStyle(o).opacity, top: r.top, h: r.height }; });
  ok(hdr.op === '1' && hdr.top >= 0 && hdr.h >= 40, 'header Order button visible at load ' + JSON.stringify(hdr));
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight / 2)); await page.waitForTimeout(400);
  ok(await page.evaluate(() => getComputedStyle(document.querySelector('.nav__order')).opacity === '1' && document.querySelector('.nav__order').getBoundingClientRect().top >= 0), 'header Order button still visible mid-page');

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
