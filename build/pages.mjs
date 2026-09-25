/* The inner pages. Every fact on them is read from config/ordering.js,
   hours.js and menu-board.json at build time - the same sources the
   homepage reads - so nothing here can drift from the rest of the site. */
import vm from 'node:vm';
import {
  CFG, MENU, H, SITE, READY, REVIEWS, esc, abs, page, ticketStrip, crumbs, star, accent, plain, flightsSection, read as readRoot,
  restaurant, breadcrumbs, faqPage, organization, website, oneLine, mapsSearch, mapsDirections, orderUrl, restaurantId, isHttp
} from './lib.mjs';

const PH = CFG.PHONE;
const TBD = MENU.tbdShowsAs || { code: 'HOU', destination: 'Houston' };
export const ROWS = MENU.rows.map(r => r.code === 'TBD' ? { ...r, code: TBD.code, destination: TBD.destination } : r);
const clock = H.create({ hours: CFG.HOURS, special: CFG.SPECIAL_HOURS });
const GROUPS = clock.groups();
const earliest = Math.min(...CFG.HOURS.filter(Boolean).map(h => h[0]));
const latest = Math.max(...CFG.HOURS.filter(Boolean).map(h => h[1]));
const telLink = (p, cls = '', place = '') => `<a class="${cls}" href="tel:${p.tel}"${place ? ` data-call="${place}"` : ''}>${esc(p.display)}</a>`;
const orderBtn = (label, place, cls = 'btn btn--primary', extra = '') => `<a class="${cls}" href="/#order" data-order="pickup" data-place="${place}"${extra}>${esc(label)}</a>`;
const img = (src, alt, w, h, { lazy = true, cls = '', sizes = '' } = {}) =>
  `<img${cls ? ` class="${cls}"` : ''} src="${src}" alt="${esc(alt)}" width="${w}" height="${h}"${lazy ? ' loading="lazy"' : ' fetchpriority="high"'} decoding="async"${sizes ? ` sizes="${sizes}"` : ''}>`;
const IMG = {
  '/assets/menu-dubai-frappe.webp': [1400, 700], '/assets/menu-kunafa.webp': [1000, 563],
  '/assets/rev-dubai-frappe.webp': [260, 260], '/assets/rev-pistachio-frappe.webp': [260, 260], '/assets/rev-biscoff-frappe.webp': [260, 260],
  '/assets/rev-strawberry-matcha.webp': [260, 260], '/assets/rev-kunafa.webp': [260, 260],
  '/assets/visit-clear-lake.webp': [1360, 765], '/assets/blog-lineup.webp': [1360, 765], '/assets/blog-gelato.webp': [765, 478], '/assets/visit-clear-lake-800.webp': [800, 450],
  '/assets/hero-poster.webp': [1280, 704], '/assets/craft-poster.webp': [1280, 714],
  '/assets/social/social-01-720.webp': [430, 765], '/assets/social/social-02-720.webp': [430, 765], '/assets/social/social-03-720.webp': [430, 765],
  '/assets/social/social-04-720.webp': [430, 765], '/assets/social/social-05-720.webp': [574, 1020], '/assets/social/social-06-720.webp': [430, 765]
};
export const imgSize = src => IMG[src] || [1200, 800];
const hoursRows = today => GROUPS.map(g => {
  const on = today != null && (g.from <= g.to ? today >= g.from && today <= g.to : today >= g.from || today <= g.to);
  return `<tr${on ? ' class="is-today"' : ''} data-from="${g.from}" data-to="${g.to}"><th scope="row">${g.days}</th><td>${g.text}</td></tr>`;
}).join('');
const itemsOf = slug => (ROWS.find(r => r.slug === slug) || { items: [] }).items;

/* The page title band: breadcrumb, eyebrow, H1 with its accent word, the
   lead, and a boarding-pass strip of small print. */
function hero({ trail, eyebrow, h1, lead, strip, actions = '', media = '', cls = '' }) {
  return `<header class="phero ${cls}">
  <div class="shell phero__grid">
    <div class="phero__copy">
      ${trail ? crumbs(trail) : ''}
      <p class="eyebrow rv">${star()}<span>${eyebrow}</span></p>
      <h1 class="phero__title" data-lines>${accent(h1)}</h1>
      <p class="phero__lead rv">${lead}</p>
      ${actions ? `<div class="phero__actions rv">${actions}</div>` : ''}
      ${strip ? `<div class="rv">${strip}</div>` : ''}
    </div>
    ${media}
  </div>
</header>`;
}

/* Connecting flights: every page ends by pointing at two or three others. */
function connections(list) {
  return `<section class="connect" aria-labelledby="connect-title">
  <div class="shell">
    <h2 class="connect__title rv" id="connect-title">Connecting <em>flights</em></h2>
    <ul class="connect__list">${list.map(([href, code, title, text]) => `
      <li class="rv"><a class="connect__card" href="${href}"><span class="connect__code" aria-hidden="true">${code}</span><span class="connect__t">${title}</span><span class="connect__d">${text}</span><span class="connect__go" aria-hidden="true">&rarr;</span></a></li>`).join('')}
    </ul>
  </div>
</section>`;
}

