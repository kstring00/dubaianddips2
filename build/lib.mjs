/* Shared pieces for build/build.mjs: the config, the menu, the homepage's
   own header/footer/CSS reused on every inner page, the <head>, and the
   structured data. Everything here reads the same sources the homepage
   reads (config/ordering.js, hours.js, menu-board.json), so the name,
   address, phone and hours are identical on every page and in the schema. */
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import crypto from 'node:crypto';
import { execSync } from 'node:child_process';

export const ROOT = path.resolve(new URL('..', import.meta.url).pathname);
export const DIST = path.join(ROOT, 'dist');
export const read = f => fs.readFileSync(path.join(ROOT, f), 'utf8');

/* ---- config, hours, departures: run the browser files in a sandbox ---- */
const sandbox = { window: {}, location: { search: '' }, Intl, Date, Math, JSON };
sandbox.globalThis = sandbox;
vm.createContext(sandbox);
for (const f of ['config/ordering.js', 'config/departures.js', 'hours.js']) vm.runInContext(read(f), sandbox, { filename: f });
export const CFG = sandbox.window.DD_CONFIG;
export const DEP = sandbox.window.DD_DEPARTURES;
export const H = sandbox.window.DD_HOURS;
export const MENU = JSON.parse(read('menu-board.json'));
export const SITE = String(CFG.SITE_URL || '').replace(/\/+$/, '');
export const PROD = process.env.VERCEL_ENV === 'production';

export const esc = v => String(v == null ? '' : v).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
export const abs = p => /^https?:/i.test(p) ? p : SITE + (p.startsWith('/') ? p : '/' + p);
export const isHttp = u => /^https?:\/\//i.test(String(u || ''));

/* ---- locations: only complete ones are published; nothing is invented ---- */
export const LOCATIONS = (CFG.LOCATIONS || []).map(l => {
  if (l.primary) {
    const S = CFG.SHOP;
    return { ...l, street: S.street, locality: S.locality, region: S.region, postalCode: S.postalCode, country: S.country || 'US', phone: CFG.PHONE, hours: CFG.HOURS, special: CFG.SPECIAL_HOURS || [] };
  }
  return { ...l, country: l.country || 'US', hours: l.hours || CFG.HOURS, special: l.special || CFG.SPECIAL_HOURS || [] };
});
export const isReady = l => !!(l.slug && l.name && l.street && l.locality && l.postalCode && l.phone && l.phone.tel);
export const READY = LOCATIONS.filter(isReady);
export const MISSING_LOCATIONS = LOCATIONS.filter(l => !isReady(l));
export const oneLine = l => `${l.street}, ${l.locality}, ${l.region} ${l.postalCode}`;
export const mapsSearch = l => 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(l.mapQuery || `Dubai and Dips ${oneLine(l)}`);
export const mapsDirections = l => l.primary && CFG.LINKS && CFG.LINKS.directions ? CFG.LINKS.directions
  : 'https://www.google.com/maps/dir/?api=1&destination=' + encodeURIComponent(l.mapQuery || oneLine(l));
export const orderUrl = mode => {
  const u = mode === 'group' ? (CFG.TOAST_GROUP_URL || CFG.TOAST_ORDER_URL) : (CFG.TOAST_PICKUP_URL || CFG.TOAST_ORDER_URL);
  return String(u || '').trim();
};

/* ---- the homepage, reused ---- */
const HOME = read('index.html');
const between = (s, a, b) => { const i = s.indexOf(a), j = s.indexOf(b, i); if (i < 0 || j < 0) throw new Error('marker missing: ' + a); return s.slice(i + a.length, j); };
const HOME_CSS = between(HOME, '<style>', '</style>');
const CSS_HASH = crypto.createHash('sha1').update(HOME_CSS).digest('hex').slice(0, 10);
export const HOME_CSS_FILE = { path: `/assets/css/home.${CSS_HASH}.css`, body: HOME_CSS };
/* Inner pages inline their CSS the way the homepage does, so nothing
   blocks the first paint: brand tokens + the homepage's own styles +
   pages.css, comments and extra whitespace removed. */
