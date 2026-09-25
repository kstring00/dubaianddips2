/* Dubai & Dips - the Connecting Flights map.
   A living route map on a <canvas>: Natural Earth land as a hint, a few
   hundred faint arcs between real airports drawn once, and the six D&D
   routes out of Houston with a glowing plane travelling each one, trailing
   a pistachio contrail that fades to Browned Sugar. Hover or focus a gate
   and its route brightens and its boarding-pass label appears; a click
   goes to the page.

   Everything heavy (d3-geo, topojson, the land file, the video) is fetched
   only when the section nears the screen. The loop runs only while the map
   is on screen and the tab is visible. Under prefers-reduced-motion the
   map is drawn once, every route in place, and nothing moves.
   Data: config/flights.js. */
(function () {
  'use strict';
  var root = document.getElementById('flights');
  var F = window.DD_FLIGHTS;
  if (!root || !F || !('IntersectionObserver' in window)) return;

  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var phone = window.matchMedia('(max-width: 899px)');
  var canvas = root.querySelector('.fl__canvas');
  var stage = root.querySelector('.fl__stage');
  /* the film that is showing at this width (the vertical crop on phones) */
  var video = [].filter.call(root.querySelectorAll('.fl__video'), function (v) { return getComputedStyle(v).display !== 'none'; })[0] || null;
  var label = root.querySelector('.fl__label');
  var cards = [].slice.call(root.querySelectorAll('.fl__card'));
  var ctx = canvas.getContext('2d');
  var dpr = Math.min(2, window.devicePixelRatio || 1);
  var W = 0, H = 0, proj, path, land, base, gates = [], flights = [], raf = 0, seen = false, ready = false, active = -1;
  var COL = { off: '252,251,249', mint: '196,222,204', sugar: '156,119,79', bark: '74,61,54' };

  /* ---- loading: the scripts and the land file, once, near view ---- */
  function script(src) {
    return new Promise(function (ok, no) {
      var s = document.createElement('script'); s.src = src; s.async = true; s.onload = ok; s.onerror = no; document.head.appendChild(s);
    });
  }
  var loading = null;
  function load() {
    if (loading) return loading;
    return (loading = script('/vendor/d3-array.min.js').then(function () { return script('/vendor/d3-geo.min.js'); })
      .then(function () { return script('/vendor/topojson-client.min.js'); })
      .then(function () { return fetch('/vendor/land-110m.json').then(function (r) { return r.json(); }); })
      .then(function (topo) { land = window.topojson.feature(topo, topo.objects.land); ready = true; layout(); }));
  }

  /* ---- geometry ---- */
  function arcPoints(a, b, n) {
    var ip = window.d3.geoInterpolate([a.lon, a.lat], [b.lon, b.lat]), out = [];
    for (var i = 0; i <= n; i++) out.push(ip(i / n));
    return out;
  }
  /* the frame: the whole world on a desktop, the Houston to Middle East
     band on a phone */
  function frame() {
    return phone.matches
      ? { type: 'Polygon', coordinates: [[[-108, 8], [-108, 64], [64, 64], [64, 8], [-108, 8]]] }
      : { type: 'Sphere' };
  }
  function layout() {
    if (!ready) return;
    var r = stage.getBoundingClientRect();
    W = Math.max(1, Math.round(r.width)); H = Math.max(1, Math.round(r.height));
    canvas.width = W * dpr; canvas.height = H * dpr;
    canvas.style.width = W + 'px'; canvas.style.height = H + 'px';
    proj = window.d3.geoNaturalEarth1().rotate([30, 0]);
    proj.fitExtent([[phone.matches ? 0 : 8, 8], [W - (phone.matches ? 0 : 8), H - 8]], frame());
    path = window.d3.geoPath(proj);
    gates = F.gates.map(function (g) { var p = proj([g.lon, g.lat]); return { g: g, x: p[0], y: p[1], pts: arcPoints(F.origin, g, 96) }; });
    drawBase();
    positionCards();
    if (reduce) drawStatic(); else if (!raf && seen) start();
  }
  function positionCards() {
    /* the HTML gate dots sit on the projected airports so they can be
       tabbed to and clicked */
    root.querySelectorAll('.fl__gate').forEach(function (b) {
      var i = +b.getAttribute('data-gate'), g = gates[i]; if (!g) return;
      b.style.transform = 'translate3d(' + g.x.toFixed(1) + 'px,' + g.y.toFixed(1) + 'px,0)';
      b.hidden = g.x < -4 || g.x > W + 4 || g.y < -4 || g.y > H + 4;
    });
    var o = proj([F.origin.lon, F.origin.lat]);
    var ob = root.querySelector('.fl__origin'); if (ob) ob.style.transform = 'translate3d(' + o[0].toFixed(1) + 'px,' + o[1].toFixed(1) + 'px,0)';
  }

  /* ---- the base layer, drawn once: land as a hint, the world's routes ---- */
  function seeded(seed) { return function () { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; }; }
  function drawBase() {
    base = document.createElement('canvas'); base.width = W * dpr; base.height = H * dpr;
    var c = base.getContext('2d'); c.scale(dpr, dpr);
    var lp = window.d3.geoPath(proj, c);
    c.beginPath(); lp(land); c.fillStyle = 'rgba(' + COL.off + ',.045)'; c.fill();
    /* airports weighted by hub size, pairs drawn from a fixed seed so the
       texture is the same on every visit */
    var pool = [];
    F.airports.forEach(function (a) { for (var k = 0; k < a[3]; k++) pool.push(a); });
    var rnd = seeded(20260924), want = phone.matches ? F.network.phone : F.network.desktop, drawn = {}, n = 0, tries = 0;
    var ip = window.d3.geoInterpolate, dist = window.d3.geoDistance;
    c.lineWidth = .7; c.strokeStyle = 'rgba(' + COL.off + ',.085)'; c.lineCap = 'round';
    while (n < want && tries++ < want * 20) {
      var a = pool[Math.floor(rnd() * pool.length)], b = pool[Math.floor(rnd() * pool.length)];
      if (a === b) continue;
      var key = a[0] < b[0] ? a[0] + b[0] : b[0] + a[0];
      if (drawn[key]) continue;
      var d = dist([a[1], a[2]], [b[1], b[2]]);
      if (d > 2.4 || (d > 1.6 && rnd() < .6)) continue;      /* mostly regional, some long haul */
      drawn[key] = 1; n++;
      var f = ip([a[1], a[2]], [b[1], b[2]]), line = [];
      for (var i = 0; i <= 40; i++) line.push(f(i / 40));
      c.beginPath(); lp({ type: 'LineString', coordinates: line }); c.stroke();
    }
    /* the airports themselves, faint */
    c.fillStyle = 'rgba(' + COL.off + ',.16)';
    F.airports.forEach(function (a) { var p = proj([a[1], a[2]]); if (!p) return; c.beginPath(); c.arc(p[0], p[1], .9, 0, 6.283); c.fill(); });
  }

  /* ---- the D&D routes ---- */
  function routePath(c, pts) { c.beginPath(); window.d3.geoPath(proj, c)({ type: 'LineString', coordinates: pts }); }
  function drawRoute(c, gate, alpha, width) {
    c.lineWidth = width; c.strokeStyle = 'rgba(' + COL.off + ',' + alpha + ')'; c.lineCap = 'round';
    routePath(c, gate.pts); c.stroke();
  }
  function dot(c, x, y, r, rgb, a) { c.beginPath(); c.arc(x, y, r, 0, 6.283); c.fillStyle = 'rgba(' + rgb + ',' + a + ')'; c.fill(); }
  function drawGates(c) {
    var o = proj([F.origin.lon, F.origin.lat]);
    dot(c, o[0], o[1], 8, COL.mint, .12); dot(c, o[0], o[1], 3.2, COL.mint, .95);
    gates.forEach(function (g, i) {
      var on = i === active;
      dot(c, g.x, g.y, on ? 9 : 6, COL.sugar, on ? .28 : .14);
      dot(c, g.x, g.y, on ? 3.4 : 2.6, on ? COL.mint : COL.sugar, .95);
    });
  }
  /* a flight at progress t: the plane, then the contrail behind it */
  function drawFlight(c, gate, t, on) {
    var pts = gate.pts, n = pts.length - 1, head = t * n, tail = Math.max(0, head - n * .28);
    var prev = null;
    for (var k = Math.floor(tail); k <= Math.floor(head); k++) {
      var u = (k - tail) / Math.max(1, head - tail);           /* 0 at the tail, 1 at the plane */
      var p = proj(pts[Math.min(n, k)]); if (!p) { prev = null; continue; }
      if (prev && Math.abs(p[0] - prev[0]) < W * .5) {
        var mix = Math.pow(u, 1.4);
        var r = Math.round(156 + (196 - 156) * mix), g = Math.round(119 + (222 - 119) * mix), b = Math.round(79 + (204 - 79) * mix);
        c.strokeStyle = 'rgba(' + r + ',' + g + ',' + b + ',' + (.06 + .8 * mix) * (on ? 1 : .85) + ')';
        c.lineWidth = .8 + 2.2 * mix;
        c.beginPath(); c.moveTo(prev[0], prev[1]); c.lineTo(p[0], p[1]); c.stroke();
      }
      prev = p;
    }
    var hp = proj(pts[Math.min(n, Math.floor(head))]);
    if (hp) { dot(c, hp[0], hp[1], 9, COL.mint, .16); dot(c, hp[0], hp[1], 4.2, COL.mint, .55); dot(c, hp[0], hp[1], 2, COL.off, 1); }
  }

  var t0 = 0;
  function frameDraw(now) {
    raf = 0;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);
    ctx.drawImage(base, 0, 0, W, H);
    gates.forEach(function (g, i) { drawRoute(ctx, g, i === active ? .55 : .14, i === active ? 1.4 : .9); });
    var T = (now - t0) / 1000, per = F.flight.seconds, gap = F.flight.gapSeconds, cycle = gap * gates.length + per;
    gates.forEach(function (g, i) {
      var local = ((T - i * gap) % cycle + cycle) % cycle;      /* each flight leaves gap seconds after the last */
      if (T >= i * gap && local < per) drawFlight(ctx, g, easeOut(local / per), i === active);
    });
    drawGates(ctx);
    if (seen && !document.hidden) raf = requestAnimationFrame(frameDraw);
  }
  function easeOut(t) { return 1 - Math.pow(1 - t, 1.6); }
  function start() { if (!ready || raf || reduce) return; if (!t0) t0 = performance.now(); raf = requestAnimationFrame(frameDraw); }
  function stop() { if (raf) cancelAnimationFrame(raf); raf = 0; }
  function drawStatic() {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);
    ctx.drawImage(base, 0, 0, W, H);
    gates.forEach(function (g, i) { drawRoute(ctx, g, i === active ? .6 : .3, i === active ? 1.6 : 1.1); });
    drawGates(ctx);
  }

  /* ---- the gates: hover, focus, click ---- */
  function setActive(i) {
    if (i === active) return;
    active = i;
    root.querySelectorAll('.fl__gate').forEach(function (b, k) { b.classList.toggle('is-on', k === i); });
    cards.forEach(function (c, k) { c.classList.toggle('is-on', k === i); });
    if (i < 0) { label.hidden = true; }
    else {
      var g = gates[i];
      label.hidden = false;
      label.querySelector('.fl__lcode').textContent = g.g.code;
      label.querySelector('.fl__lcity').textContent = g.g.city;
      label.querySelector('.fl__lpage').textContent = g.g.page;
      label.querySelector('.fl__lflight').textContent = g.g.flight;
      var left = g.x > W * .62;
      label.style.transform = 'translate3d(' + (left ? g.x - 14 : g.x + 14).toFixed(0) + 'px,' + (g.y - 12).toFixed(0) + 'px,0)' + (left ? ' translateX(-100%)' : '');
    }
    if (reduce && ready) drawStatic();
  }
  root.querySelectorAll('.fl__gate').forEach(function (b) {
    var i = +b.getAttribute('data-gate');
    b.addEventListener('mouseenter', function () { setActive(i); });
    b.addEventListener('focus', function () { setActive(i); });
    b.addEventListener('mouseleave', function () { setActive(-1); });
    b.addEventListener('blur', function () { setActive(-1); });
  });
  cards.forEach(function (c, i) {
    c.addEventListener('mouseenter', function () { setActive(i); });
    c.addEventListener('focusin', function () { setActive(i); });
    c.addEventListener('mouseleave', function () { setActive(-1); });
    c.addEventListener('focusout', function () { setActive(-1); });
  });

  /* ---- the opening: the contrail film, then the map ---- */
  var played = false;
  function opening() {
    if (played) return; played = true;
    if (!video || reduce) { root.classList.add('is-map'); return; }
    var srcs = video.querySelectorAll('source[data-src]');
    srcs.forEach(function (s) { s.src = s.getAttribute('data-src'); });
    video.load();
    var done = false;
    function toMap() {
      if (done) return; done = true;
      root.classList.add('is-map');
      t0 = performance.now() - 400;                   /* the first flight is already leaving as the film fades */
      start();
      setTimeout(function () { try { video.pause(); } catch (e) {} video.removeAttribute('src'); }, 1200);
    }
    video.addEventListener('ended', toMap);
    video.addEventListener('timeupdate', function () { if (video.duration && video.currentTime > video.duration - .5) toMap(); });
    video.addEventListener('error', toMap);
    /* a missing file reports on the last <source>, not the video */
    if (srcs.length) srcs[srcs.length - 1].addEventListener('error', toMap);
    var p = video.play();
    if (p && p.catch) p.catch(toMap);
    setTimeout(function () { if (video.readyState < 2) toMap(); }, 2500);   /* nothing to show yet: go straight to the map */
    setTimeout(toMap, 8000);                          /* never wait on a stalled film */
  }

  /* ---- on screen or not ---- */
  new IntersectionObserver(function (es) {
    var e = es[es.length - 1];
    if (e.isIntersecting) { load().then(function () { opening(); }); }
  }, { rootMargin: '600px 0px' }).observe(root);
  new IntersectionObserver(function (es) {
    seen = es[es.length - 1].isIntersecting;
    if (seen && root.classList.contains('is-map')) start(); else stop();
  }, { threshold: .05 }).observe(stage);
  document.addEventListener('visibilitychange', function () { if (document.hidden) stop(); else if (seen && root.classList.contains('is-map')) start(); });
  var rt = 0;
  window.addEventListener('resize', function () { clearTimeout(rt); rt = setTimeout(function () { stop(); layout(); }, 160); }, { passive: true });
})();