/* A boarding pass: the route, flight, gate and origin of a category. */
function pass(r, i, { photo = true } = {}) {
  const [w, h] = r.photo ? imgSize(r.photo) : [0, 0];
  return `<div class="bpass">
  <div class="bpass__top"><span>D&amp;D Airlines</span><span>Boarding pass</span></div>
  <p class="bpass__route">${r.code === 'HOU' ? '<b>HOU</b><i>Local flight</i>' : `<b>${esc(r.code)}</b><i aria-hidden="true">&rarr;</i><b>HOU</b>`}</p>
  <dl class="bpass__meta"><div><dt>Flight</dt><dd>${esc(r.flight)}</dd></div><div><dt>Gate</dt><dd>${esc(r.gate)}</dd></div><div><dt>From</dt><dd>${esc(r.destination)}</dd></div></dl>
  ${photo && r.photo ? `<figure class="bpass__photo">${img(r.photo, r.photoAlt || '', w, h, { sizes: '(min-width: 900px) 360px, 90vw' })}</figure>` : `<div class="bpass__plate" aria-hidden="true">${star()}<b>${esc(r.code)}</b></div>`}
  <span class="bpass__code" aria-hidden="true"></span>
</div>`;
}

/* ================================================================ /menu */
export function menuPage() {
  const trail = [{ name: 'Home', url: '/' }, { name: 'Menu', url: '/menu' }];
  const tabs = ROWS.map(r => `<li><a href="#${r.slug}" data-tab><b>${esc(r.code)}</b><span>${esc(plain(r.category).replace(/^The /, ''))}</span></a></li>`).join('');
  const routes = ROWS.map((r, i) => {
    const items = r.items || [];
    const list = items.length ? `<ul class="mlist">${items.map(it => {
      const price = typeof it.price === 'number' && it.price > 0 ? '$' + it.price.toFixed(2).replace(/\.00$/, '') : '';
      const [w, h] = it.photo ? imgSize(it.photo) : [0, 0];
      return `<li class="mitem${it.photo ? ' has-photo' : ''}">${it.photo ? img(it.photo, it.alt || it.name, w, h, { cls: 'mitem__img' }) : ''}<span class="mitem__name">${esc(it.name)}</span>${price ? `<span class="mitem__lead" aria-hidden="true"></span><span class="mitem__price">${price}</span>` : ''}</li>`;
    }).join('')}</ul>` : `<p class="route__soon">The full list for this route is on the boards in the shop. <a href="/visit/clear-lake">Come and see it</a>.</p>`;
    const status = r.status === 'sold-out' ? '<span class="route__tag">Sold out today</span>' : r.status === 'seasonal' ? '<span class="route__tag">Seasonal</span>' : '';
    return `<section class="route" id="${esc(r.slug)}" aria-labelledby="route-${esc(r.slug)}">
  <div class="shell route__grid">
    <div class="route__pass rv">${pass(r, i)}</div>
    <div class="route__body">
      <p class="route__kicker rv">Route ${String(i + 1).padStart(2, '0')} &middot; ${esc(r.destination)} ${status}</p>
      <h2 class="route__title rv" id="route-${esc(r.slug)}">${esc(r.category)}</h2>
      ${r.description ? `<p class="route__desc rv">${esc(r.description)}</p>` : ''}
      <div class="rv">${list}</div>
      ${r.status === 'sold-out' ? '' : `<p class="route__order rv"><a class="route__go" href="/#order" data-order="pickup" data-place="menu-route" data-category="${esc(r.category)}">Order ${esc(r.category)} <i aria-hidden="true">&rarr;</i></a></p>`}
    </div>
  </div>
</section>`;
  }).join('\n');
  const body = hero({
    trail, eyebrow: 'Departures &middot; ' + ROWS.length + ' routes', h1: 'The whole menu, *every route.*',
    lead: `Every dessert is a flight. Ten routes leave our dessert shop in Clear Lake, Houston: Dubai chocolate frappes, espresso drinks, matcha, lattes, smoothies, crepes, waffles and kunafa. Pick a route, then order ahead for pickup.`,
    actions: orderBtn(CFG.COPY.pickupCta || 'Order ahead for pickup', 'menu-hero') + `<a class="btn btn--line" href="/catering">Catering for groups</a>`,
    strip: ticketStrip([['Routes', String(ROWS.length)], ['Departing', 'Daily from ' + H.clockText(earliest * 60)], ['Last call', H.clockText(latest * 60) + ' Fri &amp; Sat'], ['From', 'HOU &middot; Clear Lake']])
  }) + `
<nav class="mtabs" aria-label="Menu routes">
  <div class="mtabs__in">
    <ul class="mtabs__list">${tabs}</ul>
    <span class="mtabs__ink" aria-hidden="true"></span>
  </div>
  ${orderBtn('Order ahead', 'menu-tabs', 'btn btn--primary mtabs__order')}
</nav>
<div class="routes">
${routes}
</div>
<section class="menunote">
  <div class="shell menunote__in rv">
    <p>Prices are on the boards above the counter. Ask at the counter about what goes into anything on the menu.</p>
  </div>
</section>
${flightsSection()}`;
  const menuLd = {
    '@type': 'Menu', '@id': SITE + '/menu#menu', name: 'Dubai & Dips menu', url: SITE + '/menu', inLanguage: 'en-US',
    hasMenuSection: ROWS.map(r => ({
      '@type': 'MenuSection', name: plain(r.category), url: SITE + '/menu#' + r.slug, description: r.description || undefined,
      image: r.photo ? abs(r.photo) : undefined,
      hasMenuItem: (r.items || []).map(it => ({ '@type': 'MenuItem', name: it.name, image: it.photo ? abs(it.photo) : undefined,
        offers: typeof it.price === 'number' && it.price > 0 ? { '@type': 'Offer', price: it.price.toFixed(2), priceCurrency: 'USD' } : undefined }))
    }))
  };
  return page({
    path: '/menu', current: '/menu', bodyClass: 'p-menu',
    title: 'Menu: Dubai Chocolate & Kunafa in Houston | Dubai & Dips',
    description: 'The full Dubai & Dips menu: Dubai chocolate and pistachio frappes, matcha, lattes, espresso, crepes, waffles and kunafa in Clear Lake, Houston.',
    image: '/assets/menu-dubai-frappe.webp', imageAlt: ROWS[0].photoAlt,
    jsonld: [menuLd, ...READY.map(l => ({ '@id': restaurantId(l), '@type': 'Restaurant', name: l.name, hasMenu: { '@id': SITE + '/menu#menu' } })), breadcrumbs(trail)],
    body
  });
}