const minCss = c => c.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\s*\n\s*/g, '\n').replace(/\n+/g, '\n').trim();
export const FLIGHTS_CSS = minCss(read('flights.css'));
const INLINE_CSS = [minCss(read('brand.css')), minCss(HOME_CSS), minCss(read('pages.css')), FLIGHTS_CSS].join('\n');
const SPRITE = /<svg class="vh" aria-hidden="true" focusable="false"><defs>[\s\S]*?<\/defs><\/svg>/.exec(HOME)[0];
const HEADER = HOME.slice(HOME.indexOf('<header class="nav'), HOME.indexOf('<!-- /build:header -->'));
if (!HEADER || HOME.indexOf('<!-- /build:footer -->') < 0) throw new Error('index.html is missing the build:header / build:footer markers');
const FOOTER = HOME.slice(HOME.indexOf('<footer class="boxfoot'), HOME.indexOf('<!-- /build:footer -->'));
export const REVIEWS = [...HOME.matchAll(/<blockquote>&ldquo;([\s\S]*?)&rdquo;<\/blockquote>\s*<p class="ticket__who">([^<]+)<\/p>/g)].map(m => ({ text: m[1], who: m[2] }));

/* Inner-page header: always visible (no intro), homepage anchors become
   /#anchor, and the current page is marked. */
function header(current) {
  /* only links (<a>) point back at the homepage; <use href="#dd-..."> stays local */
  let h = HEADER.replace(' nav--intro', '').replace(/(<a\b[^>]*?\shref=")#/g, '$1/#');
  if (current) {
    let done = false;
    h = h.replace(/<a href="([^"]+)">([^<]+)<\/a>/g, (m, href, text) => {
      if (!done && (href === current || (current.startsWith(href + '/') && href !== '/'))) { done = true; return `<a href="${href}" aria-current="page">${text}</a>`; }
      return m;
    });
  }
  return h;
}
const footer = () => FOOTER.replace(/(<a\b[^>]*?\shref=")#/g, '$1/#');

/* ---- structured data ---- */
const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const hhmm = h => { if (h >= 24) return '23:59'; const t = Math.round(h * 60); return String(Math.floor(t / 60) % 24).padStart(2, '0') + ':' + String(t % 60).padStart(2, '0'); };
function openingSpec(hours) {
  const groups = new Map();
  hours.forEach((h, d) => { if (!h) return; const k = h[0] + '-' + h[1]; if (!groups.has(k)) groups.set(k, { h, days: [] }); groups.get(k).days.push(DAYS[d]); });
  return [...groups.values()].map(g => ({ '@type': 'OpeningHoursSpecification', dayOfWeek: g.days, opens: hhmm(g.h[0]), closes: hhmm(g.h[1]) }));
}
function specialSpec(special) {
  return (special || []).filter(s => s && s.date).map(s => s.closed
    ? { '@type': 'OpeningHoursSpecification', validFrom: s.date, validThrough: s.date, opens: '00:00', closes: '00:00' }
    : { '@type': 'OpeningHoursSpecification', validFrom: s.date, validThrough: s.date, opens: hhmm(s.open), closes: hhmm(s.close) });
}
export const ORG_ID = SITE + '/#organization';
export const restaurantId = l => SITE + '/visit/' + l.slug + '#restaurant';
export function restaurant(l) {
  const L = CFG.LINKS || {};
  const o = {
    '@type': 'Restaurant',
    '@id': restaurantId(l),
    name: l.name,
    url: SITE + '/visit/' + l.slug,
    image: l.photo ? [abs(l.photo)] : [abs('/assets/dd-og.png')],
    logo: abs('/assets/dd-icon-512.png'),
    telephone: l.phone.tel,
    address: { '@type': 'PostalAddress', streetAddress: l.street, addressLocality: l.locality, addressRegion: l.region, postalCode: l.postalCode, addressCountry: l.country },
    openingHoursSpecification: openingSpec(l.hours),
    servesCuisine: (CFG.SHOP && CFG.SHOP.servesCuisine) || undefined,
    hasMenu: SITE + '/menu',
    menu: SITE + '/menu',
    hasMap: mapsSearch(l),
    acceptsReservations: false,
    parentOrganization: { '@id': ORG_ID },
    sameAs: [L.instagram, L.tiktok, l.googleProfile].filter(isHttp)
  };
  const sp = specialSpec(l.special); if (sp.length) o.specialOpeningHoursSpecification = sp;
  if (CFG.SHOP && CFG.SHOP.priceRange) o.priceRange = CFG.SHOP.priceRange;
  if (l.geo && l.geo.lat != null) o.geo = { '@type': 'GeoCoordinates', latitude: l.geo.lat, longitude: l.geo.lng };
  const order = orderUrl('pickup');
  if (isHttp(order)) o.potentialAction = { '@type': 'OrderAction', target: { '@type': 'EntryPoint', urlTemplate: order, actionPlatform: ['http://schema.org/DesktopWebPlatform', 'http://schema.org/MobileWebPlatform'] }, deliveryMethod: ['http://purl.org/goodrelations/v1#DeliveryModePickUp'] };
  return o;
}
export function organization() {
  const L = CFG.LINKS || {};
  return { '@type': 'Organization', '@id': ORG_ID, name: CFG.SHOP.name, url: SITE + '/', logo: abs('/assets/dd-icon-512.png'), sameAs: [L.instagram, L.tiktok].filter(isHttp) };
}
export function website() { return { '@type': 'WebSite', '@id': SITE + '/#website', name: CFG.SHOP.name, url: SITE + '/', publisher: { '@id': ORG_ID } }; }
export function breadcrumbs(trail) {
  return { '@type': 'BreadcrumbList', itemListElement: trail.map((t, i) => ({ '@type': 'ListItem', position: i + 1, name: t.name, item: abs(t.url) })) };
}
export function faqPage(faqs) {
  return { '@type': 'FAQPage', mainEntity: faqs.map(f => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.aText || f.a } })) };
}
export const graph = nodes => JSON.stringify({ '@context': 'https://schema.org', '@graph': nodes.filter(Boolean) }, (k, v) => v === undefined ? undefined : v).replace(/</g, '\\u003c');
export const jsonldTag = nodes => `<script type="application/ld+json">${graph(nodes)}</script>`;

