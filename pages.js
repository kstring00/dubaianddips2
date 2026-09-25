/* Dubai & Dips - behaviour for the inner pages (/menu, /catering, /visit,
   /blog). The header, footer, ordering buttons and sheet come from
   site.js, as on the homepage. Everything here is progressive: without it
   every page still reads, links and submits nothing it shouldn't.
   Motion is transform/opacity only, paused off screen, and skipped under
   prefers-reduced-motion. */
(function () {
  'use strict';
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var CFG = window.DD_CONFIG || {};
  var IO = 'IntersectionObserver' in window;
  var emit = function (n, p) { if (window.DD && window.DD.track) window.DD.track(n, p); };

  /* ---- reveals: once, as each block comes into view ---- */
  var rv = [].slice.call(document.querySelectorAll('.rv'));
  if (reduce || !IO) rv.forEach(function (el) { el.classList.add('is-in'); });
  else {
    var rio = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('is-in'); rio.unobserve(e.target); } });
    }, { rootMargin: '0px 0px -8% 0px', threshold: .08 });
    rv.forEach(function (el) { rio.observe(el); });
  }

  /* ---- /menu: the route tabs follow the page, the ink slides under the
     active one, and the row scrolls it into view ---- */
  var tabs = document.querySelector('.mtabs');
  if (tabs && IO) {
    var links = [].slice.call(tabs.querySelectorAll('[data-tab]'));
    var ink = tabs.querySelector('.mtabs__ink'), strip = tabs.querySelector('.mtabs__in');
    var secs = links.map(function (a) { return document.getElementById(a.getAttribute('href').slice(1)); });
    var current = null;
    function activate(i) {
      if (current === i) return;
      current = i;
      links.forEach(function (a, k) { a.classList.toggle('is-active', k === i); if (k === i) a.setAttribute('aria-current', 'location'); else a.removeAttribute('aria-current'); });
      var a = links[i];
      if (ink) ink.style.transform = 'translate3d(' + a.offsetLeft + 'px,0,0) scaleX(' + (a.offsetWidth / 100) + ')';
      var target = a.offsetLeft - (strip.clientWidth - a.offsetWidth) / 2;
      if (strip.scrollTo) strip.scrollTo({ left: target, behavior: reduce ? 'auto' : 'smooth' });
    }
    var sio = new IntersectionObserver(function () {
      /* the active route is the last one whose top has passed the tabs */
      var line = tabs.getBoundingClientRect().bottom + 24, pick = 0;
      secs.forEach(function (s, k) { if (s && s.getBoundingClientRect().top <= line) pick = k; });
      activate(pick);
    }, { rootMargin: '-30% 0px -60% 0px', threshold: [0, .01, 1] });
    secs.forEach(function (s) { if (s) sio.observe(s); });
    window.addEventListener('resize', function () { var c = current; current = null; if (c != null) activate(c); });
    activate(0);
  }

  /* ---- live open / closed, from the one clock in /hours.js ---- */
  var H = window.DD_HOURS;
  var lives = [].slice.call(document.querySelectorAll('[data-live]'));
  if (H && lives.length) {
    var clocks = lives.map(function (el) {
      var hrs = CFG.HOURS, sp = CFG.SPECIAL_HOURS;
      try { hrs = JSON.parse(el.getAttribute('data-hours')) || hrs; sp = JSON.parse(el.getAttribute('data-special')) || sp; } catch (e) {}
      return H.create({ hours: hrs, special: sp, tz: CFG.SHOP && CFG.SHOP.timezone, soon: CFG.CLOSING_SOON_MINUTES });
    });
    var count = document.querySelector('[data-live-count]');
    var rows = [].slice.call(document.querySelectorAll('.htable tr'));
    (function tick() {
      lives.forEach(function (el, i) {
        var st = clocks[i].state();
        el.setAttribute('data-state', st.mode);
        el.querySelector('.live__text').textContent = st.open
          ? (st.soon ? 'Final call' : 'Open now') + ' · closes ' + st.closeText
          : 'Closed · opens ' + (st.openText || 'soon');
        if (i === 0) {
          if (count) count.textContent = st.open ? 'Closes in ' + H.durText(st.closesIn) : st.opensIn != null ? 'Opens in ' + H.durText(st.opensIn) : '';
          rows.forEach(function (tr) {
            var f = +tr.getAttribute('data-from'), t = +tr.getAttribute('data-to'), d = st.weekday;
            var on = f <= t ? d >= f && d <= t : d >= f || d <= t;
            tr.classList.toggle('is-today', on);
          });
        }
      });
      setTimeout(tick, 60000 - (Date.now() % 60000) + 40);
    })();
  }

  /* ---- the map: Google's embed loads only as it nears the screen ---- */
  var map = document.querySelector('.lmap[data-map]');
  if (map) {
    var load = function () {
      if (map.querySelector('iframe')) return;
      var f = document.createElement('iframe');
      f.src = map.getAttribute('data-map');
      f.title = 'Map of ' + ((map.querySelector('.lmap__facade span') || {}).textContent || 'the shop');
      f.loading = 'lazy';
      f.referrerPolicy = 'no-referrer-when-downgrade';
      f.addEventListener('load', function () { map.classList.add('is-live'); });
      map.insertBefore(f, map.firstChild.nextSibling);
    };
    if (IO) { var mio = new IntersectionObserver(function (es) { if (es[0].isIntersecting) { load(); mio.disconnect(); } }, { rootMargin: '400px 0px' }); mio.observe(map); }
    else load();
  }

  /* ---- /catering: the request form. It never fakes a send: with no
     endpoint configured it says so and offers the phone. ---- */
  var form = document.getElementById('cateringForm');
  if (form) {
    var status = document.getElementById('bformStatus'), errBox = document.getElementById('bformErrors');
    var send = form.querySelector('.bform__send');
    var phone = CFG.PHONE || {};
    var date = form.querySelector('#cDate');
    /* earliest date: today in the shop's timezone */
    try { var n = H && H.localNow(CFG.SHOP && CFG.SHOP.timezone); if (n) date.min = n.key; } catch (e) {}
    var rules = {
      date: function (v) { return !v ? 'Pick the date of your order.' : date.min && v < date.min ? 'Pick a date from today on.' : ''; },
      time: function (v) { return v ? '' : 'Pick a pickup or delivery time.'; },
      headcount: function (v) { return !v ? 'How many people are you ordering for?' : !/^\d+$/.test(v) || +v < 1 ? 'Enter the number of people, like 25.' : ''; },
      name: function (v) { return v.trim() ? '' : 'Tell us who the order is for.'; },
      phone: function (v) { return (v.replace(/\D/g, '').length >= 10) ? '' : 'Enter a phone number we can call, with area code.'; },
      email: function (v) { return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim()) ? '' : 'Enter an email address like name@company.com.'; }
    };
    function check(input) {
      var rule = rules[input.name]; if (!rule) return '';
      var msg = rule(input.value || '');
      var err = document.getElementById(input.id + '-err');
      input.setAttribute('aria-invalid', msg ? 'true' : 'false');
      if (msg) input.setAttribute('aria-describedby', input.id + '-err'); else input.removeAttribute('aria-describedby');
      if (err) err.textContent = msg;
      return msg;
    }
    [].forEach.call(form.querySelectorAll('input[name]'), function (i) {
      if (!rules[i.name]) return;
      i.addEventListener('blur', function () { if (i.value) check(i); });
      i.addEventListener('input', function () { if (i.getAttribute('aria-invalid') === 'true') check(i); });
    });
    function data() {
      var d = {};
      ['date', 'time', 'headcount', 'name', 'phone', 'email', 'notes'].forEach(function (k) { var el = form.elements[k]; d[k] = el ? el.value.trim() : ''; });
      d.interests = [].map.call(form.querySelectorAll('input[name=interests]:checked'), function (c) { return c.value; });
      d.page = location.pathname; d.sentAt = new Date().toISOString();
      return d;
    }
    function done(d) {
      var esc = function (s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); };
      form.innerHTML = '<div class="bform__head" aria-hidden="true"><span>D&amp;D Airlines</span><span>Request received</span></div>' +
        '<div class="bform__done" tabindex="-1"><h3>You&rsquo;re on the list.</h3><p>Your request reached us. We will contact ' + esc(d.name) + ' at ' + esc(d.phone) + ' to confirm the details.</p>' +
        '<dl><div><dt>Date</dt><dd>' + esc(d.date) + '</dd></div><div><dt>Time</dt><dd>' + esc(d.time) + '</dd></div><div><dt>Passengers</dt><dd>' + esc(d.headcount) + '</dd></div></dl></div>';
      var box = form.querySelector('.bform__done'); box.focus();
    }
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var bad = [];
      [].forEach.call(form.querySelectorAll('input[name]'), function (i) { var m = check(i); if (m) bad.push([i, m]); });
      if (bad.length) {
        errBox.hidden = false;
        errBox.innerHTML = '<strong>' + bad.length + (bad.length === 1 ? ' thing needs' : ' things need') + ' fixing:</strong><ul>' + bad.map(function (b) {
          return '<li><a href="#' + b[0].id + '">' + b[1] + '</a></li>';
        }).join('') + '</ul>';
        errBox.focus();
        status.textContent = '';
        return;
      }
      errBox.hidden = true;
      /* robots fill the hidden field; people never see it. Say nothing, send nothing. */
      var hp = form.elements.botcheck;
      if (hp && hp.value) { status.textContent = ''; return; }
      var key = (form.getAttribute('data-key') || '').trim();
      var endpoint = (form.getAttribute('data-endpoint') || '').trim() || (key ? 'https://api.web3forms.com/submit' : '');
      if (!endpoint) {
        status.innerHTML = 'Online requests are not switched on yet, so nothing was sent. Please call <a class="u" href="tel:' + (phone.tel || '') + '">' + (phone.display || 'the shop') + '</a> and we will take it by phone.';
        emit('catering_request', { sent: false, reason: 'no-endpoint' });
        return;
      }
      var d = data();
      /* Web3Forms wants access_key, and reads subject/from_name for the email */
      if (key) { d.access_key = key; d.subject = 'Catering request: ' + d.date + ' for ' + d.headcount; d.from_name = 'Dubai & Dips website'; d.botcheck = ''; }
      send.setAttribute('aria-busy', 'true');
      status.textContent = 'Sending your request…';
      fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' }, body: JSON.stringify(d) })
        .then(function (r) { return r.json().catch(function () { return {}; }).then(function (j) { return { ok: r.ok && j.success !== false, j: j }; }); })
        .then(function (res) {
          send.removeAttribute('aria-busy');
          if (!res.ok) throw new Error('send');
          emit('catering_request', { sent: true, headcount: +d.headcount });
          done(d);
        })
        .catch(function () {
          send.removeAttribute('aria-busy');
          status.innerHTML = 'That did not go through, and nothing was sent. Try again, or call <a class="u" href="tel:' + (phone.tel || '') + '">' + (phone.display || 'the shop') + '</a>.';
          emit('catering_request', { sent: false, reason: 'error' });
        });
    });
  }

  /* ---- /blog: the category filter ---- */
  var filter = document.querySelector('.bfilter');
  if (filter) {
    var cards = [].slice.call(document.querySelectorAll('.blogidx .pcard, .jgrid .jcard')), none = document.querySelector('.bfilter__none');
    filter.addEventListener('click', function (e) {
      var b = e.target.closest('button[data-filter]'); if (!b) return;
      var f = b.getAttribute('data-filter'), shown = 0;
      [].forEach.call(filter.querySelectorAll('button'), function (x) { x.setAttribute('aria-pressed', x === b ? 'true' : 'false'); });
      cards.forEach(function (c) { var on = f === '*' || c.getAttribute('data-cat') === f; c.hidden = !on; if (on) { shown++; c.classList.add('is-in'); } });
      if (none) none.hidden = shown > 0;
    });
  }

  /* ---- posts: reading progress and the contents rail ---- */
  var body = document.querySelector('.post__body');
  if (body) {
    var bar = document.querySelector('.ptrack span');
    var toc = [].slice.call(document.querySelectorAll('.ptoc a'));
    var heads = toc.map(function (a) { return document.getElementById(decodeURIComponent(a.getAttribute('href').slice(1))); });
    var raf = 0;
    function frame() {
      raf = 0;
      var r = body.getBoundingClientRect(), vh = window.innerHeight;
      var p = Math.min(1, Math.max(0, (vh * .35 - r.top) / Math.max(1, r.height - vh * .5)));
      if (bar && !reduce) bar.style.transform = 'scaleX(' + p.toFixed(4) + ')';
      var act = -1;
      heads.forEach(function (h, i) { if (h && h.getBoundingClientRect().top < vh * .3) act = i; });
      toc.forEach(function (a, i) { a.classList.toggle('is-active', i === act); });
    }
    window.addEventListener('scroll', function () { if (!raf) raf = requestAnimationFrame(frame); }, { passive: true });
    frame();
  }

  /* ---- the location page: walking in. The photo settles from a slight
     zoom while the copy rises, then the frame washes to Off-White and the
     gate pass takes over. Same shape as the homepage hero: a normalised
     progress value, transforms and opacity only, eased in a rAF loop. ---- */
  var vhero = document.getElementById('vhero');
  if (vhero && !reduce) {
    var vPhoto = vhero.querySelector('.vhero__photo'), vScrim = vhero.querySelector('.vhero__scrim'), vExit = vhero.querySelector('.vhero__exit'), vCopy = vhero.querySelector('.vhero__copy'), vHint = vhero.querySelector('.vhero__hint');
    var vcur = 0, vraf = 0;
    var vclamp = function (v, a, b) { return v < a ? a : v > b ? b : v; };
    var vease = function (t) { return 1 - Math.pow(1 - t, 3); };
    var vrng = function (p, a, b) { return vclamp((p - a) / (b - a), 0, 1); };
    function vtarget() { var travel = Math.max(1, vhero.offsetHeight - window.innerHeight); return vclamp(-vhero.getBoundingClientRect().top / travel, 0, 1); }
    function vapply(p) {
      var zoom = 1.14 - .14 * vease(vrng(p, 0, .7));
      vPhoto.style.transform = 'scale(' + zoom.toFixed(4) + ') translate3d(0,' + (-4 * vease(vrng(p, 0, 1))).toFixed(2) + '%,0)';
      vScrim.style.opacity = (.55 + .3 * vease(vrng(p, 0, .5))).toFixed(3);
      var out = vease(vrng(p, .72, .96));
      vCopy.style.transform = 'translate3d(0,' + (-28 * out).toFixed(1) + 'px,0)';
      vCopy.style.opacity = (1 - out).toFixed(3);
      vExit.style.opacity = (.82 * vease(vrng(p, .74, 1))).toFixed(3);
      if (vHint) vHint.style.opacity = (1 - vease(vrng(p, .02, .12))).toFixed(3);
    }
    function vtick() { vraf = 0; var t = vtarget(); vcur += (t - vcur) * .16; if (Math.abs(t - vcur) < .0005) vcur = t; vapply(vcur); if (vcur !== t) vraf = requestAnimationFrame(vtick); }
    function vwake() { if (!vraf) vraf = requestAnimationFrame(vtick); }
    window.addEventListener('scroll', vwake, { passive: true });
    window.addEventListener('resize', vwake, { passive: true });
    vcur = vtarget(); vapply(vcur);
  }

  /* ---- /gelato: the tabs ---- */
  var tabbar = document.querySelector('.gtabs__bar');
  var flapsDone = false;
  /* the flavor board: each row riffles in once, the first time it is shown */
  function settleFlaps() {
    if (flapsDone || reduce) return; flapsDone = true;
    var CH = ' ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789:-&./';
    [].forEach.call(document.querySelectorAll('.gflap'), function (row, r) {
      [].forEach.call(row.querySelectorAll('.flap'), function (cell, i) {
        var face = cell.firstElementChild, leaf = cell.lastElementChild, to = face.textContent.replace(' ', ' ');
        if (to === ' ') return;
        var b = CH.indexOf(to); if (b < 0) return;
        var seq = []; for (var k = 5; k > 0; k--) seq.push(CH.charAt((b - k + CH.length * 2) % CH.length)); seq.push(to);
        seq.forEach(function (ch, n) {
          setTimeout(function () {
            leaf.firstElementChild.textContent = face.textContent; face.textContent = ch;
            if (leaf.animate) leaf.animate([{ transform: 'rotateX(0deg)' }, { transform: 'rotateX(-90deg)' }], { duration: n === seq.length - 1 ? 150 : 80, easing: 'ease-in', fill: 'forwards' });
          }, 120 + r * 140 + i * 22 + n * 55);
        });
      });
    });
  }
  if (tabbar) {
    var tbs = [].slice.call(tabbar.querySelectorAll('[role=tab]')), tink = tabbar.querySelector('.gtabs__ink');
    var pick = function (i, focus) {
      tbs.forEach(function (b, k) {
        var on = k === i; b.setAttribute('aria-selected', on ? 'true' : 'false'); b.tabIndex = on ? 0 : -1;
        var panel = document.getElementById(b.getAttribute('aria-controls')); if (panel) panel.hidden = !on;
      });
      var b = tbs[i];
      if (tink) tink.style.transform = 'translate3d(' + b.offsetLeft + 'px,0,0) scaleX(' + (b.offsetWidth / 100) + ')';
      if (focus) b.focus();
      if (b.id === 'tabbtn-flavors') settleFlaps();
    };
    tbs.forEach(function (b, i) {
      b.addEventListener('click', function () { pick(i); });
      b.addEventListener('keydown', function (e) {
        var n = e.key === 'ArrowRight' ? i + 1 : e.key === 'ArrowLeft' ? i - 1 : e.key === 'Home' ? 0 : e.key === 'End' ? tbs.length - 1 : -1;
        if (n < 0) return; e.preventDefault(); pick((n + tbs.length) % tbs.length, true);
      });
    });
    var hashTab = -1;
    tbs.forEach(function (b, i) { if ('#' + b.getAttribute('aria-controls') === location.hash) hashTab = i; });
    pick(hashTab > -1 ? hashTab : 0);
    window.addEventListener('resize', function () { var on = 0; tbs.forEach(function (b, i) { if (b.getAttribute('aria-selected') === 'true') on = i; }); pick(on); }, { passive: true });
  }


})();