/* ============================================================ /catering */
export function cateringFaqs() {
  const C = CFG.CATERING || {}, L = READY[0];
  const notice = C.noticeHours ? `We need at least ${C.noticeHours} hours for a large order.` : 'Send your request as early as you can, with the date and headcount, and we will confirm what we can do for that day.';
  return [
    { q: 'Do you cater offices, parties and events in Houston?',
      a: `Yes. Send the date, time and headcount with the form on this page, or call <a href="tel:${PH.tel}">${esc(PH.display)}</a>. Group orders come from the same menu as the shop: frappes, espresso drinks, matcha, lattes, smoothies, crepes, waffles and desserts, kunafa included.`,
      aText: `Yes. Send the date, time and headcount with the catering request form, or call ${PH.display}. Group orders come from the same menu as the shop: frappes, espresso drinks, matcha, lattes, smoothies, crepes, waffles and desserts, kunafa included.` },
    { q: 'How much notice do you need for a large order?', a: notice, aText: notice },
    { q: 'Can everyone in the office pick their own drink?',
      a: `Yes. ${esc(CFG.COPY.groupText)} Group orders start at $${CFG.GROUP_ORDER_MINIMUM}.`,
      aText: `Yes. ${CFG.COPY.groupText} Group orders start at $${CFG.GROUP_ORDER_MINIMUM}.` },
    { q: 'Do you deliver catering orders?',
      a: `Delivery covers up to ${CFG.DELIVERY_RADIUS_MILES} miles from the shop, with a $${CFG.DELIVERY_MINIMUM} minimum. Further out, pick up from <a href="/visit/${L.slug}">${esc(L.name)}</a> at ${esc(oneLine(L))}.`,
      aText: `Delivery covers up to ${CFG.DELIVERY_RADIUS_MILES} miles from the shop, with a $${CFG.DELIVERY_MINIMUM} minimum. Further out, pick up from ${L.name} at ${oneLine(L)}.` },
    { q: 'When can I pick up?',
      a: `Any time we are open: ${GROUPS.map(g => `${g.days} ${g.text}`).join('; ')}.`,
      aText: `Any time we are open: ${GROUPS.map(g => `${g.days} ${g.text}`).join('; ')}.` }
  ];
}
const faqBlock = (faqs, id = 'faq') => `<section class="faq" aria-labelledby="${id}-title">
  <div class="shell faq__grid">
    <div class="faq__head rv"><p class="eyebrow">${star()}<span>Before you board</span></p><h2 id="${id}-title">Questions, <em>answered.</em></h2></div>
    <div class="faq__list">${faqs.map((f, i) => `
      <details class="faq__item rv"${i === 0 ? ' open' : ''}><summary><span>${esc(f.q)}</span><i aria-hidden="true"></i></summary><div class="faq__a"><p>${f.a}</p></div></details>`).join('')}
    </div>
  </div>
</section>`;

