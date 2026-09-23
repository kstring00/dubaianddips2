/* Dubai & Dips - /order-demo.
   A branded imitation of the Toast ordering flow for the pitch. Four
   screens, no page reloads, state in memory only. No card inputs and no
   invented order numbers: the last screen is the hand-off to Toast. Every
   number (minimum, fee tiers, tax, tips, prices) comes from
   config/ordering.js, and every step completion is tracked. */
(function () {
  'use strict';
  var CFG = window.DD_CONFIG || {};
  var COPY = CFG.COPY || {};
  var track = (window.DD && window.DD.track) || function () {};
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var $ = function (id) { return document.getElementById(id); };
  var TIERS = (CFG.DELIVERY_FEE_TIERS || []).slice().sort(function (a, b) { return a.min - b.min; });
  var ITEMS = CFG.DEMO_ITEMS || [];
  var STEPS = ['mode', 'menu', 'cart', 'checkout'];

  var state = { step: 1, mode: null, lines: {}, tip: 0.15, time: 'asap' };

  function money(n) { return '$' + (Math.round(n * 100) / 100).toFixed(2); }
  function short(n) { return money(n).replace(/\.00$/, ''); }
  function esc(t) { return String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;'); }
  function feeFor(subtotal) {
    var fee = null;
    for (var i = 0; i < TIERS.length; i++) if (subtotal >= TIERS[i].min) fee = TIERS[i].fee;
    return fee;
  }
  function feeSentence() {
    return TIERS.map(function (t, i) {
      var fee = t.fee > 0 ? short(t.fee) : 'free';
      return i === 0 ? 'fee ' + fee + ' over ' + short(t.min) : fee + ' over ' + short(t.min);
    }).join(', ');
  }
  function subtotal() {
    var s = 0;
    for (var k in state.lines) if (state.lines.hasOwnProperty(k)) { var l = state.lines[k]; s += (l.item.price + l.opt.delta) * l.qty; }
    return s;
  }
  function count() {
    var n = 0;
    for (var k in state.lines) if (state.lines.hasOwnProperty(k)) n += state.lines[k].qty;
    return n;
  }
  function totals() {
    var sub = subtotal();
    var tax = sub * (CFG.DEMO_TAX_RATE || 0);
    var fee = state.mode === 'delivery' ? (feeFor(sub) === null ? 0 : feeFor(sub)) : 0;
    var tip = sub * state.tip;
    return { sub: sub, tax: tax, fee: fee, tip: tip, total: sub + tax + fee + tip };
  }
  function belowMin() { return state.mode === 'delivery' && subtotal() < (CFG.DELIVERY_MINIMUM || 0); }

  /* ------------------------------------------------------------ pill */
  var pill = $('demoPill');
  if (pill) pill.hidden = !CFG.DEMO;

  /* -------------------------------------------------------- phone link */
  var call = $('callBtn');
  if (call && CFG.PHONE && CFG.PHONE.tel) { call.setAttribute('href', 'tel:' + CFG.PHONE.tel); call.setAttribute('aria-label', 'Call ' + CFG.PHONE.display); }
  if (call) call.addEventListener('click', function () { track('call_click', { place: 'demo-header' }); });

  /* ----------------------------------------------------------- step 1 */
  var pf = $('pickupFine'), ds = $('deliverySub'), df = $('deliveryFine');
  if (pf) pf.textContent = 'No fee. Pick a time or come now.';
  if (ds) ds.textContent = 'Within ' + CFG.DELIVERY_RADIUS_MILES + ' miles.';
  if (df) df.textContent = short(CFG.DELIVERY_MINIMUM) + ' minimum. Delivery ' + feeSentence() + '.';
  var modeBtns = [].slice.call(document.querySelectorAll('.mode'));
  modeBtns.forEach(function (b) {
    b.addEventListener('click', function () {
      state.mode = b.getAttribute('data-mode');
      modeBtns.forEach(function (x) { x.setAttribute('aria-pressed', x === b ? 'true' : 'false'); });
      track('demo_step_complete', { step: 1, name: 'mode', mode: state.mode });
      go(2, true);
    });
  });
  var pre = /[?&]mode=(pickup|delivery)/.exec(location.search);
  if (pre) modeBtns.forEach(function (x) { x.setAttribute('aria-pressed', x.getAttribute('data-mode') === pre[1] ? 'true' : 'false'); });

  /* ----------------------------------------------------------- step 2 */
  var list = $('items');
  function renderItems() {
    list.innerHTML = ITEMS.map(function (it, i) {
      var pic = it.image
        ? '<img src="' + it.image + '" width="110" height="110" loading="' + (i < 3 ? 'eager' : 'lazy') + '" decoding="async" alt="' + esc(it.alt) + '">'
        : '<span class="item__plate" aria-hidden="true">' + esc(it.initial || it.name.charAt(0)) + '</span>';
      var mods = it.modifier.options.map(function (o, j) {
        return '<label class="mod"><input type="radio" name="mod-' + it.id + '" value="' + j + '"' + (j === 0 ? ' checked' : '') + '><span>' + esc(o.name) + (o.delta ? ' +' + short(o.delta) : '') + '</span></label>';
      }).join('');
      return '<li class="item" data-id="' + it.id + '">' + pic +
        '<div class="item__body"><div class="item__top"><span class="item__name">' + esc(it.name) + '</span><span class="item__price">' + money(it.price) + '</span></div>' +
        '<span class="item__cat">' + esc(it.category) + '</span>' +
        '<fieldset class="mods"><legend>' + esc(it.modifier.label) + '</legend>' + mods + '</fieldset>' +
        '<div class="item__act"><span class="item__sub" data-sub></span><button class="btn btn--line" type="button" data-add aria-label="Add ' + esc(it.name) + '">Add</button></div></div></li>';
    }).join('');
  }
  function itemById(id) { for (var i = 0; i < ITEMS.length; i++) if (ITEMS[i].id === id) return ITEMS[i]; return null; }
  function chosenOpt(li) {
    var r = li.querySelector('input[type=radio]:checked');
    return r ? parseInt(r.value, 10) : 0;
  }
  function add(id, oi) {
    var it = itemById(id), opt = it.modifier.options[oi], key = id + '|' + oi;
    if (!state.lines[key]) state.lines[key] = { item: it, opt: opt, qty: 0 };
    state.lines[key].qty += 1;
    track('demo_item_added', { item: it.name, modifier: opt.name, qty: state.lines[key].qty, mode: state.mode });
  }
  function change(key, d) {
    var l = state.lines[key]; if (!l) return;
    l.qty += d;
    if (l.qty <= 0) delete state.lines[key];
  }
  function paintItems() {
    [].slice.call(list.querySelectorAll('.item')).forEach(function (li) {
      var id = li.getAttribute('data-id'), it = itemById(id), oi = chosenOpt(li), key = id + '|' + oi;
      var l = state.lines[key], sub = li.querySelector('[data-sub]'), act = li.querySelector('.item__act');
      var price = it.price + it.modifier.options[oi].delta;
      sub.textContent = money(price) + (l ? ' x ' + l.qty : '');
      var old = act.querySelector('.qty'); if (old) old.remove();
      var addBtn = act.querySelector('[data-add]');
      if (l) {
        addBtn.hidden = true;
        var q = document.createElement('span'); q.className = 'qty';
        q.innerHTML = '<button type="button" data-dec aria-label="Remove one ' + esc(it.name) + '">&minus;</button><span>' + l.qty + '</span><button type="button" data-inc aria-label="Add one more ' + esc(it.name) + '">+</button>';
        act.appendChild(q);
      } else addBtn.hidden = false;
    });
    paintBar();
  }
  list.addEventListener('click', function (e) {
    var li = e.target.closest('.item'); if (!li) return;
    var id = li.getAttribute('data-id'), oi = chosenOpt(li), key = id + '|' + oi;
    if (e.target.closest('[data-add]') || e.target.closest('[data-inc]')) { add(id, oi); paintItems(); }
    else if (e.target.closest('[data-dec]')) { change(key, -1); paintItems(); }
  });
  list.addEventListener('change', function (e) { if (e.target.type === 'radio') paintItems(); });

  /* ----------------------------------------------------------- step 3 */
  var linesEl = $('lines'), minNotice = $('minNotice'), tipChips = $('tipChips'), timeChips = $('timeChips'), timeSel = $('timeSel'), totalsEl = $('totals');
  function paintCart() {
    var keys = Object.keys(state.lines);
    if (!keys.length) linesEl.innerHTML = '<li class="empty">Nothing in the order yet. Go back to the menu and add something.</li>';
    else linesEl.innerHTML = keys.map(function (k) {
      var l = state.lines[k], price = (l.item.price + l.opt.delta) * l.qty;
      return '<li class="line" data-key="' + esc(k) + '"><span><span class="line__name">' + esc(l.item.name) + '</span><br><span class="line__mod">' + esc(l.item.modifier.label) + ': ' + esc(l.opt.name) + '</span></span>' +
        '<span class="line__price">' + money(price) + '</span>' +
        '<span class="qty"><button type="button" data-dec aria-label="Remove one ' + esc(l.item.name) + '">&minus;</button><span>' + l.qty + '</span><button type="button" data-inc aria-label="Add one more ' + esc(l.item.name) + '">+</button></span>' +
        '<button class="line__rm" type="button" data-rm>Remove</button></li>';
    }).join('');
    var sub = subtotal();
    if (belowMin()) {
      minNotice.hidden = false;
      minNotice.textContent = 'Delivery has a ' + short(CFG.DELIVERY_MINIMUM) + ' minimum. Add ' + money(CFG.DELIVERY_MINIMUM - sub) + ' more, or switch to pickup.';
    } else minNotice.hidden = true;

    $('timeTitle').textContent = state.mode === 'delivery' ? 'Delivery time' : 'Pickup time';
    var t = totals();
    var feeLine = state.mode === 'delivery'
      ? '<li><span>Delivery fee<small>' + (t.fee === 0 && sub >= (CFG.DELIVERY_MINIMUM || 0) ? 'Free over ' + short(TIERS[TIERS.length - 1].min) : nextTier(sub)) + '</small></span><span>' + (sub >= (CFG.DELIVERY_MINIMUM || 0) ? money(t.fee) : '—') + '</span></li>'
      : '<li><span>Pickup<small>No fee</small></span><span>' + money(0) + '</span></li>';
    totalsEl.innerHTML = '<li><span>Subtotal</span><span>' + money(t.sub) + '</span></li>' +
      '<li><span>Tax<small>' + (CFG.DEMO_TAX_RATE * 100).toFixed(2).replace(/\.?0+$/, '') + '%</small></span><span>' + money(t.tax) + '</span></li>' +
      feeLine +
      '<li><span>Tip</span><span>' + money(t.tip) + '</span></li>' +
      '<li class="is-total"><span>Total</span><span>' + money(t.total) + '</span></li>';
    paintBar();
  }
  function nextTier(sub) {
    for (var i = 0; i < TIERS.length; i++) if (sub < TIERS[i].min) return (TIERS[i].fee > 0 ? short(TIERS[i].fee) : 'Free') + ' over ' + short(TIERS[i].min);
    return '';
  }
  linesEl.addEventListener('click', function (e) {
    var li = e.target.closest('.line'); if (!li) return;
    var key = li.getAttribute('data-key');
    if (e.target.closest('[data-inc]')) change(key, 1);
    else if (e.target.closest('[data-dec]')) change(key, -1);
    else if (e.target.closest('[data-rm]')) delete state.lines[key];
    else return;
    paintCart();
  });
  (CFG.DEMO_TIPS || [0, .1, .15, .2]).forEach(function (p) {
    var b = document.createElement('button'); b.type = 'button';
    b.textContent = p === 0 ? 'No tip' : Math.round(p * 100) + '%';
    b.setAttribute('aria-pressed', p === state.tip ? 'true' : 'false');
    b.addEventListener('click', function () {
      state.tip = p;
      [].slice.call(tipChips.children).forEach(function (x) { x.setAttribute('aria-pressed', x === b ? 'true' : 'false'); });
      paintCart();
    });
    tipChips.appendChild(b);
  });

  /* Time slots in the shop's own timezone, from now + prep to close. If
     the shop is closed, the slots are for the next open day. */
  function shopNow() {
    try {
      var parts = new Intl.DateTimeFormat('en-US', { timeZone: (CFG.SHOP && CFG.SHOP.timezone) || 'America/Chicago', hour12: false, weekday: 'short', hour: '2-digit', minute: '2-digit' }).formatToParts(new Date());
      var o = {}; parts.forEach(function (x) { o[x.type] = x.value; });
      var days = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
      return { d: days[o.weekday], m: (parseInt(o.hour, 10) % 24) * 60 + parseInt(o.minute, 10) };
    } catch (e) { var n = new Date(); return { d: n.getDay(), m: n.getHours() * 60 + n.getMinutes() }; }
  }
  function label(m) { var h = Math.floor(m / 60), mm = m % 60, ap = h >= 12 ? 'pm' : 'am'; return ((h % 12) || 12) + ':' + (mm < 10 ? '0' : '') + mm + ' ' + ap; }
  function slots() {
    var HOURS = CFG.HOURS || [], now = shopNow(), step = CFG.DEMO_SLOT_MINUTES || 15, prep = CFG.DEMO_PREP_MINUTES || 15;
    var names = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    for (var i = 0; i < 7; i++) {
      var d = (now.d + i) % 7, h = HOURS[d]; if (!h) continue;
      var open = h[0] * 60, close = h[1] * 60;
      var start = i === 0 ? Math.max(open, Math.ceil((now.m + prep) / step) * step) : open;
      if (start >= close) continue;
      var out = [];
      for (var m = start; m < close && out.length < 24; m += step) out.push({ v: names[d] + ' ' + label(m), t: (i === 0 ? 'Today ' : names[d] + ' ') + label(m) });
      return out;
    }
    return [];
  }
  function paintTime() {
    var ss = slots();
    timeChips.innerHTML = '';
    var asap = document.createElement('button'); asap.type = 'button';
    asap.textContent = 'ASAP (about ' + (CFG.DEMO_PREP_MINUTES || 15) + ' min)';
    asap.setAttribute('aria-pressed', state.time === 'asap' ? 'true' : 'false');
    var later = document.createElement('button'); later.type = 'button'; later.textContent = 'Schedule';
    later.setAttribute('aria-pressed', state.time !== 'asap' ? 'true' : 'false');
    timeChips.appendChild(asap); timeChips.appendChild(later);
    timeSel.innerHTML = ss.map(function (s) { return '<option value="' + esc(s.v) + '">' + esc(s.t) + '</option>'; }).join('');
    timeSel.hidden = state.time === 'asap';
    if (!ss.length) { later.disabled = true; }
    asap.addEventListener('click', function () { state.time = 'asap'; paintTime(); });
    later.addEventListener('click', function () { state.time = timeSel.value || (ss[0] && ss[0].v) || 'asap'; paintTime(); });
    timeSel.addEventListener('change', function () { state.time = timeSel.value; });
  }

  /* ------------------------------------------------------------ bar */
  var bar = $('actbar'), actBtn = $('actBtn'), actSub = $('actSub');
  function paintBar() {
    var n = count(), t = totals();
    if (state.step === 2) {
      bar.classList.add('is-on'); document.body.classList.add('has-bar');
      actBtn.disabled = n === 0;
      actBtn.innerHTML = '<span>' + (n ? 'View cart · ' + n + (n === 1 ? ' item' : ' items') : 'Add something to start') + '</span><b>' + money(t.sub) + '</b>';
      actSub.textContent = state.mode === 'delivery' && belowMin() ? short(CFG.DELIVERY_MINIMUM) + ' delivery minimum' : '';
    } else if (state.step === 3) {
      bar.classList.add('is-on'); document.body.classList.add('has-bar');
      actBtn.disabled = n === 0 || belowMin();
      actBtn.innerHTML = '<span>Continue to checkout</span><b>' + money(t.total) + '</b>';
      actSub.textContent = 'Payment happens in Toast, not on this site.';
    } else { bar.classList.remove('is-on'); document.body.classList.remove('has-bar'); }
  }
  actBtn.addEventListener('click', function () {
    if (state.step === 2) { track('demo_step_complete', { step: 2, name: 'menu', items: count(), subtotal: +subtotal().toFixed(2), mode: state.mode }); go(3, true); }
    else if (state.step === 3) {
      var t = totals();
      track('demo_step_complete', { step: 3, name: 'cart', items: count(), total: +t.total.toFixed(2), tip: state.tip, time: state.time, mode: state.mode });
      go(4, true);
    }
  });

  /* ----------------------------------------------------------- step 4 */
  function paintHand() {
    var t = totals(), n = count();
    $('handSum').textContent = 'Demo order: ' + n + (n === 1 ? ' item' : ' items') + ' for ' + (state.mode || 'pickup') + ', ' + money(t.total) + ' including tax' + (state.mode === 'delivery' ? ', delivery' : '') + ' and tip. Nothing was charged.';
    track('demo_step_complete', { step: 4, name: 'checkout', mode: state.mode, items: n, total: +t.total.toFixed(2) });
  }
  $('restart').addEventListener('click', function () {
    state = { step: 1, mode: null, lines: {}, tip: 0.15, time: 'asap' };
    modeBtns.forEach(function (x) { x.setAttribute('aria-pressed', 'false'); });
    [].slice.call(tipChips.children).forEach(function (x, i) { x.setAttribute('aria-pressed', (CFG.DEMO_TIPS || [])[i] === state.tip ? 'true' : 'false'); });
    track('demo_restart', {});
    go(1, true);
  });

  /* --------------------------------------------------------- routing
     Steps live in history so a phone's back button walks back through
     the order instead of leaving the page. State is never in the URL. */
  var screens = [].slice.call(document.querySelectorAll('.screen'));
  var stepEls = [].slice.call(document.querySelectorAll('#steps li'));
  function go(n, push) {
    if (n > 1 && !state.mode) n = 1;
    state.step = n;
    screens.forEach(function (s) { s.classList.toggle('is-on', parseInt(s.getAttribute('data-step'), 10) === n); });
    stepEls.forEach(function (li, i) { li.classList.toggle('is-on', i + 1 === n); li.classList.toggle('is-done', i + 1 < n); });
    var chip = (state.mode === 'delivery' ? 'Delivery' : 'Pickup');
    $('modeChip').textContent = chip; $('modeChip2').textContent = chip;
    if (n === 2) paintItems();
    if (n === 3) { paintTime(); paintCart(); }
    if (n === 4) paintHand();
    paintBar();
    if (push) history.pushState({ step: n }, '', location.pathname + location.search);
    window.scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' });
    var h = screens[n - 1].querySelector('h1,h2'); if (h) { h.setAttribute('tabindex', '-1'); h.focus({ preventScroll: true }); }
    track('demo_step_view', { step: n, name: STEPS[n - 1], mode: state.mode });
  }
  window.addEventListener('popstate', function (e) {
    var n = e.state && e.state.step ? e.state.step : 1;
    go(n, false);
  });
  $('backBtn').addEventListener('click', function () {
    if (state.step > 1) history.back(); else location.href = '/';
  });

  renderItems();
  history.replaceState({ step: 1 }, '', location.pathname + location.search);
  go(1, false);
  track('demo_open', { referrer: document.referrer || '', preset: pre ? pre[1] : '' });

  if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost' || location.hostname === '127.0.0.1')) {
    window.addEventListener('load', function () { navigator.serviceWorker.register('/sw.js').catch(function () {}); });
  }
})();