/* ---- the <head> and the page shell ---- */
export function page(o) {
  const url = abs(o.path === '/' ? '/' : o.path);
  const img = abs(o.image || '/assets/dd-og.png');
  const imgAlt = o.imageAlt || 'The Dubai & Dips logo in off-white on Courtyard green, over the brand\'s four-pointed star pattern.';
  const robots = o.noindex ? 'noindex, nofollow' : 'index, follow, max-image-preview:large';
  return `<!doctype html>
<html lang="en" class="no-js">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<script>document.documentElement.className='js'</script>
<title>${esc(o.title)}</title>
<meta name="description" content="${esc(o.description)}">
<link rel="canonical" href="${url}">
<meta name="robots" content="${robots}">
<meta name="theme-color" content="#E3DED0">
<link rel="icon" href="/assets/dd-favicon.svg" type="image/svg+xml">
<link rel="icon" href="/assets/dd-favicon-32.png" sizes="32x32" type="image/png">
<link rel="apple-touch-icon" sizes="180x180" href="/assets/dd-apple-touch-icon.png">
<link rel="manifest" href="/manifest.webmanifest">
<meta property="og:type" content="${o.ogType || 'website'}">
<meta property="og:site_name" content="Dubai &amp; Dips">
<meta property="og:locale" content="en_US">
<meta property="og:title" content="${esc(o.ogTitle || o.title)}">
<meta property="og:description" content="${esc(o.description)}">
<meta property="og:url" content="${url}">
<meta property="og:image" content="${img}">
${o.image ? '' : '<meta property="og:image:width" content="1200">\n<meta property="og:image:height" content="630">\n'}<meta property="og:image:alt" content="${esc(imgAlt)}">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${esc(o.ogTitle || o.title)}">
<meta name="twitter:description" content="${esc(o.description)}">
<meta name="twitter:image" content="${img}">
<meta name="twitter:image:alt" content="${esc(imgAlt)}">
${o.preloadImage ? `<link rel="preload" as="image" href="${o.preloadImage}" fetchpriority="high">\n` : ''}${(o.preloads || []).map(p => `<link rel="preload" as="image" href="${p.href}"${p.media ? ` media="${p.media}"` : ''} fetchpriority="high">\n`).join('')}<link rel="preload" as="font" type="font/woff2" href="/public/fonts/albert-sans.woff2" crossorigin>
<link rel="preload" as="font" type="font/woff2" href="/public/fonts/encode-sans.woff2" crossorigin>
<link rel="preload" as="font" type="font/woff2" href="/public/fonts/playfair-display-italic.woff2" crossorigin>
<style>${INLINE_CSS}</style>
${jsonldTag(o.jsonld || [])}
</head>
<body class="inner${o.bodyClass ? ' ' + o.bodyClass : ''}">
${SPRITE}
<a class="skip" href="#main">Skip to content</a>
${header(o.current)}
${o.draft ? '<p class="draftbar" role="note">Draft preview. This page is not published and is hidden from search engines.</p>\n' : ''}<main id="main" class="page">
${o.body}
</main>
${footer()}
<script src="/config/ordering.js" defer></script>
<script src="/hours.js" defer></script>
<script src="/track.js" defer></script>
<script src="/config/feed.js" defer></script>
<script src="/site.js" defer></script>
<script src="/pages.js" defer></script>
<script src="/config/flights.js" defer></script>
<script src="/flights.js" defer></script>
</body>
</html>
`;
}