export function cateringPage() {
  const trail = [{ name: 'Home', url: '/' }, { name: 'Catering', url: '/catering' }];
  const faqs = cateringFaqs().slice(0, 4);
  const C = CFG.CATERING || {};
  const live = !!(String(C.web3formsKey || '').trim() || String(C.formEndpoint || '').trim());
  const chips = ROWS.map(r => `<label class="chip"><input type="checkbox" name="interests" value="${esc(r.category)}"><span><b>${esc(r.code)}</b>${esc(plain(r.category).replace(/^The /, ''))}</span></label>`).join('');
  /* the kataifi strand that draws itself around each number, once */
  const ring = `<svg class="itin__ring" viewBox="0 0 48 48" aria-hidden="true"><circle class="itin__ring-a" cx="24" cy="24" r="21" pathLength="100"/><circle class="itin__ring-b" cx="24.7" cy="23.4" r="22.4" pathLength="100"/></svg>`;
  const form = live ? `<form class="bform rv" id="cateringForm" novalidate data-endpoint="${esc(String(C.formEndpoint || '').trim())}" data-key="${esc(String(C.web3formsKey || '').trim())}" aria-describedby="bformNote">
      <div class="bform__head" aria-hidden="true"><span>D&amp;D Airlines</span><span>Group booking</span></div>
      <p class="bform__note" id="bformNote">Fields marked with a star are required.${C.email ? ` Requests go to ${esc(C.email)}.` : ''}</p>
      <div class="bform__errors" id="bformErrors" tabindex="-1" hidden></div>
      <!-- honeypot: people never see it, robots fill it -->
      <div class="bform__hp" aria-hidden="true"><label for="cWebsite">Leave this empty</label><input id="cWebsite" name="botcheck" type="text" tabindex="-1" autocomplete="off"></div>
      <fieldset><legend>Flight details</legend>
        <div class="bform__row bform__row--3">
          <div class="fl"><input id="cDate" name="date" type="date" required placeholder=" " autocomplete="off"><label for="cDate">Date <span aria-hidden="true">&#10022;</span></label><p class="fl__err" id="cDate-err"></p></div>
          <div class="fl"><input id="cTime" name="time" type="time" required placeholder=" "><label for="cTime">Time <span aria-hidden="true">&#10022;</span></label><p class="fl__err" id="cTime-err"></p></div>
          <div class="fl"><input id="cCount" name="headcount" type="number" inputmode="numeric" min="1" max="2000" step="1" required placeholder=" "><label for="cCount">Headcount <span aria-hidden="true">&#10022;</span></label><p class="fl__err" id="cCount-err"></p></div>
        </div>
      </fieldset>
      <fieldset><legend>What&rsquo;s on board</legend><div class="chips">${chips}</div></fieldset>
      <fieldset><legend>Lead passenger</legend>
        <div class="bform__row"><div class="fl"><input id="cName" name="name" type="text" required autocomplete="name" placeholder=" "><label for="cName">Name <span aria-hidden="true">&#10022;</span></label><p class="fl__err" id="cName-err"></p></div></div>
        <div class="bform__row bform__row--2">
          <div class="fl"><input id="cPhone" name="phone" type="tel" inputmode="tel" required autocomplete="tel" placeholder=" "><label for="cPhone">Phone <span aria-hidden="true">&#10022;</span></label><p class="fl__err" id="cPhone-err"></p></div>
          <div class="fl"><input id="cEmail" name="email" type="email" inputmode="email" required autocomplete="email" placeholder=" "><label for="cEmail">Email <span aria-hidden="true">&#10022;</span></label><p class="fl__err" id="cEmail-err"></p></div>
        </div>
      </fieldset>
      <fieldset><legend>Anything else</legend><div class="fl fl--area"><textarea id="cNotes" name="notes" rows="4" placeholder=" "></textarea><label for="cNotes">Notes: allergies, a delivery address, a budget</label></div></fieldset>
      <div class="bform__foot"><button class="btn btn--primary bform__send" type="submit"><span>Send request</span></button><p class="bform__status" id="bformStatus" role="status" aria-live="polite"></p></div>
    </form>`
  : `<div class="bform bform--call rv" id="request-call">
      <div class="bform__head" aria-hidden="true"><span>D&amp;D Airlines</span><span>Group booking</span></div>
      <p class="eyebrow">${star()}<span>Call us to order</span></p>
      <h3>Online requests are not switched on yet.</h3>
      <p>Call and we will take your date, headcount and order by phone. It takes a couple of minutes.</p>
      <p class="bform__callrow"><a class="btn btn--primary" href="tel:${PH.tel}" data-call="catering-form">Call ${esc(PH.display)}</a></p>
    </div>`;
  const body = `<header class="phero phero--cater">
  <div class="shell">
    ${crumbs(trail)}
    <p class="eyebrow rv">${star()}<span>Group bookings &middot; Offices, parties, events</span></p>
    <h1 class="phero__title" data-lines>Catering that <em>arrives together.</em></h1>
    <p class="phero__lead rv">Frappes, espresso, matcha and desserts for the whole room, planned with you.</p>
    <div class="phero__actions phero__actions--cater rv">
      <a class="btn btn--primary btn--hero" href="#request" data-scroll>Start a catering order</a>
      <a class="phero__tel" href="tel:${PH.tel}" data-call="catering-hero">or call ${esc(PH.display)}</a>
    </div>
  </div>
</header>

<section class="itin" aria-labelledby="itin-title">
  <div class="shell itin__grid">
    <div class="sechead rv"><p class="eyebrow">${star()}<span>How big orders fly</span></p><h2 id="itin-title">Three legs, <em>no layovers.</em></h2></div>
    <ol class="itin__list">
      <li class="rv"><span class="itin__n">${ring}<b>01</b></span><h3>Book the flight</h3><p>Send the date, time, headcount and what you would like with the form below, or call ${telLink(PH, 'u')}. ${C.noticeHours ? `We need at least ${C.noticeHours} hours for a large order.` : 'The earlier you ask, the more we can do.'}</p></li>
      <li class="rv"><span class="itin__n">${ring}<b>02</b></span><h3>Everyone picks</h3><p>${esc(CFG.COPY.groupText)} Group orders start at $${CFG.GROUP_ORDER_MINIMUM}.</p></li>
      <li class="rv"><span class="itin__n">${ring}<b>03</b></span><h3>Pickup or delivery</h3><p>Pick up at <a href="/visit/${READY[0].slug}">${esc(READY[0].name)}</a>, or have it delivered up to ${CFG.DELIVERY_RADIUS_MILES} miles from the shop ($${CFG.DELIVERY_MINIMUM} minimum).</p></li>
    </ol>
  </div>
</section>
${faqBlock(faqs)}
<section class="book" id="request" aria-labelledby="book-title">
  <div class="shell book__grid">
    <div class="book__intro rv">
      <p class="eyebrow">${star()}<span>Group booking</span></p>
      <h2 id="book-title">Request <em>catering.</em></h2>
      <p>Fill in what you know; we will come back to you to confirm the details. Prefer to talk it through? Call ${telLink(PH, 'u', 'catering-form')}.</p>
      ${ticketStrip([['Operated by', 'D&amp;D Airlines'], ['From', 'HOU &middot; Clear Lake']])}
    </div>
    ${form}
  </div>
</section>
${flightsSection()}`;
  return page({
    path: '/catering', current: '/catering', bodyClass: 'p-catering',
    title: 'Dessert Catering in Clear Lake, Houston | Dubai & Dips',
    description: 'Dubai & Dips catering in Clear Lake, Houston: frappes, coffee, matcha and desserts for offices, parties and events. Group orders, pickup or delivery.',
    jsonld: [breadcrumbs(trail), faqPage(faqs)], body
  });
}

