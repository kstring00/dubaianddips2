/* Dubai & Dips. One script for the whole page.
   Three scroll-driven pieces share one idea: a normalized progress value
   drives everything, DOM writes happen only when a value changes, and a rAF
   loop eases toward the scroll target and stops when it settles. */
(function () {
  'use strict';

  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var phone = window.matchMedia('(max-width: 899px)');
  /* Everything about ordering comes from config/ordering.js; events go
     through track.js. Both are optional at runtime so the page still
     works if either script fails to arrive. */
  var CFG = window.DD_CONFIG || {};
  var COPY = CFG.COPY || {};
  var emit = (window.DD && window.DD.track) || function () {};

  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function range(p, a, b) { return clamp((p - a) / (b - a), 0, 1); }
  function easeInOut(t) { return t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; }
  function easeOut(t) { return 1 - Math.pow(1 - t, 3); }
  function scrollY() { return window.scrollY || window.pageYOffset || 0; }

  /* Write a style only when it changes. */
  function writer() {
    var cache = {};
    return function (el, prop, val) {
      if (!el) return;
      var key = (el.id || el.className) + '|' + prop;
      if (cache[key] === val) return;
      cache[key] = val;
      el.style[prop] = val;
    };
  }

  /* A rAF loop that eases `current` toward a target and calls apply().
     wake() is bound to scroll; the loop stops on its own once settled. */
  function loop(getTarget, apply, k) {
    var current = 0, target = 0, raf = 0;
    function tick() {
      raf = 0;
      target = getTarget();
      current += (target - current) * k;
      if (Math.abs(target - current) < .0004) current = target;
      apply(current);
      if (current !== target) raf = requestAnimationFrame(tick);
    }
    function wake() { if (!raf) raf = requestAnimationFrame(tick); }
    function reset() { current = target = getTarget(); apply(current); }
    return { wake: wake, reset: reset };
  }

  /* Scrub a video by scroll. One seek in flight at a time: while the
     decoder is busy the wanted time is parked and applied on `seeked`. */
  function scrubber(video, onReady) {
    var dur = 0, parked = -1, seekAt = 0;
    function seek(t) {
      if (!dur) return;
      t = clamp(t, 0, dur - .04);
      /* One seek in flight; a seek that never reports back is abandoned
         after 600ms so a stalled decoder cannot freeze the scrub. */
      if (video.seeking && performance.now() - seekAt < 600) { parked = t; return; }
      if (Math.abs(video.currentTime - t) < 1 / 48) return;
      seekAt = performance.now();
      try { video.currentTime = t; } catch (e) {}
    }
    video.addEventListener('loadedmetadata', function () {
      dur = isFinite(video.duration) && video.duration > 0 ? video.duration : 0;
      if (onReady) onReady(dur);
    });
    video.addEventListener('seeked', function () {
      if (parked >= 0) { var t = parked; parked = -1; seek(t); }
    });
    return { seek: seek, duration: function () { return dur; } };
  }

  /* Adds is-live once a section is on screen, which is what the reviews
     start-up sequence hangs its animation delays off. */
  function startup(el) {
    if (!el) return;
    if (!('IntersectionObserver' in window)) { el.classList.add('is-live'); return; }
    var io = new IntersectionObserver(function (entries) {
      if (entries.some(function (e) { return e.isIntersecting; })) { el.classList.add('is-live'); io.disconnect(); }
    }, { threshold: .12 });
    io.observe(el);
  }

  /* ----------------------------------------------------------- reveals */
  var rises = document.querySelectorAll('.rise');
  if ('IntersectionObserver' in window && !reduce) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); } });
    }, { threshold: .08 });
    rises.forEach(function (el) { io.observe(el); });
  } else {
    rises.forEach(function (el) { el.classList.add('is-in'); });
  }

  /* ------------------------------------------------------ form + year */
  var form = document.getElementById('contactForm'), thanks = document.getElementById('thanks');
  if (form) form.addEventListener('submit', function (e) {
    e.preventDefault();
    if (!form.reportValidity()) return;
    form.reset(); form.classList.add('is-sent'); thanks.classList.add('is-on');
  });
  var year = document.getElementById('year');
  if (year) year.textContent = new Date().getFullYear();

  /* ---------------------------------------------------------------- nav */
  var nav = document.getElementById('nav');
  var hero = document.getElementById('top');
  function navStuck() {
    var edge = hero ? hero.offsetHeight - window.innerHeight - 1 : 0;
    nav.classList.toggle('is-stuck', scrollY() > edge);
  }

  /* --------------------------------------------------------------- hero
     Beats, as a fraction of the hero's scroll travel:
       .00 to .03   the bar, the wordmark, nothing moves
       .03 to .64   the film: bar splits, room opens, sign lands
       .10 to .22   wordmark lifts out, before the frame brightens
       .56 to .70   the dark plate comes up, ahead of the copy
       .64 to .78   copy lands on it
       .84 to .94   nav fades in
       .85 to .93   copy leaves, before the cream exit touches it
       .90 to 1.0   exit gradient, the next section takes over */
  if (hero) {
    var film = document.getElementById('heroVideo');
    var set = writer();
    var open = document.getElementById('heroOpen');
    var hint = document.getElementById('heroHint');
    var land = document.getElementById('heroLand');
    var scrim = document.getElementById('heroScrim');
    var exit = document.getElementById('heroExit');
    var rule = document.getElementById('heroRule');
    var cta = document.getElementById('heroCta');
    var fades = [].slice.call(nav.querySelectorAll('.nav__fade'));
    var scrub = scrubber(film, function (dur) {
      if (reduce) scrub.seek(dur);
    });
    /* The film waits for the page: it is 2.5 MB and nothing above the fold
       depends on it (the poster is the first frame). It starts on load, or
       on the first scroll if that comes sooner, so the hero and the order
       button are painted long before a byte of video is requested. */
    var filmStarted = false;
    function startFilm() {
      if (filmStarted) return; filmStarted = true;
      film.src = film.getAttribute('data-src');
      film.preload = 'auto'; film.load();
    }
    function deferFilm() {
      if (document.readyState === 'complete') setTimeout(startFilm, 0);
      else window.addEventListener('load', function () { setTimeout(startFilm, 0); });
      window.addEventListener('scroll', startFilm, { once: true, passive: true });
    }
    function setNav(op) {
      for (var i = 0; i < fades.length; i++) {
        set(fades[i], 'opacity', op.toFixed(3));
        set(fades[i], 'pointerEvents', op > .6 ? 'auto' : 'none');
      }
    }
    /* If the film never arrives the poster stays and the copy still lands. */
    film.addEventListener('error', function () { film.removeAttribute('poster'); film.style.backgroundImage = 'url(/assets/hero-poster.webp)'; film.style.backgroundSize = 'cover'; }, true);

    var travel = 1;
    function layoutHero() { travel = Math.max(1, hero.offsetHeight - window.innerHeight); }

    function applyHero(p) {
      var d = scrub.duration();
      if (d) scrub.seek(easeInOut(range(p, .03, .64)) * d);

      var lift = easeInOut(range(p, .10, .22));
      set(open, 'opacity', (1 - lift).toFixed(3));
      set(open, 'transform', 'translate3d(0,' + (-28 * lift).toFixed(2) + 'px,0)');
      set(cta, 'pointerEvents', lift > .6 ? 'none' : 'auto');
      set(hint, 'opacity', (1 - easeInOut(range(p, .04, .14))).toFixed(3));

      /* The copy is cream and the film ends on a bright marble floor, so it
         only ever shows while the dark plate is under it. The plate leads
         the copy in, and the copy is gone before the cream exit washes the
         bottom of the frame - otherwise the exit, which is there to hand
         off to the menu, is what destroys the contrast. */
      var plateIn = easeOut(range(p, .56, .70));
      var plateOut = easeInOut(range(p, .90, .985));
      var plate = plateIn * (1 - plateOut);
      set(scrim, 'opacity', plate.toFixed(3));

      var in_ = easeOut(range(p, .64, .78));
      var out_ = easeInOut(range(p, .85, .93));
      var copy = in_ * (1 - out_);
      set(land, 'opacity', copy.toFixed(3));
      set(land, 'transform', 'translate3d(0,' + (40 * (1 - in_) + 20 * out_).toFixed(2) + 'px,0)');
      set(land, 'pointerEvents', copy > .7 ? 'auto' : 'none');
      set(exit, 'opacity', easeInOut(range(p, .90, 1)).toFixed(3));
      set(rule, 'width', (p * 100).toFixed(2) + '%');

      setNav(easeInOut(range(p, .84, .94)));
    }

    if (reduce) {
      /* Static close state: the room, the copy, the nav. The CSS already
         collapses the stage; the film seeks to its last frame on load. */
      deferFilm();
      setNav(1);
      window.addEventListener('scroll', navStuck, { passive: true });
      navStuck();
    } else {
      var heroLoop = loop(function () { return clamp(scrollY() / travel, 0, 1); }, applyHero, phone.matches ? .2 : .14);
      deferFilm();
      film.addEventListener('seeked', heroLoop.wake);
      film.addEventListener('loadedmetadata', heroLoop.wake);
      layoutHero(); heroLoop.reset(); navStuck();
      window.addEventListener('scroll', function () { heroLoop.wake(); navStuck(); }, { passive: true });
      window.addEventListener('resize', function () { layoutHero(); heroLoop.wake(); navStuck(); }, { passive: true });
    }
  }

  /* -------------------------------------------------------------- craft
     Same engine, second film. The film only loads once the section is a
     screen away. Stage copy lives in the HTML list; the panel mirrors it. */
  var craft = document.getElementById('craft');
  if (craft) {
    var cv = document.getElementById('craftVideo');
    var intro = document.getElementById('craftIntro');
    var panel = document.getElementById('craftPanel');
    var stepEl = document.getElementById('craftStep');
    var titleEl = document.getElementById('craftTitle');
    var copyEl = document.getElementById('craftCopy');
    var bar = document.getElementById('craftProgress');
    var stages = [].slice.call(document.querySelectorAll('#craftList li')).map(function (li) {
      return { at: parseFloat(li.getAttribute('data-at')), title: li.querySelector('h3').textContent, copy: li.querySelector('p').textContent };
    });
    var cset = writer();
    var cscrub = scrubber(cv, function (dur) { if (reduce) cscrub.seek(dur); });
    var loaded = false;
    /* the star loader in the stage goes once the film has a frame */
    function craftReady() { craft.classList.add('is-ready'); }
    cv.addEventListener('loadeddata', craftReady);
    cv.addEventListener('error', craftReady, true);
    function loadCraft() {
      if (loaded) return; loaded = true;
      cv.src = cv.getAttribute('data-src');
      cv.preload = 'auto'; cv.load();
    }
    if ('IntersectionObserver' in window) {
      var cio = new IntersectionObserver(function (entries) {
        if (entries.some(function (e) { return e.isIntersecting; })) { loadCraft(); cio.disconnect(); }
      }, { rootMargin: '100% 0px' });
      cio.observe(craft);
    } else loadCraft();

    var active = -1;
    function applyCraft(p) {
      var d = cscrub.duration();
      if (d) cscrub.seek(p * d);
      cset(bar, 'width', (p * 100).toFixed(2) + '%');
      var fade = 1 - range(p, .02, .12);
      cset(intro, 'opacity', fade.toFixed(3));
      cset(intro, 'transform', 'translate3d(0,' + (-24 * (1 - fade)).toFixed(2) + 'px,0)');
      var next = -1;
      for (var i = 0; i < stages.length; i++) if (p >= stages[i].at) next = i;
      if (next === active) return;
      active = next;
      if (next < 0) { panel.classList.remove('is-on'); return; }
      stepEl.textContent = String(next + 1).padStart(2, '0') + ' / ' + String(stages.length).padStart(2, '0');
      titleEl.textContent = stages[next].title;
      copyEl.textContent = stages[next].copy;
      panel.classList.add('is-on');
    }
    if (!reduce) {
      var craftLoop = loop(function () {
        var span = craft.offsetHeight - window.innerHeight;
        return span > 0 ? clamp(-craft.getBoundingClientRect().top / span, 0, 1) : 0;
      }, applyCraft, .16);
      cv.addEventListener('seeked', craftLoop.wake);
      cv.addEventListener('loadedmetadata', craftLoop.wake);
      craftLoop.reset();
      window.addEventListener('scroll', craftLoop.wake, { passive: true });
      window.addEventListener('resize', craftLoop.wake, { passive: true });
    }
  }

  /* ------------------------------------------------------- departures
     The menu as a departures board, built from /menu-board.json so the
     menu can be edited without touching code. Each row is an accordion
     (one open at a time) under its own h3. The status tiles are split-flaps:
     when the board first scrolls into view they flip and settle row by
     row, top to bottom, in about 1.2s - once per page load, never again,
     and not at all under reduced motion. The tiles are aria-hidden; screen
     readers get the status as text. */
  var board = document.getElementById('board');
  var boardRows = document.getElementById('boardRows');
  if (board && boardRows) {
    var CHARS = ' ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    var WIDTH = 12;       /* tiles per status, the length of NOW BOARDING */
    var STEP = 55;        /* ms per flap in a riffle */
    var STATUS = {
      'on-time': 'ON TIME', 'now-boarding': 'NOW BOARDING',
      'seasonal': 'SEASONAL', 'sold-out': 'SOLD OUT'
    };
    var SPOKEN = { 'on-time': 'On time', 'now-boarding': 'Now boarding', 'seasonal': 'Seasonal', 'sold-out': 'Sold out' };

    var jobs = [], flapRaf = 0, audio = null, soundOn = false;

    function tick() {
      if (!soundOn) return;
      try {
        if (!audio) audio = new (window.AudioContext || window.webkitAudioContext)();
        var t = audio.currentTime;
        var o = audio.createOscillator(), g = audio.createGain();
        o.type = 'square'; o.frequency.setValueAtTime(2100, t);
        g.gain.setValueAtTime(.05, t);
        g.gain.exponentialRampToValueAtTime(.0008, t + .035);
        o.connect(g); g.connect(audio.destination); o.start(t); o.stop(t + .04);
      } catch (e) { soundOn = false; }
    }

    function paint(cell, ch, last) {
      var face = cell.firstElementChild, leaf = cell.lastElementChild;
      leaf.firstElementChild.textContent = face.textContent;
      face.textContent = ch;
      if (leaf.animate) {
        leaf.animate([{ transform: 'rotateX(0deg)' }, { transform: 'rotateX(-90deg)' }],
          { duration: last ? 150 : 80, easing: last ? 'cubic-bezier(.22,1,.36,1)' : 'ease-in', fill: 'forwards' });
      }
      if (last) tick();
    }
    function runJobs(now) {
      flapRaf = 0;
      var alive = false;
      for (var i = 0; i < jobs.length; i++) {
        var j = jobs[i];
        if (j.done) continue;
        var idx = Math.floor((now - j.start) / STEP);
        if (idx < 0) { alive = true; continue; }
        /* a dropped frame can jump past the end: always land the last letter */
        if (idx >= j.seq.length) { if (j.at !== j.seq.length - 1) paint(j.cell, j.seq[j.seq.length - 1], true); j.done = true; continue; }
        if (idx !== j.at) { j.at = idx; paint(j.cell, j.seq[idx], idx === j.seq.length - 1); }
        alive = true;
      }
      if (alive) flapRaf = requestAnimationFrame(runJobs);
      else jobs = [];
    }
    /* A short riffle ending on the wanted letter. */
    function sequence(to, steps) {
      var b = CHARS.indexOf(to), out = [];
      if (b < 0) b = 0;
      for (var k = steps; k > 0; k--) out.push(CHARS[(b - k + CHARS.length * 2) % CHARS.length]);
      out.push(to);
      return out;
    }
    function pad(text) { text = String(text).toUpperCase().slice(0, WIDTH); return text + Array(WIDTH - text.length + 1).join(' '); }

    /* Set a row's tiles: at once, or as a riffle starting after `delay`. */
    function flapTo(el, text, delay) {
      var cells = el.children, want = pad(text), now = performance.now();
      for (var i = 0; i < cells.length; i++) {
        var ch = want.charAt(i);
        if (delay < 0) { cells[i].firstElementChild.textContent = ch; continue; }
        if (ch === ' ') continue;
        jobs.push({ cell: cells[i], seq: sequence(ch, phone.matches ? 4 : 6), start: now + delay + i * (phone.matches ? 14 : 18), at: -1, done: false });
      }
      if (delay >= 0 && !flapRaf && jobs.length) flapRaf = requestAnimationFrame(runJobs);
    }

    function esc(v) {
      return String(v == null ? '' : v).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    }
    function price(p) { return typeof p === 'number' && p > 0 ? money(p) : ''; }
    function tiles(status) {
      var word = STATUS[status] || STATUS['on-time'], html = '';
      for (var i = 0; i < WIDTH; i++) {
        html += '<span class="flap' + (i >= word.length ? ' flap--pad' : '') + '"><span class="flap__ch"> </span><span class="flap__leaf"><span> </span></span></span>';
      }
      return html;
    }
    function rowHtml(r) {
      var slug = esc(r.slug), status = STATUS[r.status] ? r.status : 'on-time';
      var items = r.items || [];
      var names = items.slice(0, 3).map(function (it) { return esc(it.name); }).join(' &middot; ');
      var sub = names || esc(r.description);
      var list = items.length
        ? '<ul class="bitems">' + items.map(function (it) {
            var p = price(it.price);
            return '<li class="bitem"><span>' + esc(it.name) + '</span>' + (p ? '<span class="bitem__price">' + p + '</span>' : '') + '</li>';
          }).join('') + '</ul>'
        : '<p class="bpanel__soon">The full list is on the boards in the shop.</p>';
      var order = status === 'sold-out'
        ? '<p class="bpanel__soon">Sold out for today.</p>'
        : '<p class="bpanel__order"><a class="btn btn--primary btn--sm" href="#order" data-order="pickup" data-place="category" data-category="' + esc(r.category) + '" aria-label="Order for pickup: ' + esc(r.category) + '">Order</a></p>';
      return '<li class="brow" data-slug="' + slug + '" data-status="' + status + '">' +
        '<h3 class="brow__h"><button class="brow__btn" type="button" id="brow-' + slug + '" aria-expanded="false" aria-controls="bpanel-' + slug + '">' +
          '<span class="brow__cell brow__flight">' + esc(r.flight) + '</span>' +
          '<span class="brow__cell brow__dest"><span class="brow__code">' + esc(r.code) + '</span>' + esc(r.destination) + '</span>' +
          '<span class="brow__cell brow__on"><span class="brow__cat">' + esc(r.category) + '</span><span class="brow__items">' + sub + '</span>' +
            '<span class="brow__fold" aria-hidden="true"><span><b>' + esc(r.code) + '</b>' + esc(r.destination) + '</span><span><i>Gate</i><b>' + esc(r.gate) + '</b></span></span></span>' +
          '<span class="brow__cell brow__gate"><span class="vh">Gate </span>' + esc(r.gate) + '</span>' +
          '<span class="brow__cell brow__status"><span class="flaps" aria-hidden="true">' + tiles(status) + '</span><span class="vh">, ' + SPOKEN[status] + '</span></span>' +
        '</button></h3>' +
        '<div class="bpanel" id="bpanel-' + slug + '" role="region" aria-labelledby="brow-' + slug + '" hidden><div class="bpanel__in">' +
          (r.description ? '<p class="bpanel__desc">' + esc(r.description) + '</p>' : '') + list + order +
        '</div></div></li>';
    }

    var rows = [], btns = [], openRow = null;

    function setRow(row, on) {
      var btn = row.querySelector('.brow__btn'), panel = row.querySelector('.bpanel');
      row.classList.toggle('is-open', on);
      btn.setAttribute('aria-expanded', on ? 'true' : 'false');
      panel.hidden = !on;
      if (on && !reduce && panel.animate) {
        panel.firstElementChild.animate([{ opacity: 0, transform: 'translateY(-6px)' }, { opacity: 1, transform: 'none' }],
          { duration: 260, easing: 'cubic-bezier(.16,1,.3,1)' });
      }
    }
    function openBoardRow(row, focusIt) {
      if (openRow === row) { setRow(row, false); openRow = null; return; }
      if (openRow) setRow(openRow, false);
      setRow(row, true);
      openRow = row;
      if (focusIt) row.querySelector('.brow__btn').focus();
    }
    function rowFor(slug) {
      for (var i = 0; i < rows.length; i++) if (rows[i].getAttribute('data-slug') === slug) return rows[i];
      return null;
    }

    /* The settle: every row's status riffles in, one row after the next. */
    var settled = false;
    function settle(animate) {
      if (settled) return;
      settled = true;
      var stagger = phone.matches ? 50 : 60;
      rows.forEach(function (row, i) {
        flapTo(row.querySelector('.flaps'), STATUS[row.getAttribute('data-status')], animate ? i * stagger : -1);
      });
    }

    function build(data) {
      boardRows.innerHTML = (data.rows || []).map(rowHtml).join('');
      rows = [].slice.call(boardRows.querySelectorAll('.brow'));
      btns = rows.map(function (r) { return r.querySelector('.brow__btn'); });
      btns.forEach(function (b, i) { b.addEventListener('click', function () { openBoardRow(rows[i], false); }); });
      if (window.DD && window.DD.wireOrder) window.DD.wireOrder(boardRows);

      if (reduce || !('IntersectionObserver' in window)) settle(false);
      else {
        var sio = new IntersectionObserver(function (es) {
          if (es.some(function (e) { return e.isIntersecting; })) { settle(true); sio.disconnect(); }
        }, { threshold: .2 });
        sio.observe(boardRows);
      }

      var deep = /^\/menu\/([a-z0-9-]+)\/?$/.exec(location.pathname);
      if (deep) {
        var dr = rowFor(deep[1]);
        if (dr) {
          settle(false);
          openBoardRow(dr, false);
          requestAnimationFrame(function () { board.scrollIntoView({ block: 'center' }); dr.querySelector('.brow__btn').focus(); });
        }
      }
    }

    board.addEventListener('keydown', function (e) {
      var i = btns.indexOf(document.activeElement);
      if (e.key === 'Escape' && openRow) { setRow(openRow, false); openRow.querySelector('.brow__btn').focus(); openRow = null; e.preventDefault(); return; }
      if (i < 0) return;
      if (e.key === 'ArrowDown') { btns[Math.min(btns.length - 1, i + 1)].focus(); e.preventDefault(); }
      else if (e.key === 'ArrowUp') { btns[Math.max(0, i - 1)].focus(); e.preventDefault(); }
      else if (e.key === 'Home') { btns[0].focus(); e.preventDefault(); }
      else if (e.key === 'End') { btns[btns.length - 1].focus(); e.preventDefault(); }
    });

    var soundBtn = document.getElementById('boardSound');
    if (soundBtn) soundBtn.addEventListener('click', function () {
      soundOn = !soundOn;
      soundBtn.setAttribute('aria-pressed', soundOn ? 'true' : 'false');
      soundBtn.querySelector('i').textContent = soundOn ? 'on' : 'off';
      if (soundOn) tick();
    });

    /* A link anywhere on the page that names a category opens its row in
       place. Opened in a new tab it is a real URL, and the rewrite serves
       the page, which is what the deep-link branch in build() picks up. */
    document.addEventListener('click', function (e) {
      var link = e.target.closest ? e.target.closest('[data-sheet]') : null;
      if (!link || e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
      var row = rowFor(link.getAttribute('data-sheet'));
      if (!row) return;
      e.preventDefault();
      settle(false);
      board.scrollIntoView({ block: 'center', behavior: reduce ? 'auto' : 'smooth' });
      if (openRow !== row) openBoardRow(row, true);
    });

    fetch('/menu-board.json', { cache: 'no-cache' })
      .then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); })
      .then(build)
      .catch(function () {
        boardRows.innerHTML = '<li class="brow"><p class="board__foot">The board did not load. Refresh the page, or call the shop and we will read it to you.</p></li>';
      });
  }

  /* ---------------------------------------------------------- hours
     One source for the open/closed state, read in the shop's own
     timezone rather than the visitor's. These are still the placeholder
     hours from the markup; change them here and the nav and the footer
     both follow. Index is day of week, 0 = Sunday, [open, close] in
     24-hour local time. */
  var HOURS = CFG.HOURS || [[10, 22], [9, 22], [9, 22], [9, 22], [9, 22], [9, 24], [9, 24]];
  function shopClock() {
    try {
      var parts = new Intl.DateTimeFormat('en-US', {
        timeZone: (CFG.SHOP && CFG.SHOP.timezone) || 'America/Chicago', hour12: false, weekday: 'short', hour: '2-digit', minute: '2-digit'
      }).formatToParts(new Date());
      var o = {};
      parts.forEach(function (x) { o[x.type] = x.value; });
      var days = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
      var h = parseInt(o.hour, 10) % 24;
      return { d: days[o.weekday], m: h * 60 + parseInt(o.minute, 10) };
    } catch (e) {
      var n = new Date();
      return { d: n.getDay(), m: n.getHours() * 60 + n.getMinutes() };
    }
  }
  function clockLabel(h) {
    var ap = (h % 24) >= 12 ? 'pm' : 'am', hh = h % 12;   /* 24 is midnight: 12 am */
    return (hh || 12) + ' ' + ap;
  }
  function hoursState() {
    var t = shopClock(), today = HOURS[t.d];
    if (today && t.m >= today[0] * 60 && t.m < today[1] * 60) {
      return { open: true, text: 'Open until ' + clockLabel(today[1]) };
    }
    if (today && t.m < today[0] * 60) {
      return { open: false, text: 'Closed · opens ' + clockLabel(today[0]) };
    }
    for (var i = 1; i <= 7; i++) {
      var next = HOURS[(t.d + i) % 7];
      if (next) return { open: false, text: 'Closed · opens ' + (i === 1 ? 'tomorrow ' : '') + clockLabel(next[0]) };
    }
    return { open: false, text: 'Closed' };
  }
  (function () {
    var st = hoursState();
    var navHours = document.querySelector('.nav__hours');
    if (navHours) navHours.textContent = st.text;
    var footState = document.getElementById('footState');
    if (footState) { footState.textContent = st.text; footState.setAttribute('data-open', st.open ? 'yes' : 'no'); }
  })();

  /* ---------------------------------------------------------- ordering
     Toast is the ordering engine. Every element with data-order reads its
     destination from config: pickup, delivery and group each fall back to
     TOAST_ORDER_URL. With a URL, the click goes to Toast - same tab on a
     phone, a new tab on a desktop. Without one, the click opens the
     "goes live soon" sheet instead, so no button is ever dead. Every click
     is tracked with its mode and where on the page it came from. */
  function money(n) { return '$' + (Math.round(n * 100) / 100).toFixed(2).replace(/\.00$/, ''); }
  function orderUrl(mode) {
    var u = mode === 'delivery' ? (CFG.TOAST_DELIVERY_URL || CFG.TOAST_ORDER_URL)
      : mode === 'group' ? (CFG.TOAST_GROUP_URL || CFG.TOAST_ORDER_URL)
      : (CFG.TOAST_PICKUP_URL || CFG.TOAST_ORDER_URL);
    return (u || '').replace(/^\s+|\s+$/g, '');
  }
  function withMode(url, mode) {
    /* Our own pages get told which mode was chosen; Toast's URL is left alone. */
    if (url.charAt(0) !== '/' || mode === 'pickup') return url;
    return url + (url.indexOf('?') > -1 ? '&' : '?') + 'mode=' + mode;
  }
  function hoursRows() {
    return (CFG.HOURS_LABELS || []).map(function (h) {
      return '<tr><th>' + h.days + '</th><td>' + clockLabel(h.open).replace(' ', '') + ' to ' + clockLabel(h.close).replace(' ', '') + '</td></tr>';
    }).join('');
  }
  (function ordering() {
    var phoneCfg = CFG.PHONE || {};
    var copyEls = document.querySelectorAll('[data-copy]');
    for (var i = 0; i < copyEls.length; i++) {
      var key = copyEls[i].getAttribute('data-copy');
      if (COPY[key]) copyEls[i].textContent = COPY[key];
    }
    var tels = document.querySelectorAll('[data-tel]');
    for (var t = 0; t < tels.length; t++) {
      if (phoneCfg.tel) tels[t].setAttribute('href', 'tel:' + phoneCfg.tel);
      if (phoneCfg.display && !tels[t].hasAttribute('data-tel-label') && !tels[t].hasAttribute('data-copy')) tels[t].textContent = phoneCfg.display;
      if (tels[t].hasAttribute('data-tel-label') && phoneCfg.display) tels[t].textContent = (COPY.callCta || 'Call') + ' ' + phoneCfg.display;
    }
    var tables = document.querySelectorAll('[data-hours] tbody');
    for (var h = 0; h < tables.length; h++) if (CFG.HOURS_LABELS) tables[h].innerHTML = hoursRows();
    var list = document.querySelector('[data-hours-list]');
    if (list && CFG.HOURS_LABELS) list.innerHTML = CFG.HOURS_LABELS.map(function (x) {
      return '<li><span>' + x.days + '</span><span>' + clockLabel(x.open).replace(' ', '') + ' to ' + clockLabel(x.close).replace(' ', '') + '</span></li>';
    }).join('');

    /* the sheet */
    var sheet = document.getElementById('orderSheet');
    var lastFocus = null;
    function openSheet(from) {
      if (!sheet) return;
      lastFocus = document.activeElement;
      sheet.hidden = false;
      sheet.classList.add('is-open');
      document.body.classList.add('sheet-open');
      var card = sheet.querySelector('.sheet__card');
      if (card) card.focus();
      emit('order_sheet_open', { place: from });
    }
    function closeSheet() {
      if (!sheet || sheet.hidden) return;
      sheet.hidden = true;
      sheet.classList.remove('is-open');
      document.body.classList.remove('sheet-open');
      if (lastFocus && lastFocus.focus) lastFocus.focus();
    }
    if (sheet) {
      sheet.addEventListener('click', function (e) {
        if (e.target.closest && e.target.closest('[data-sheet-close]')) closeSheet();
      });
      document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeSheet(); });
    }

    /* the buttons. wireOrder is also called by the board, whose Order
       buttons arrive after the menu file loads. */
    function wireOrder(root) {
      var btns = root.querySelectorAll('[data-order]');
      for (var b = 0; b < btns.length; b++) {
        var mode = btns[b].getAttribute('data-order') || 'pickup';
        var url = orderUrl(mode);
        if (url) {
          btns[b].setAttribute('href', withMode(url, mode));
          if (phone.matches) { btns[b].removeAttribute('target'); btns[b].removeAttribute('rel'); }
          else { btns[b].setAttribute('target', '_blank'); btns[b].setAttribute('rel', 'noopener'); }
        } else {
          btns[b].setAttribute('href', '#order');
          btns[b].setAttribute('data-order-soon', '');
        }
      }
    }
    wireOrder(document);
    document.addEventListener('click', function (e) {
      var el = e.target.closest ? e.target.closest('[data-order],[data-call]') : null;
      if (!el) return;
      if (el.hasAttribute('data-call')) { emit('call_click', { place: el.getAttribute('data-call') }); return; }
      var mode = el.getAttribute('data-order') || 'pickup';
      var live = !!orderUrl(mode);
      emit('order_click', {
        mode: mode, place: el.getAttribute('data-place') || '',
        item: el.getAttribute('data-item') || '', category: el.getAttribute('data-category') || '',
        live: live, viewport: phone.matches ? 'phone' : 'desktop'
      });
      if (!live) { e.preventDefault(); openSheet(el.getAttribute('data-place') || ''); }
    });
    window.DD = window.DD || {};
    window.DD.openSheet = openSheet; window.DD.closeSheet = closeSheet; window.DD.orderUrl = orderUrl; window.DD.wireOrder = wireOrder;
  })();

  /* Installable: the service worker caches the shell and the posters, never
     a video and never anything off this origin (so never a Toast page). */
  if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost' || location.hostname === '127.0.0.1')) {
    window.addEventListener('load', function () {
      if (navigator.serviceWorker) navigator.serviceWorker.register('/sw.js').catch(function () {});
    });
  }

  /* ----------------------------------------------------------- footer
     The mailing box. The open state is the CSS default, so no JS, reduced
     motion, or landing at the bottom all render it open and static. The
     closed state is only armed when the footer is still below the fold on
     load, and any focus landing inside snaps it open at once - the content
     is never gated behind the animation. */
  var foot = document.getElementById('foot');
  if (foot) {
    var lid = foot.querySelector('.boxfoot__lid');
    var risers = [].slice.call(foot.querySelectorAll('[data-rise-foot]'));
    var opened = false, ticking = false;

    /* How much of the footer is showing, against the most it could ever
       show. The footer is the last element on the page, so on a tall
       screen the scroll runs out with it only part way up - measuring
       against the viewport alone would never reach the trigger. */
    function shown() {
      var r = foot.getBoundingClientRect();
      var vis = Math.min(r.bottom, window.innerHeight) - Math.max(r.top, 0);
      return vis / Math.max(1, Math.min(r.height, window.innerHeight));
    }

    /* Everything back to the CSS default, which is open. Used for the
       focus escape hatch and as the catch arm if the animation throws. */
    function snapOpen() {
      opened = true;
      foot.classList.remove('is-armed');
      lid.style.transform = ''; lid.style.opacity = '';
      risers.forEach(function (el) { el.style.opacity = ''; el.style.transform = ''; });
    }

    /* Time based, not scroll keyed. 344px of footer is all the travel
       there is on a desktop screen, and a scrub across that finishes the
       lid before the box has finished arriving - you never see it shut.
       Triggered once, on its own clock, the closed box gets its beat.
       Transform and opacity only, so it composites off the main thread. */
    function openBox() {
      if (opened) return;
      opened = true;
      try {
        lid.animate([
          { transform: 'rotateX(0deg)', opacity: 1, offset: 0 },
          { transform: 'rotateX(-11deg)', opacity: 1, offset: .24 },
          { transform: 'rotateX(-70deg)', opacity: .6, offset: .68 },
          { transform: 'rotateX(-108deg)', opacity: 0, offset: 1 }
        ], { duration: 820, easing: 'cubic-bezier(.33,0,.15,1)', fill: 'forwards' })
          .addEventListener('finish', function () { foot.classList.remove('is-armed'); });
        for (var i = 0; i < risers.length; i++) {
          risers[i].animate([
            { opacity: 0, transform: 'translate3d(0,26px,0)' },
            { opacity: 1, transform: 'none' }
          ], { duration: 560, delay: 300 + i * 90, easing: 'cubic-bezier(.2,.7,.2,1)', fill: 'both' });
        }
      } catch (e) { snapOpen(); }
    }

    function check() {
      if (opened || ticking) return;
      ticking = true;
      requestAnimationFrame(function () {
        ticking = false;
        if (!opened && shown() >= .72) openBox();
      });
    }

    /* The decision waits for load: a reload or a back button restores the
       scroll position after a deferred script runs, so checking too early
       would arm the box while the visitor is already looking at it and
       slam the lid shut in front of them. Until then the CSS default
       leaves it open, which is invisible while the footer is off screen.
       No WAAPI, or reduced motion, and it is never armed at all. */
    function armFooter() {
      if (reduce || !lid || !lid.animate) return;
      if (shown() > .12) return;                  /* already in frame: leave it open */
      foot.classList.add('is-armed');
      window.addEventListener('scroll', check, { passive: true });
      window.addEventListener('resize', check, { passive: true });
      foot.addEventListener('focusin', snapOpen);
      check();
    }
    if (document.readyState === 'complete') requestAnimationFrame(armFooter);
    else window.addEventListener('load', function () { requestAnimationFrame(armFooter); });
  }

  /* ------------------------------------------------------------- bands
     The packaging ticker, used as the seam under the hero and as the
     divider between sections. Two identical sets ride in one flex track;
     the track is translated and wrapped by exactly one set width, so the
     loop has no reset seam. Drifts right. Scroll velocity adds a little
     speed and decays back to base. Transform only, and each band's rAF
     stops whenever it is off screen or hovered. */
  function marquee(band) {
    var track = band.querySelector('.band__track');
    var setA = track.firstElementChild;
    var setB = null, setW = 0, x = 0, boost = 0, boostTarget = 0;
    var bandRaf = 0, lastT = 0, hovered = false, onScreen = false, lastY = scrollY();

    /* Repeat the whole phrase pair, never a single phrase, so the two
       phrases keep alternating however many times the set has to repeat. */
    var proto = setA.innerHTML;
    function fill() {
      if (setB) { track.removeChild(setB); setB = null; }
      setA.innerHTML = proto;
      /* one set must always be at least a viewport wide, or the wrap
         would expose a gap on a very wide screen */
      for (var guard = 0; guard < 24; guard++) {
        if (setA.getBoundingClientRect().width >= window.innerWidth + 240) break;
        setA.insertAdjacentHTML('beforeend', proto);
      }
      setB = setA.cloneNode(true);
      track.appendChild(setB);
      setW = setA.getBoundingClientRect().width;
      if (x > 0 || x < -setW) x = -setW;
    }

    function bandFrame(now) {
      bandRaf = 0;
      var dt = Math.min(.05, (now - lastT) / 1000 || .016);
      lastT = now;
      boost += (boostTarget - boost) * .06;
      boostTarget *= .90;
      x += (18 + boost) * dt;              /* rightward */
      if (x >= 0) x -= setW;
      track.style.transform = 'translate3d(' + x.toFixed(2) + 'px,0,0)';
      if (onScreen && !hovered) bandRaf = requestAnimationFrame(bandFrame);
    }
    function bandWake() {
      if (bandRaf || !onScreen || hovered || !setW) return;
      lastT = performance.now();
      bandRaf = requestAnimationFrame(bandFrame);
    }

    band.addEventListener('mouseenter', function () { hovered = true; });
    band.addEventListener('mouseleave', function () { hovered = false; bandWake(); });
    band.addEventListener('focus', function () { hovered = true; });
    band.addEventListener('blur', function () { hovered = false; bandWake(); });
    window.addEventListener('scroll', function () {
      var y = scrollY();
      boostTarget = Math.min(150, Math.abs(y - lastY) * 4);
      lastY = y;
      bandWake();
    }, { passive: true });
    window.addEventListener('resize', function () { fill(); bandWake(); }, { passive: true });

    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (es) {
        onScreen = es.some(function (e) { return e.isIntersecting; });
        bandWake();
      }, { rootMargin: '120px' }).observe(band);
    } else { onScreen = true; }

    fill();
    x = -setW;
    track.style.transform = 'translate3d(' + x.toFixed(2) + 'px,0,0)';
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { fill(); bandWake(); });
    bandWake();
  }
  if (!reduce) [].forEach.call(document.querySelectorAll('.band'), marquee);

  /* ------------------------------------------------------------ reviews
     The ticket rail. The rail is a native horizontal scroll container, so
     touch momentum, trackpad, keyboard scrolling and scroll-into-view on
     focus all come from the browser. Layered on top:
       - while the section crosses the viewport, scrollLeft eases toward a
         target derived from vertical scroll progress, so the tickets
         travel sideways as you read down the page;
       - anything the reader does by hand is folded into `offset`, so the
         rail is never yanked back to where the page scroll wanted it;
       - each ticket's rotation lags the one before it, which is what makes
         the row read as paper on a line instead of a row of cards. */
  var revs = document.getElementById('reviews');
  var rail = document.getElementById('revRail');
  if (revs && rail && !reduce) {
    var tickets = [].slice.call(rail.querySelectorAll('.ticket'));
    var countEl = document.getElementById('revCount');
    var prevBtn = revs.querySelector('[data-rev="-1"]');
    var nextBtn = revs.querySelector('[data-rev="1"]');
    var baseRot = tickets.map(function (t) {
      return parseFloat(getComputedStyle(t).getPropertyValue('--rot')) || 0;
    });
    var lag = tickets.map(function () { return 0; });

    var offset = 0, lastLeft = 0, vel = 0, raf = 0;
    var mode = 'auto';            /* auto | drag | fling */
    var mom = 0, dragX = 0, dragLeft = 0, settleTimer = 0;

    function maxScroll() { return Math.max(0, rail.scrollWidth - rail.clientWidth); }
    function stepWidth() {
      if (tickets.length < 2) return tickets[0] ? tickets[0].offsetWidth : 1;
      return tickets[1].offsetLeft - tickets[0].offsetLeft;
    }
    /* The rail sits at the first ticket until the section's top reaches the
       top of the viewport, then does its whole travel over the next stretch
       of scrolling, finishing while the section is still on screen. */
    function travel() {
      var r = revs.getBoundingClientRect();
      var span = Math.max(240, r.height - window.innerHeight * .25);
      return clamp(-r.top / span, 0, 1) * maxScroll();
    }
    function syncOffset() { offset = rail.scrollLeft - travel(); }

    function paint() {
      var i = clamp(Math.round(rail.scrollLeft / stepWidth()), 0, tickets.length - 1);
      countEl.textContent = String(i + 1).padStart(2, '0');
      prevBtn.disabled = rail.scrollLeft <= 2;
      nextBtn.disabled = rail.scrollLeft >= maxScroll() - 2;
    }

    function frame() {
      raf = 0;
      if (mode === 'auto') {
        var want = clamp(travel() + offset, 0, maxScroll());
        var d = want - rail.scrollLeft;
        if (Math.abs(d) > .4) rail.scrollLeft += d * .10;   /* the lag */
      } else if (mode === 'fling') {
        rail.scrollLeft += mom;
        mom *= .93;
        if (Math.abs(mom) < .5 || rail.scrollLeft <= 0 || rail.scrollLeft >= maxScroll()) {
          mom = 0; mode = 'auto'; syncOffset();
        }
      }
      /* sway: each ticket trails the rail, and the one before it */
      var moved = rail.scrollLeft - lastLeft;
      lastLeft = rail.scrollLeft;
      vel += (moved - vel) * .25;
      for (var i = 0; i < tickets.length; i++) {
        lag[i] += (vel - lag[i]) * (.14 + i * .03);
        var rot = baseRot[i] + clamp(-lag[i] * .09, -3, 3);
        tickets[i].style.transform = 'rotate(' + rot.toFixed(2) + 'deg)';
      }
      paint();
      if (mode !== 'auto' || Math.abs(vel) > .05 ||
          Math.abs(clamp(travel() + offset, 0, maxScroll()) - rail.scrollLeft) > .4) wake();
    }
    function wake() { if (!raf) raf = requestAnimationFrame(frame); }

    /* Mouse drag, with a fling on release. Touch uses the native scroller. */
    rail.addEventListener('pointerdown', function (e) {
      if (e.pointerType !== 'mouse') { rail.classList.add('is-touched'); mode = 'drag'; return; }
      if (e.target.closest('a,button')) return;
      mode = 'drag'; mom = 0; dragX = e.clientX; dragLeft = rail.scrollLeft;
      rail.classList.add('is-dragging');
      try { rail.setPointerCapture(e.pointerId); } catch (err) {}
    });
    rail.addEventListener('pointermove', function (e) {
      if (mode !== 'drag' || e.pointerType !== 'mouse' || !e.buttons) return;
      var next = dragLeft - (e.clientX - dragX);
      mom = mom * .6 + (rail.scrollLeft - next) * -.4;
      rail.scrollLeft = next;
      e.preventDefault();
      wake();
    });
    function release(e) {
      rail.classList.remove('is-dragging');
      if (mode !== 'drag') return;
      if (e && e.pointerType === 'mouse') { mode = 'fling'; }
      else { mode = 'auto'; clearTimeout(settleTimer); settleTimer = setTimeout(syncOffset, 260); }
      wake();
    }
    rail.addEventListener('pointerup', release);
    rail.addEventListener('pointercancel', release);
    rail.addEventListener('dragstart', function (e) { e.preventDefault(); });

    /* Arrow keys and the prev/next buttons move one ticket at a time. */
    function go(dir) {
      mode = 'drag';
      rail.scrollTo({ left: clamp(rail.scrollLeft + dir * stepWidth(), 0, maxScroll()), behavior: 'smooth' });
      clearTimeout(settleTimer);
      settleTimer = setTimeout(function () { syncOffset(); mode = 'auto'; wake(); }, 550);
      wake();
    }
    revs.querySelectorAll('[data-rev]').forEach(function (b) {
      b.addEventListener('click', function () { go(parseInt(b.getAttribute('data-rev'), 10)); });
    });
    rail.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowRight') { go(1); e.preventDefault(); }
      else if (e.key === 'ArrowLeft') { go(-1); e.preventDefault(); }
    });
    /* Tabbing into a ticket scrolls it into view natively; keep our offset
       in step so the next vertical scroll does not undo it. */
    rail.addEventListener('scroll', function () {
      if (mode === 'auto') return;
      clearTimeout(settleTimer);
      settleTimer = setTimeout(function () { if (mode !== 'fling') syncOffset(); }, 220);
    }, { passive: true });
    rail.addEventListener('focusin', function () {
      clearTimeout(settleTimer);
      settleTimer = setTimeout(syncOffset, 320);
    });

    window.addEventListener('scroll', wake, { passive: true });
    window.addEventListener('resize', function () { syncOffset(); wake(); }, { passive: true });
    paint();
    wake();
    startup(revs);
  } else if (revs) {
    /* Reduced motion: the stack is CSS-only, but the counter still needs
       to not lie about a rail that is not there. */
    var c = document.getElementById('revCount');
    if (c) c.textContent = '01';
    startup(revs);
  }

})();