/* ---- Connecting Flights: the route map section, one source for the
   homepage and every inner page. The map itself is drawn by flights.js from
   config/flights.js; this is the markup around it, the film for the opening
   and the destinations as real links. ---- */
const FLIGHTS = (() => { const sb = { window: {} }; vm.createContext(sb); vm.runInContext(read('config/flights.js'), sb); return sb.window.DD_FLIGHTS; })();
export function flightsSection({ heading = 'Where to *next?*', lead = 'Explore the rest of Dubai &amp; Dips: the menu, gelato, catering, our journal, the crew and the feed. Pick a destination below.' } = {}) {
  const gates = FLIGHTS.gates;
  return `<section class="fl" id="flights" aria-labelledby="fl-title">
  <div class="shell">
    <div class="fl__head">
      <div><p class="eyebrow rv">${star()}<span>Explore the site</span></p><h2 class="fl__title rv" id="fl-title">${accent(heading)}</h2></div>
      <p class="fl__lead rv">${lead}</p>
    </div>
    <div class="fl__stage" aria-hidden="true">
      <canvas class="fl__canvas"></canvas>
      <video class="fl__video" muted playsinline preload="none" data-poster="/assets/flight-poster.webp" tabindex="-1"><source data-src="/assets/flight.webm" type="video/webm"><source data-src="/assets/flight.mp4" type="video/mp4"></video>
      <video class="fl__video fl__video--v" muted playsinline preload="none" data-poster="/assets/flight-poster-9x16.webp" tabindex="-1"><source data-src="/assets/flight-9x16.webm" type="video/webm"><source data-src="/assets/flight-9x16.mp4" type="video/mp4"></video>
      <ul class="fl__gates">
        <li><span class="fl__origin"></span></li>${gates.map((g, i) => `
        <li><a class="fl__gate" href="${g.href}" data-gate="${i}" tabindex="-1"><span></span><b>${esc(g.code)}</b></a></li>`).join('')}
      </ul>
      <div class="fl__label" hidden><span class="fl__lcode"></span><span class="fl__lcity"></span><span class="fl__lpage"></span><span class="fl__lflight"></span></div>
      <p class="fl__legend"><i class="mint"></i><span class="fl__now">Boarding</span></p>
    </div>
    <p class="fl__pick">Choose a page <span aria-hidden="true">&darr;</span></p>
    <ul class="fl__cards" aria-label="Explore the site">${gates.map((g, i) => `
      <li><a class="fl__card rv" href="${g.href}" data-gate="${i}" style="--i:${i}"><span class="fl__cmeta" aria-hidden="true"><b>${esc(g.code)}</b> ${esc(g.city)}</span><span class="fl__cpage">${esc(g.page)}</span><span class="fl__cgo" aria-hidden="true">&rarr;</span></a></li>`).join('')}
    </ul>
  </div>
</section>`;
}

/* The small print under a page title, as a boarding-pass strip. */
export const ticketStrip = fields => `<dl class="pstrip">${fields.map(([k, v]) => `<div><dt>${esc(k)}</dt><dd>${v}</dd></div>`).join('')}</dl>`;
export const crumbs = trail => `<nav class="crumbs" aria-label="Breadcrumb"><ol>${trail.map((t, i) => i === trail.length - 1
  ? `<li><span aria-current="page">${esc(t.name)}</span></li>` : `<li><a href="${t.url}">${esc(t.name)}</a></li>`).join('')}</ol></nav>`;
export const star = (cls = '') => `<svg class="logo logo--star ${cls}" aria-hidden="true" focusable="false"><use href="#dd-star"/></svg>`;

/* A heading with its accent word(s) in the italic face: "Visit *Clear Lake*". */
export const accent = s => esc(s).replace(/\*([^*]+)\*/g, '<em>$1</em>');
export const plain = s => String(s).replace(/\*/g, '');

/* Last change to a set of files, from git when it is there, else today. */
export function lastmod(files) {
  try {
    const out = execSync('git log -1 --format=%cs -- ' + files.map(f => JSON.stringify(f)).join(' '), { cwd: ROOT, stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim();
    if (/^\d{4}-\d\d-\d\d$/.test(out)) return out;
  } catch (e) { /* no git in this environment */ }
  return new Date().toISOString().slice(0, 10);
}

export function write(rel, body) {
  const f = path.join(DIST, rel);
  fs.mkdirSync(path.dirname(f), { recursive: true });
  fs.writeFileSync(f, body);
}