/* =============================================================== /visit */
function statusPill(l) {
  return `<p class="live" data-live data-hours='${JSON.stringify(l.hours)}' data-special='${JSON.stringify(l.special || [])}'><i class="live__dot" aria-hidden="true"></i><span class="live__text">Hours below</span></p>`;
}
export function visitIndex() {
  const trail = [{ name: 'Home', url: '/' }, { name: 'Visit', url: '/visit' }];
  const cards = READY.map((l, i) => {
    const [w, h] = imgSize(l.photo.replace('.webp', '-800.webp'));
    return `<li class="loc rv"><a class="loc__card" href="/visit/${l.slug}">
      <figure class="loc__photo">${img(l.photo.replace('.webp', '-800.webp'), l.photoAlt, w, h, { lazy: i > 0 })}</figure>
      <div class="loc__body">
        <p class="loc__code" aria-hidden="true">Gate ${String.fromCharCode(65 + i)} &middot; ${esc(l.area)}</p>
        <h2 class="loc__name">${esc(l.name)}</h2>
        ${statusPill(l)}
        <address>${esc(l.street)}<br>${esc(l.locality)}, ${esc(l.region)} ${esc(l.postalCode)}</address>
        <p class="loc__tel">${esc(l.phone.display)}</p>
        <span class="loc__go">Hours, map and parking <i aria-hidden="true">&rarr;</i></span>
      </div></a></li>`;
  }).join('');
  const body = hero({
    trail, eyebrow: 'Arrivals &middot; ' + READY.length + (READY.length === 1 ? ' shop' : ' shops'), h1: 'Visit *Dubai &amp; Dips.*',
    lead: `Walk in, see the case, and we will help you pick. Here is where to find our dessert shop in Clear Lake, Houston, when we are open, and how to get there.`,
    strip: ticketStrip([['Phone', telLink(PH, 'u', 'visit-hero')], ['Hours', GROUPS.map(g => `${g.days} ${g.text}`).join('<br>')]])
  }) + `
<section class="locs" aria-label="Our shops">
  <div class="shell"><ul class="locs__list">${cards}</ul></div>
</section>
${flightsSection()}`;
  return page({
    path: '/visit', current: '/visit', bodyClass: 'p-visit',
    title: 'Visit Dubai & Dips | Dessert Shop in Clear Lake, Houston',
    description: `Find Dubai & Dips in Clear Lake, Houston: address, phone, live opening hours and directions. Open until ${H.clockText(latest * 60)} on Fridays and Saturdays.`,
    image: READY[0] && READY[0].photo, imageAlt: READY[0] && READY[0].photoAlt,
    jsonld: [...READY.map(restaurant), breadcrumbs(trail)], body
  });
}

