/* The inner pages. Every fact on them is read from config/ordering.js,
   hours.js and menu-board.json at build time - the same sources the
   homepage reads - so nothing here can drift from the rest of the site. */
import {
  CFG, MENU, H, SITE, READY, REVIEWS, esc, abs, page, ticketStrip, crumbs, star, accent, plain,
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
  '/assets/visit-clear-lake.webp': [1360, 765], '/assets/blog-lineup.webp': [1360, 765], '/assets/visit-clear-lake-800.webp': [800, 450],
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
${connections([
    ['/catering', 'GRP', 'Feeding a crowd?', 'Frappes, coffee and desserts for the whole group.'],
    ['/visit/clear-lake', 'HOU', 'Come see the case', 'Dubai &amp; Dips Clear Lake: hours, parking and directions.'],
    ['/blog', 'LOG', 'Read the flight log', 'Guides to Dubai chocolate, frappes and late-night dessert.']
  ])}`;
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
  const faqs = cateringFaqs();
  const C = CFG.CATERING || {};
  const offer = ['frappes', 'classic-coffees', 'matchas', 'desserts'].map(slug => ROWS.find(r => r.slug === slug)).filter(Boolean);
  const passes = ['dubai', 'italy', 'turkey', 'europe'].map((n, i) => `<img class="fan__p fan__p--${i}" src="/public/brand/boarding-pass/bpass-${n}.svg" width="131" height="158" alt="" ${i ? 'loading="lazy" ' : ''}decoding="async">`).join('');
  const chips = ROWS.map(r => `<label class="chip"><input type="checkbox" name="interests" value="${esc(r.category)}"><span><b>${esc(r.code)}</b>${esc(plain(r.category).replace(/^The /, ''))}</span></label>`).join('');
  const body = hero({
    trail, cls: 'phero--split', eyebrow: 'Group bookings &middot; Offices, parties, events',
    h1: 'Catering that *arrives together.*',
    lead: `Frappes, espresso, matcha and desserts for the office, the party or the event, from our dessert shop in Clear Lake, Houston. Tell us the date and headcount and we will plan the flight with you.`,
    actions: `<a class="btn btn--primary" href="#request">Request catering</a>${telLink(PH, 'btn btn--line', 'catering-hero').replace('>' + esc(PH.display), '>Call ' + esc(PH.display))}`,
    strip: ticketStrip([['Delivery', `Up to ${CFG.DELIVERY_RADIUS_MILES} miles`], ['Group orders', `From $${CFG.GROUP_ORDER_MINIMUM}`], ['Pickup', 'Clear Lake']]),
    media: `<div class="fan rv" aria-hidden="true">${passes}</div>`
  }) + `
<section class="offer" aria-labelledby="offer-title">
  <div class="shell">
    <div class="sechead rv"><p class="eyebrow">${star()}<span>What flies for groups</span></p><h2 id="offer-title">The same menu, <em>for the whole team.</em></h2>
    <p>Everything a group order can carry comes off the boards in the shop. Start with these four routes; <a href="/menu">the full menu</a> has the rest.</p></div>
    <ul class="offer__list">${offer.map((r, i) => `
      <li class="offer__card rv" style="--i:${i}"><a href="/menu#${r.slug}">
        <span class="offer__code" aria-hidden="true">${esc(r.code)}</span>
        <h3>${esc(r.category)}</h3>
        <p>${(r.items || []).slice(0, 3).map(it => esc(it.name)).join(' &middot; ') || esc(r.description)}</p>
        <span class="offer__go">See the route <i aria-hidden="true">&rarr;</i></span></a></li>`).join('')}
    </ul>
  </div>
</section>

<section class="itin" aria-labelledby="itin-title">
  <div class="shell itin__grid">
    <div class="sechead rv"><p class="eyebrow">${star()}<span>How big orders fly</span></p><h2 id="itin-title">Three legs, <em>no layovers.</em></h2></div>
    <ol class="itin__list">
      <li class="rv"><span class="itin__n">01</span><h3>Book the flight</h3><p>Send the date, time, headcount and what you would like with the form below, or call ${telLink(PH, 'u')}. ${C.noticeHours ? `We need at least ${C.noticeHours} hours for a large order.` : 'The earlier you ask, the more we can do.'}</p></li>
      <li class="rv"><span class="itin__n">02</span><h3>Everyone picks</h3><p>${esc(CFG.COPY.groupText)} Group orders start at $${CFG.GROUP_ORDER_MINIMUM}.</p></li>
      <li class="rv"><span class="itin__n">03</span><h3>Pickup or delivery</h3><p>Pick up at <a href="/visit/${READY[0].slug}">${esc(READY[0].name)}</a>, or have it delivered up to ${CFG.DELIVERY_RADIUS_MILES} miles from the shop ($${CFG.DELIVERY_MINIMUM} minimum).</p></li>
    </ol>
  </div>
</section>

<section class="book" id="request" aria-labelledby="book-title">
  <div class="shell book__grid">
    <div class="book__intro rv">
      <p class="eyebrow">${star()}<span>Group booking</span></p>
      <h2 id="book-title">Request <em>catering.</em></h2>
      <p>Fill in what you know; we will come back to you to confirm the details. Prefer to talk it through? Call ${telLink(PH, 'u', 'catering-form')}.</p>
      ${ticketStrip([['Operated by', 'D&amp;D Airlines'], ['From', 'HOU &middot; Clear Lake']])}
    </div>
    <form class="bform rv" id="cateringForm" novalidate data-endpoint="${esc(C.formEndpoint || '')}" aria-describedby="bformNote">
      <div class="bform__head" aria-hidden="true"><span>D&amp;D Airlines</span><span>Group booking</span></div>
      <p class="bform__note" id="bformNote">Fields marked with a star are required.</p>
      <div class="bform__errors" id="bformErrors" tabindex="-1" hidden></div>
      <fieldset><legend>Flight details</legend>
        <div class="bform__row bform__row--3">
          <div class="fl"><input id="cDate" name="date" type="date" required placeholder=" " autocomplete="off"><label for="cDate">Date <span aria-hidden="true">&#10022;</span></label><p class="fl__err" id="cDate-err"></p></div>
          <div class="fl"><input id="cTime" name="time" type="time" required placeholder=" "><label for="cTime">Time <span aria-hidden="true">&#10022;</span></label><p class="fl__err" id="cTime-err"></p></div>
          <div class="fl"><input id="cCount" name="headcount" type="number" inputmode="numeric" min="1" max="2000" step="1" required placeholder=" "><label for="cCount">Headcount <span aria-hidden="true">&#10022;</span></label><p class="fl__err" id="cCount-err"></p></div>
        </div>
      </fieldset>
      <fieldset><legend>What&rsquo;s on board</legend>
        <div class="chips">${chips}</div>
      </fieldset>
      <fieldset><legend>Lead passenger</legend>
        <div class="bform__row">
          <div class="fl"><input id="cName" name="name" type="text" required autocomplete="name" placeholder=" "><label for="cName">Name <span aria-hidden="true">&#10022;</span></label><p class="fl__err" id="cName-err"></p></div>
        </div>
        <div class="bform__row bform__row--2">
          <div class="fl"><input id="cPhone" name="phone" type="tel" inputmode="tel" required autocomplete="tel" placeholder=" "><label for="cPhone">Phone <span aria-hidden="true">&#10022;</span></label><p class="fl__err" id="cPhone-err"></p></div>
          <div class="fl"><input id="cEmail" name="email" type="email" inputmode="email" required autocomplete="email" placeholder=" "><label for="cEmail">Email <span aria-hidden="true">&#10022;</span></label><p class="fl__err" id="cEmail-err"></p></div>
        </div>
      </fieldset>
      <fieldset><legend>Anything else</legend>
        <div class="fl fl--area"><textarea id="cNotes" name="notes" rows="4" placeholder=" "></textarea><label for="cNotes">Notes: allergies, a delivery address, a budget</label></div>
      </fieldset>
      <div class="bform__foot">
        <button class="btn btn--primary bform__send" type="submit"><span>Send request</span></button>
        <p class="bform__status" id="bformStatus" role="status" aria-live="polite"></p>
      </div>
    </form>
  </div>
</section>
${faqBlock(faqs)}
${connections([
    ['/menu', 'MENU', 'See every route', 'The full menu, category by category.'],
    ['/visit/clear-lake', 'HOU', 'Pickup in Clear Lake', 'Hours, parking and directions for the shop.'],
    ['/blog', 'LOG', 'Planning for the office?', 'Read our guide to ordering dessert for a team.']
  ])}`;
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
${connections([
    ['/menu', 'MENU', 'Know what you want?', 'See the whole menu before you come in.'],
    ['/catering', 'GRP', 'Coming as a group?', 'Catering for offices, parties and events.']
  ])}`;
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
  const L = CFG.LINKS || {};
  const body = `<header class="lhero phero--wide">
  <div class="shell lhero__grid">
    <div class="lhero__copy">
      ${crumbs(trail)}
      <p class="eyebrow rv">${star()}<span>Gate A &middot; ${esc(l.area)}, ${esc(l.locality)}</span></p>
      <h1 class="phero__title" data-lines>Dubai &amp; Dips <em>${esc(l.area)}</em></h1>
      <p class="phero__lead rv">Our dessert shop in ${esc(l.area)}, ${esc(l.locality)}: Dubai chocolate frappes, matcha, coffee and kunafa, made here and served until ${H.clockText(latest * 60)} on Fridays and Saturdays.</p>
      <div class="phero__actions rv">${orderBtn(CFG.COPY.pickupCta || 'Order ahead for pickup', 'location-hero')}<a class="btn btn--line" href="${esc(mapsDirections(l))}" target="_blank" rel="noopener">Get directions<span class="vh"> (opens in a new tab)</span></a></div>
    </div>
    <figure class="lhero__photo rv">${img(l.photo, l.photoAlt, pw, ph, { lazy: false, sizes: '(min-width: 900px) 50vw, 100vw' })}</figure>
  </div>
</header>

<section class="lgrid" aria-label="Address, hours and contact">
  <div class="shell lgrid__in">
    <div class="lgrid__main">
      <div class="lcard rv" id="hours">
        <h2 class="lcard__h">Hours</h2>
        ${statusPill(l)}
        <p class="live__count" data-live-count></p>
        <table class="htable">${hoursRows(null)}</table>
        ${(l.special || []).length ? `<p class="lcard__note">Special hours: ${l.special.map(s => esc(s.date) + (s.closed ? ' closed' : ` ${H.clockText(s.open * 60)} to ${H.clockText(s.close * 60)}`)).join('; ')}</p>` : ''}
      </div>
      <div class="lcard rv">
        <h2 class="lcard__h">Find us</h2>
        <address class="laddr">${esc(l.name)}<br>${esc(l.street)}<br>${esc(l.locality)}, ${esc(l.region)} ${esc(l.postalCode)}</address>
        <p class="lrow"><a class="lbtn" href="tel:${l.phone.tel}" data-call="location">${esc(l.phone.display)}</a><a class="lbtn" href="${esc(mapsDirections(l))}" target="_blank" rel="noopener">Directions<span class="vh"> (opens in a new tab)</span></a></p>
        ${l.parking ? `<h3 class="lcard__sub">Parking</h3><p>${esc(l.parking)}</p>` : ''}
        ${l.landmark ? `<h3 class="lcard__sub">Look for</h3><p>${esc(l.landmark)}</p>` : ''}
      </div>
      <figure class="lmap rv" data-map="${esc('https://www.google.com/maps?q=' + encodeURIComponent(l.mapQuery || oneLine(l)) + '&output=embed')}">
        <div class="lmap__facade" aria-hidden="true">${star('lmap__pin')}<span>${esc(l.area)}</span></div>
        <figcaption><a href="${esc(mapsSearch(l))}" target="_blank" rel="noopener">Open in Google Maps<span class="vh">: ${esc(l.name)} (opens in a new tab)</span></a></figcaption>
      </figure>
    </div>
    <aside class="lside" aria-label="Order ahead">
      <div class="lside__card on-green">
        <p class="lside__k">Skip the line</p>
        <p class="lside__t">Order ahead and it is ready when you walk in.</p>
        ${orderBtn(CFG.COPY.pickupCta || 'Order ahead for pickup', 'location-side', 'btn btn--primary lside__btn')}
        <a class="lside__tel" href="tel:${l.phone.tel}" data-call="location-side">or call ${esc(l.phone.display)}</a>
      </div>
    </aside>
  </div>
</section>

<section class="popular" aria-labelledby="pop-title">
  <div class="shell">
    <div class="sechead rv"><p class="eyebrow">${star()}<span>Signature flights</span></p><h2 id="pop-title">What people come in <em>for.</em></h2>
    <p>The drinks and desserts on our own feature board, from <a href="/menu">the menu</a>.</p></div>
    <ul class="popular__list">${popular.map(({ slug, it }, i) => `
      <li class="rv" style="--i:${i}"><a href="/menu#${slug}">${img(it.photo, it.alt || it.name, 260, 260)}<span>${esc(it.name)}</span></a></li>`).join('')}
    </ul>
  </div>
</section>

${REVIEWS.length ? `<section class="rstrip" aria-labelledby="rv-title">
  <div class="shell">
    <div class="sechead rv"><p class="eyebrow">${star()}<span>Passenger notes</span></p><h2 id="rv-title">Sample <em>reviews.</em></h2>
    <p>These are the same sample reviews as on our homepage, until the shop's real Google reviews are connected.${isHttp(L.googleReviews) ? ` <a href="${esc(L.googleReviews)}" target="_blank" rel="noopener">Leave us a review<span class="vh"> (opens in a new tab)</span></a>.` : ''}</p></div>
    <ul class="rstrip__list">${REVIEWS.map((r, i) => `<li class="rv" style="--i:${i}"><blockquote>&ldquo;${r.text}&rdquo;</blockquote><p>${esc(r.who)}</p></li>`).join('')}</ul>
  </div>
</section>` : ''}
${connections([
    ['/menu', 'MENU', 'The whole menu', 'Ten routes, from Dubai chocolate to kunafa.'],
    ['/catering', 'GRP', 'Catering', 'Frappes and desserts for the office or the party.'],
    ['/visit', 'ALL', 'All our shops', 'Every Dubai &amp; Dips location.']
  ])}`;
  return page({
    path: '/visit/' + l.slug, current: '/visit', bodyClass: 'p-location',
    title: `Dubai & Dips ${l.area} | Desserts in ${l.area}, ${l.locality}`.slice(0, 60),
    description: `Dubai & Dips ${l.area}, ${oneLine(l)}. Dubai chocolate frappes, matcha and kunafa. Live hours, phone, parking and directions.`.slice(0, 155),
    image: l.photo, imageAlt: l.photoAlt, preloadImage: l.photo,
    jsonld: [restaurant(l), breadcrumbs(trail)], body
  });
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