/* ====================================================== /visit/<slug> */
export function locationPage(l) {
  const trail = [{ name: 'Home', url: '/' }, { name: 'Visit', url: '/visit' }, { name: l.area, url: '/visit/' + l.slug }];
  const [pw, ph] = imgSize(l.photo);
  const popular = [['frappes', 'Dubai Chocolate Frappe'], ['frappes', 'Pistachio Frappe'], ['frappes', 'Biscoff Frappe'], ['matchas', 'Strawberry Matcha'], ['desserts', 'Kunafa']]
    .map(([slug, name]) => ({ slug, it: itemsOf(slug).find(x => x.name === name) })).filter(x => x.it);
  const gallery = (l.gallery || []).filter(g => g && g.src);
  const body = `<header class="vhero" id="vhero">
  <div class="vhero__stage">
    <figure class="vhero__photo">${img(l.photo, l.photoAlt, pw, ph, { lazy: false, sizes: '100vw' })}</figure>
    <div class="vhero__scrim" aria-hidden="true"></div>
    <div class="vhero__exit" aria-hidden="true"></div>
    <div class="shell vhero__copy">
      ${crumbs(trail)}
      <p class="eyebrow">${star()}<span>Gate A &middot; ${esc(l.area)}, ${esc(l.locality)}</span></p>
      <h1 class="vhero__title">Dubai &amp; Dips <em>${esc(l.area)}</em></h1>
      <p class="vhero__lead">Walk in. Taste Dubai. Our dessert shop in ${esc(l.area)}, ${esc(l.locality)}, open until ${H.clockText(latest * 60)} on Fridays and Saturdays.</p>
      <div class="phero__actions">${orderBtn(CFG.COPY.pickupCta || 'Order ahead for pickup', 'location-hero')}<a class="btn btn--line" href="${esc(mapsDirections(l))}" target="_blank" rel="noopener">Get directions<span class="vh"> (opens in a new tab)</span></a></div>
    </div>
    <p class="vhero__hint" aria-hidden="true">Scroll in <span>&darr;</span></p>
  </div>
</header>

<section class="gatep" aria-labelledby="gate-title">
  <div class="shell">
    <div class="gpass rv">
      <div class="gpass__stub">
        <p class="gpass__k">Your gate</p>
        <p class="gpass__code">HOU</p>
        <p class="gpass__city">${esc(l.area)}, ${esc(l.locality)}</p>
        <dl class="gpass__meta"><div><dt>Flight</dt><dd>DD 101</dd></div><div><dt>Gate</dt><dd>A</dd></div><div><dt>Seat</dt><dd>Any</dd></div></dl>
        <span class="gpass__bar" aria-hidden="true"></span>
      </div>
      <div class="gpass__main">
        <div class="gpass__col">
          <h2 class="lcard__h" id="gate-title">Hours</h2>
          ${statusPill(l)}
          <p class="live__count" data-live-count></p>
          <table class="htable">${hoursRows(null)}</table>
          ${(l.special || []).length ? `<p class="lcard__note">Special hours: ${l.special.map(s => esc(s.date) + (s.closed ? ' closed' : ` ${H.clockText(s.open * 60)} to ${H.clockText(s.close * 60)}`)).join('; ')}</p>` : ''}
        </div>
        <div class="gpass__col">
          <h2 class="lcard__h">Find us</h2>
          <address class="laddr">${esc(l.name)}<br>${esc(l.street)}<br>${esc(l.locality)}, ${esc(l.region)} ${esc(l.postalCode)}</address>
          <p class="lrow"><a class="lbtn" href="tel:${l.phone.tel}" data-call="location">${esc(l.phone.display)}</a><a class="lbtn" href="${esc(mapsDirections(l))}" target="_blank" rel="noopener">Directions<span class="vh"> (opens in a new tab)</span></a></p>
          ${l.parking ? `<h3 class="lcard__sub">Parking</h3><p>${esc(l.parking)}</p>` : ''}
          ${l.landmark ? `<h3 class="lcard__sub">Look for</h3><p>${esc(l.landmark)}</p>` : ''}
          <p class="gpass__order">${orderBtn(CFG.COPY.pickupCta || 'Order ahead for pickup', 'location-gate', 'btn btn--primary')}</p>
        </div>
      </div>
    </div>
    <figure class="lmap rv" data-map="${esc('https://www.google.com/maps?q=' + encodeURIComponent(l.mapQuery || oneLine(l)) + '&output=embed')}">
      <div class="lmap__facade" aria-hidden="true">${star('lmap__pin')}<span>${esc(l.area)}</span></div>
      <figcaption><a href="${esc(mapsSearch(l))}" target="_blank" rel="noopener">Open in Google Maps<span class="vh">: ${esc(l.name)} (opens in a new tab)</span></a></figcaption>
    </figure>
  </div>
</section>

${gallery.length ? `<section class="gal" aria-labelledby="gal-title">
  <div class="shell">
    <div class="sechead rv"><p class="eyebrow">${star()}<span>The room</span></p><h2 id="gal-title">Come in and <em>look around.</em></h2></div>
    <ul class="gal__grid">${gallery.map((g, i) => { const [w, h] = imgSize(g.src); return `
      <li class="gal__item rv${g.big ? ' gal__item--big' : ''}${g.tall ? ' gal__item--tall' : ''}" style="--i:${i}"><figure>${img(g.src, g.alt, w, h, { sizes: g.big ? '(min-width: 900px) 66vw, 100vw' : '(min-width: 900px) 33vw, 50vw' })}</figure></li>`; }).join('')}
    </ul>
  </div>
</section>` : ''}

<section class="popular" aria-labelledby="pop-title">
  <div class="shell">
    <div class="sechead rv"><p class="eyebrow">${star()}<span>Signature flights</span></p><h2 id="pop-title">What people come in <em>for.</em></h2>
    <p>The drinks and desserts on our own feature board, from <a href="/menu">the menu</a>.</p></div>
    <ul class="popular__list">${popular.map(({ slug, it }, i) => `
      <li class="rv" style="--i:${i}"><a href="/menu#${slug}">${img(it.photo, it.alt || it.name, 260, 260)}<span>${esc(it.name)}</span></a></li>`).join('')}
    </ul>
  </div>
</section>
${flightsSection()}`;
  return page({
    path: '/visit/' + l.slug, current: '/visit', bodyClass: 'p-location',
    title: `Dubai & Dips ${l.area} | Desserts in ${l.area}, ${l.locality}`.slice(0, 60),
    description: `Dubai & Dips ${l.area}, ${oneLine(l)}. Dubai chocolate frappes, matcha and kunafa. Live hours, phone, parking and directions.`.slice(0, 155),
    image: l.photo, imageAlt: l.photoAlt, preloadImage: l.photo,
    jsonld: [restaurant(l), breadcrumbs(trail)], body
  });
}

/* ============================================ /gelato, /team, /feed
   Finished designs with clearly marked placeholder content. noindex, and
   the build keeps them out of the sitemap, until the owner fills the
   configs (config/gelato.js, config/team.js, config/feed.js). */
const GELATO = (() => { const sb = { window: {} }; vm.createContext(sb); vm.runInContext(readRoot('config/gelato.js'), sb); return sb.window.DD_GELATO; })();
const TEAM = (() => { const sb = { window: {} }; vm.createContext(sb); vm.runInContext(readRoot('config/team.js'), sb); return sb.window.DD_TEAM; })();
const FEED = (() => { const sb = { window: {} }; vm.createContext(sb); vm.runInContext(readRoot('config/feed.js'), sb); return sb.window.DD_FEED; })();
const draftNote = what => `<p class="placeholder rv"><b>Placeholder.</b> ${what}</p>`;

export function gelatoPage() {
  const trail = [{ name: 'Home', url: '/' }, { name: 'Gelato', url: '/gelato' }];
  const G = GELATO, T = G.tabs;
  const W = 14, clean = s => String(s || '').toUpperCase().replace(/[^A-Z0-9 :\-&.\/]/g, '').slice(0, W);
  const flaps = w => { const t = clean(w), left = Math.floor((W - t.length) / 2), padded = (' '.repeat(left) + t + ' '.repeat(W)).slice(0, W);
    return [...padded].map(ch => `<span class="flap"><span class="flap__ch">${ch === ' ' ? '&nbsp;' : esc(ch)}</span><span class="flap__leaf"><span>${ch === ' ' ? '&nbsp;' : esc(ch)}</span></span></span>`).join(''); };
  const status = { 'on-time': 'On the board', seasonal: 'Seasonal', 'sold-out': 'Sold out today' };
  const panel = (id, t) => `<section class="gtab" id="tab-${id}" role="tabpanel" aria-labelledby="tabbtn-${id}" hidden><h2 class="gtab__h">${esc(t.title)}</h2>${t.lines.map(x => `<p class="gtab__p">${esc(x)}</p>`).join('')}</section>`;
  const body = `<header class="phero phero--gelato">
  <div class="shell phero__grid phero--split">
    <div class="phero__copy">
      ${crumbs(trail)}
      <p class="eyebrow rv">${star()}<span>FCO &middot; Rome &middot; DD 102</span></p>
      <h1 class="phero__title" data-lines>Gelato, made <em>the slow way.</em></h1>
      <p class="phero__lead rv">Dense, smooth and served a few degrees warmer than ice cream, so the flavor arrives first. This page is being written with the owner; what is here is a placeholder.</p>
    </div>
    <figure class="phero__media rv">${img('/assets/blog-gelato.webp', 'A scoop of pistachio gelato held up at the counter beside a layered latte in a Dubai & Dips cup', 765, 478, { lazy: false, sizes: '(min-width: 900px) 40vw, 100vw' })}</figure>
  </div>
</header>
<section class="gtabs" aria-label="About the gelato">
  <div class="shell">
    <div class="gtabs__bar" role="tablist" aria-label="Gelato">
      <button class="gtabs__btn" role="tab" id="tabbtn-quality" aria-controls="tab-quality" aria-selected="true">The Quality</button>
      <button class="gtabs__btn" role="tab" id="tabbtn-fresh" aria-controls="tab-fresh" aria-selected="false" tabindex="-1">Made Fresh Daily</button>
      <button class="gtabs__btn" role="tab" id="tabbtn-flavors" aria-controls="tab-flavors" aria-selected="false" tabindex="-1">Today&rsquo;s Flavors</button>
      <button class="gtabs__btn" role="tab" id="tabbtn-science" aria-controls="tab-science" aria-selected="false" tabindex="-1">The Science</button>
      <span class="gtabs__ink" aria-hidden="true"></span>
    </div>
    <div class="gtabs__panels">
      ${panel('quality', T.quality)}
      ${panel('fresh', T.fresh)}
      <section class="gtab" id="tab-flavors" role="tabpanel" aria-labelledby="tabbtn-flavors" hidden>
        <h2 class="gtab__h">Today&rsquo;s Flavors</h2>
        <p class="board__line">${star()} Departures &middot; Updated daily</p>
        <ul class="gboard" aria-label="Today's flavors">${G.flavors.map((f, i) => `
          <li class="gflap" data-status="${esc(f.status || 'on-time')}" style="--i:${i}"><span class="gflap__n">${String(i + 1).padStart(2, '0')}</span><span class="flaps" aria-hidden="true" style="--n:${W}">${flaps(f.name)}</span><span class="gflap__name">${esc(f.name)}<span class="vh">, ${status[f.status] || status['on-time']}</span></span><span class="gflap__st" aria-hidden="true">${status[f.status] || status['on-time']}</span></li>`).join('')}
        </ul>
        <p class="gtab__p">${esc(G.flavorsNote)}</p>
      </section>
      ${panel('science', T.science)}
    </div>
  </div>
</section>
${flightsSection()}`;
  return page({ path: '/gelato', current: '/gelato', bodyClass: 'p-gelato', noindex: true, title: 'Gelato | Dubai & Dips, Clear Lake, Houston',
    description: 'Gelato at Dubai & Dips in Clear Lake, Houston: the quality, made fresh daily, today\'s flavors and the science.', image: '/assets/blog-gelato.webp',
    jsonld: [breadcrumbs(trail)], body });
}

export function teamPage() {
  const trail = [{ name: 'Home', url: '/' }, { name: 'Meet the Crew', url: '/team' }];
  const sil = `<svg class="crew__sil" viewBox="0 0 120 150" aria-hidden="true"><circle cx="60" cy="52" r="30"/><path d="M12 150c4-34 24-52 48-52s44 18 48 52z"/></svg>`;
  const cards = TEAM.map((m, i) => `<li class="crew rv" style="--i:${i}">
      <figure class="crew__photo">${m.photo ? img(m.photo, m.name, 600, 750) : sil}</figure>
      <div class="crew__stub">
        <p class="crew__role">${esc(m.role)}</p>
        <h2 class="crew__name">${esc(m.name)}</h2>
        <p class="crew__line">${esc(m.line)}</p>
        <dl class="crew__meta"><div><dt>Favorite</dt><dd>${esc(m.favorite)}</dd></div><div><dt>Seat</dt><dd>${esc(m.seat || '')}</dd></div><div><dt>Crew</dt><dd>D&amp;D</dd></div></dl>
      </div>
    </li>`).join('');
  const body = hero({ trail, eyebrow: 'CAI &middot; Cairo &middot; DD 105', h1: 'Meet *the crew.*',
    lead: 'The people behind the counter. Names, roles and favorites are placeholders until the owner fills them in.' }) + `
<section class="crewgrid" aria-label="The crew">
  <div class="shell"><ul class="crew__list">${cards}</ul></div>
</section>
${flightsSection()}`;
  return page({ path: '/team', current: '/team', bodyClass: 'p-team', noindex: true, title: 'Meet the Crew | Dubai & Dips, Clear Lake, Houston',
    description: 'The people behind the counter at Dubai & Dips in Clear Lake, Houston.', jsonld: [breadcrumbs(trail)], body });
}

export function feedPage() {
  const trail = [{ name: 'Home', url: '/' }, { name: 'The Feed', url: '/feed' }];
  const L = CFG.LINKS || {};
  const glyph = p => p === 'tiktok'
    ? `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M14 3v11.2a3.2 3.2 0 1 1-2.6-3.1V8.4a5.9 5.9 0 1 0 5.3 5.8V9.6a6.4 6.4 0 0 0 3.6 1.1V8a3.7 3.7 0 0 1-3.6-3.3V3z"/></svg>`
    : `<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3.5" y="3.5" width="17" height="17" rx="4.5" fill="none" stroke="currentColor" stroke-width="1.8"/><circle cx="12" cy="12" r="3.8" fill="none" stroke="currentColor" stroke-width="1.8"/><circle cx="17" cy="7" r="1.1"/></svg>`;
  const name = { tiktok: 'TikTok', instagram: 'Instagram' }, handle = { tiktok: '@dubai.dips', instagram: '@dubaianddips' };
  const tiles = FEED.map((t, i) => {
    const p = t.platform === 'instagram' ? 'instagram' : 'tiktok';
    const ok = /^https:\/\/(www\.|m\.|vm\.)?(tiktok\.com|instagram\.com)\//i.test(t.url || '');
    return `<li class="ftile rv${ok ? ' has-url' : ''}" data-platform="${p}"${ok ? ` data-url="${esc(t.url)}"` : ''} style="--i:${i}">
      <div class="ftile__top" aria-hidden="true">${glyph(p)}<span>${name[p]}</span></div>
      <div class="ftile__body">${ok ? `<a class="ftile__link" href="${esc(t.url)}" target="_blank" rel="noopener">${esc(t.caption || 'Open on ' + name[p])}<span class="vh"> (opens in a new tab)</span></a>` : `<p class="ftile__ph">${esc(t.caption || '')}</p>`}</div>
    </li>`;
  }).join('');
  const body = hero({ trail, eyebrow: 'HND &middot; Tokyo &middot; DD 106', h1: 'The *Feed.*',
    lead: 'Our best TikToks and Reels, hand-picked. The tiles fill as post links are added; follow along in the meantime.',
    actions: `<a class="btn btn--primary" href="${esc(L.tiktok)}" target="_blank" rel="noopener">${glyph('tiktok')} Follow on TikTok<span class="vh"> (opens in a new tab)</span></a><a class="btn btn--line" href="${esc(L.instagram)}" target="_blank" rel="noopener">${glyph('instagram')} Follow on Instagram<span class="vh"> (opens in a new tab)</span></a>` }) + `
<section class="feedwall" aria-label="Posts">
  <div class="shell"><ul class="feedwall__grid">${tiles}</ul></div>
</section>
<section class="follow" aria-label="Follow">
  <div class="shell follow__grid">
    <a class="follow__card follow__card--tt rv" href="${esc(L.tiktok)}" target="_blank" rel="noopener">${glyph('tiktok')}<span class="follow__k">TikTok</span><span class="follow__h">${handle.tiktok}</span><span class="follow__go">Follow <i aria-hidden="true">&nearr;</i></span><span class="vh"> (opens in a new tab)</span></a>
    <a class="follow__card follow__card--ig rv" href="${esc(L.instagram)}" target="_blank" rel="noopener">${glyph('instagram')}<span class="follow__k">Instagram</span><span class="follow__h">${handle.instagram}</span><span class="follow__go">Follow <i aria-hidden="true">&nearr;</i></span><span class="vh"> (opens in a new tab)</span></a>
  </div>
</section>
${flightsSection()}`;
  return page({ path: '/feed', current: '/feed', bodyClass: 'p-feed', noindex: true, title: 'The Feed | Dubai & Dips on TikTok and Instagram',
    description: 'Hand-picked TikToks and Instagram Reels from Dubai & Dips in Clear Lake, Houston.', jsonld: [breadcrumbs(trail)], body });
}

/* ================================================================= 404 */
export function notFoundPage() {
  const letters = 'FLIGHT NOT FOUND'.split('').map((c, i) => `<span class="nf__t" style="--i:${i}">${c === ' ' ? '&nbsp;' : c}</span>`).join('');
  const body = `<section class="nf">
  <div class="shell nf__in">
    <p class="eyebrow">${star()}<span>Error 404 &middot; Gate unknown</span></p>
    <h1 class="nf__title"><span class="vh">Flight not found</span><span class="nf__tiles" aria-hidden="true">${letters}</span></h1>
    <p class="nf__lead">That page has no departure on our board. The link may be old, or it was typed wrong. Here is where the flights are leaving from.</p>
    <div class="phero__actions">${orderBtn(CFG.COPY.pickupCta || 'Order ahead for pickup', '404')}<a class="btn btn--line" href="/menu">See the menu</a></div>
    <ol class="nf__routes">
      <li><a href="/menu"><b>MENU</b><span>The whole menu</span><i aria-hidden="true">&rarr;</i></a></li>
      <li><a href="/visit"><b>HOU</b><span>Visit the shop</span><i aria-hidden="true">&rarr;</i></a></li>
      <li><a href="/catering"><b>GRP</b><span>Catering</span><i aria-hidden="true">&rarr;</i></a></li>
      <li><a href="/"><b>HOME</b><span>Back to the homepage</span><i aria-hidden="true">&rarr;</i></a></li>
    </ol>
  </div>
</section>`;
  return page({ path: '/404', noindex: true, bodyClass: 'p-404', title: 'Flight Not Found | Dubai & Dips Desserts, Houston', description: 'That page is not on the Dubai & Dips board. Find the menu, visit the shop in Clear Lake, Houston, or order ahead for pickup.', body });
}

export { hero, connections, faqBlock, orderBtn, img, telLink };
