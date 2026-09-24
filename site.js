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
    /* The nav sits out the opening intro and slides in once it has lifted
       away (.22, the end of the wordmark's lift). Focus inside it shows it
       at once, whatever the scroll. */
    var introOver = false, navFocus = false;
    function showNav() { nav.classList.toggle('is-shown', introOver || navFocus); }
    nav.addEventListener('focusin', function () { navFocus = true; showNav(); });
    nav.addEventListener('focusout', function (e) { if (!nav.contains(e.relatedTarget)) { navFocus = false; showNav(); } });
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
      var over = p >= .22;
      if (over !== introOver) { introOver = over; showNav(); }
    }

    if (reduce) {
      /* Static close state: the room, the copy, the nav. The CSS already
         collapses the stage; the film seeks to its last frame on load. */
      deferFilm();
      setNav(1);
      introOver = true; showNav();
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

  /* ---------------------------------------------------------- hours
     The one clock. HOURS in config/ordering.js is the only place the hours
     live; this turns them into OPEN / CLOSING SOON / CLOSED, worked out in
     the shop's own timezone (America/Chicago), never the visitor's. Anything
     that shows the hours registers with onShopMinute() and is called again
     at the top of every minute.
     To check a state by hand, add ?at=2026-09-26T23:45 to the URL: the
     clock then runs from that shop-local time. */
  var HOURS = CFG.HOURS || [];
  var SHOP_TZ = (CFG.SHOP && CFG.SHOP.timezone) || 'America/Chicago';
  var SOON = CFG.CLOSING_SOON_MINUTES || 30;
  var DAY = 1440, WEEK = 10080;
  var DAY_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  var DAY_LONG = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  /* The week as [start, end) in minutes from Sunday 00:00. A close of 24
     ends the day at midnight; a close before the open runs past midnight. */
  var spans = [];
  HOURS.forEach(function (h, d) {
    if (!h) return;
    var o = Math.round(h[0] * 60), c = Math.round(h[1] * 60);
    if (c <= o) c += DAY;
    spans.push({ start: d * DAY + o, end: d * DAY + c });
  });

  var atParam = /[?&]at=(\d{4})-(\d\d)-(\d\d)T(\d\d):(\d\d)/.exec(location.search);
  var clockStart = Date.now();
  /* Minutes since Sunday 00:00, shop time, with seconds as a fraction. */
  function shopNow() {
    if (atParam) {
      var wd = new Date(Date.UTC(+atParam[1], +atParam[2] - 1, +atParam[3])).getUTCDay();
      return (wd * DAY + (+atParam[4]) * 60 + (+atParam[5]) + (Date.now() - clockStart) / 60000) % WEEK;
    }
    try {
      var o = {};
      new Intl.DateTimeFormat('en-US', { timeZone: SHOP_TZ, hourCycle: 'h23', weekday: 'short', hour: '2-digit', minute: '2-digit', second: '2-digit' })
        .formatToParts(new Date()).forEach(function (x) { o[x.type] = x.value; });
      return DAY_SHORT.indexOf(o.weekday) * DAY + (parseInt(o.hour, 10) % 24) * 60 + parseInt(o.minute, 10) + parseInt(o.second, 10) / 60;
    } catch (e) {
      var n = new Date();
      return n.getDay() * DAY + n.getHours() * 60 + n.getMinutes();
    }
  }
  /* 600 -> "10 AM", 570 -> "9:30 AM", 1440 -> "12 AM" */
  function clockText(min) {
    min = ((min % DAY) + DAY) % DAY;
    var h = Math.floor(min / 60), m = min % 60, ap = h >= 12 ? 'PM' : 'AM';
    return ((h % 12) || 12) + (m ? ':' + (m < 10 ? '0' : '') + m : '') + ' ' + ap;
  }
  function spanText(s) { return clockText(s.start) + ' to ' + clockText(s.end); }
  /* "2h 14m", "24m" */
  function durText(min) {
    min = Math.max(1, Math.ceil(min));
    var h = Math.floor(min / 60), m = min % 60;
    return (h ? h + 'h ' : '') + (h && !m ? '' : m + 'm');
  }
  function shopState() {
    var t = shopNow(), cur = null, next = null, today = Math.floor(t / DAY), doneToday = false;
    spans.forEach(function (s) {
      for (var k = -1; k <= 1; k++) {
        var a = s.start + k * WEEK, b = s.end + k * WEEK;
        if (t >= a && t < b) cur = { start: a, end: b };
        if (a > t && (!next || a < next.start)) next = { start: a };
        if (b <= t && a >= today * DAY) doneToday = true;
      }
    });
    var st = { t: t, open: !!cur, soon: false, mode: 'closed' };
    if (cur) {
      st.closesIn = cur.end - t;
      st.soon = st.closesIn <= SOON;
      st.mode = st.soon ? 'soon' : 'open';
      st.closeText = clockText(cur.end);
      st.progress = (t - cur.start) / (cur.end - cur.start);
    } else {
      st.progress = doneToday ? 1 : 0;
      if (next) {
        var sameDay = Math.floor(next.start / DAY) === today, wd = Math.floor(next.start / DAY) % 7;
        st.opensIn = next.start - t;
        st.openText = (sameDay ? '' : DAY_SHORT[wd] + ' ') + clockText(next.start);
        st.openSpoken = (sameDay ? '' : DAY_LONG[wd] + ' ') + clockText(next.start);
      }
    }
    return st;
  }
  /* The door sign's rows, grouped from HOURS: Mon to Thu, Fri to Sat, Sun. */
  function hoursGroups() {
    var order = [1, 2, 3, 4, 5, 6, 0], out = [];
    order.forEach(function (d) {
      var h = HOURS[d], text = h ? spanText({ start: h[0] * 60, end: h[1] * 60 }) : 'Closed', last = out[out.length - 1];
      if (last && last.text === text) { last.to = d; }
      else out.push({ from: d, to: d, text: text });
    });
    return out.map(function (g) {
      return { days: DAY_SHORT[g.from] + (g.to !== g.from ? ' to ' + DAY_SHORT[g.to] : ''), text: g.text };
    });
  }
  var minuteFns = [];
  function onShopMinute(fn) { minuteFns.push(fn); fn(shopState()); }
  (function minuteTick() {
    var st = shopState();
    minuteFns.forEach(function (fn) { fn(st); });
    setTimeout(minuteTick, 60000 - (Date.now() % 60000) + 40);   /* re-check at the top of every minute */
  })();
  document.addEventListener('visibilitychange', function () {
    if (!document.hidden) { var st = shopState(); minuteFns.forEach(function (fn) { fn(st); }); }
  });

  /* The nav's small print. */
  var navHours = document.querySelector('.nav__hours');
  if (navHours) onShopMinute(function (st) {
    navHours.textContent = st.open ? 'Open until ' + st.closeText : 'Closed · opens ' + (st.openText || '');
  });

  /* ------------------------------------------------------- departures
     The menu as a departures board, built from /menu-board.json so the
     menu can be edited without touching code. Each row is an accordion
     (one open at a time) under its own h3.

     The status tiles are split-flaps, and they tell the truth: what they
     say comes from config/departures.js and the shop clock above.
       OPEN          every row cycles its own sayings.
       CLOSING SOON  row 1 locks to FINAL CALL; the rest keep cycling.
       CLOSED        row 1 shows the real next opening (OPENS 9AM); the
                     rest cycle the closed sayings. Nothing says NOW
                     BOARDING while the shop is closed.
     When the board first scrolls into view the rows settle top to bottom;
     after that each row flips every CYCLE_MS, staggered by STAGGER_MS, and
     only while the board is on screen and the tab is visible. Under
     reduced motion nothing flips: each row shows its first saying. The
     tiles are aria-hidden; each row carries its status as plain text
     ("Open now", "Closed, opens 9 AM"), which changes only with the state. */
  var board = document.getElementById('board');
  var boardRows = document.getElementById('boardRows');
  if (board && boardRows) {
    var DEP = window.DD_DEPARTURES || {};
    var CHARS = ' ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789:-&./';
    var STEP = 55;                                /* ms per flap in a riffle */
    var CYCLE = DEP.CYCLE_MS || 4500, STAGGER = DEP.STAGGER_MS || 600;
    var MAXW = 14;
    var WIDTH = 12;                               /* tiles per row: set in build() */

    function clean(p) { return String(p || '').toUpperCase().replace(/[^A-Z0-9 :\-&.\/]/g, '').replace(/\s+/g, ' ').replace(/^ | $/g, '').slice(0, MAXW); }
    var OPEN_SETS = {};
    (function () { var o = DEP.OPEN || {}; for (var k in o) if (o.hasOwnProperty(k)) OPEN_SETS[k] = o[k].map(clean).filter(Boolean); })();
    if (!OPEN_SETS.GENERAL || !OPEN_SETS.GENERAL.length) OPEN_SETS.GENERAL = ['ON TIME'];
    var CLOSED_SET = (DEP.CLOSED || ['GATE CLOSED']).map(clean).filter(Boolean);
    var FINAL = clean(DEP.FINAL_CALL || 'FINAL CALL'), OPENS = clean(DEP.OPENS || 'OPENS');
    var SOLD = clean(DEP.SOLD_OUT || 'SOLD OUT'), SEASON = clean(DEP.SEASONAL || 'SEASONAL');
    var HIGHLIGHT = (DEP.HIGHLIGHT || ['NOW BOARDING', 'FINAL CALL']).map(clean);
    function opensWord(st) { return clean(OPENS + ' ' + (st.openText || '').replace(/ (AM|PM)$/, '$1')); }

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

    /* One flap: the old letter's top half folds down over the new one.
       Transform only, so it stays on the compositor. */
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
    /* One clock for scheduling and running, so a browser whose rAF
       timestamp trails performance.now() cannot stall a riffle. */
    function runJobs() {
      flapRaf = 0;
      var now = performance.now(), alive = false;
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
      for (var k = steps; k > 0; k--) out.push(CHARS.charAt((b - k + CHARS.length * 2) % CHARS.length));
      out.push(to);
      return out;
    }
    /* Centred in the row's tiles, blanks either side. */
    function pad(text) {
      text = clean(text);
      var left = Math.floor((WIDTH - text.length) / 2);
      return (Array(left + 1).join(' ') + text + Array(WIDTH + 1).join(' ')).slice(0, WIDTH);
    }

    /* Set a row's tiles: at once (delay < 0), or as a riffle starting after
       `delay`, riffling only the tiles whose letter changes. */
    function flapTo(el, text, delay) {
      var cells = el.children, want = pad(text), now = performance.now(), phoneNow = phone.matches;
      for (var i = 0; i < cells.length; i++) {
        var ch = want.charAt(i), face = cells[i].firstElementChild;
        if (delay < 0) {
          /* set without a riffle: both halves of the tile carry the letter,
             and the top leaf is squared away so nothing hides it */
          face.textContent = ch;
          var lf = cells[i].lastElementChild;
          lf.firstElementChild.textContent = ch;
          if (lf.getAnimations) lf.getAnimations().forEach(function (an) { an.cancel(); });
          continue;
        }
        if (face.textContent === ch) continue;
        for (var q = jobs.length - 1; q >= 0; q--) if (jobs[q].cell === cells[i]) jobs[q].done = true;
        jobs.push({ cell: cells[i], seq: sequence(ch, phoneNow ? 4 : 6), start: now + delay + i * (phoneNow ? 14 : 18), at: -1, done: false });
      }
      if (delay >= 0 && !flapRaf && jobs.length) flapRaf = requestAnimationFrame(runJobs);
    }

    function esc(v) {
      return String(v == null ? '' : v).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    }
    function price(p) { return typeof p === 'number' && p > 0 ? money(p) : ''; }
    function tiles() {
      var html = '';
      for (var i = 0; i < WIDTH; i++) html += '<span class="flap"><span class="flap__ch"> </span><span class="flap__leaf"><span> </span></span></span>';
      return html;
    }
    var TBD = { code: 'HOU', destination: 'Houston' };
    var STATUSES = { 'on-time': 1, 'now-boarding': 1, 'seasonal': 1, 'sold-out': 1 };
    function rowHtml(r) {
      if (r.code === 'TBD') { var c = {}; for (var k in r) c[k] = r[k]; c.code = TBD.code; c.destination = TBD.destination; r = c; }
      var slug = esc(r.slug), status = STATUSES[r.status] ? r.status : 'on-time';
      var items = r.items || [];
      var names = items.slice(0, 3).map(function (it) { return esc(it.name); }).join(' &middot; ');
      var sub = names || esc(r.description) || 'Full list in the shop';
      var list = items.length
        ? '<ul class="bitems">' + items.map(function (it) {
            var p = price(it.price);
            return '<li class="bitem"><span>' + esc(it.name) + '</span>' + (p ? '<span class="bitem__price">' + p + '</span>' : '') + '</li>';
          }).join('') + '</ul>'
        : '<p class="bpanel__soon">The full list is on the boards in the shop.</p>';
      var order = status === 'sold-out'
        ? '<p class="bpanel__soon">Sold out for today.</p>'
        : '<p class="bpanel__order"><a class="btn btn--primary btn--sm" href="#order" data-order="pickup" data-place="category" data-category="' + esc(r.category) + '" aria-label="Order for pickup: ' + esc(r.category) + '">Order</a></p>';
      return '<li class="brow" data-slug="' + slug + '" data-status="' + status + '" data-code="' + esc(r.code) + '">' +
        '<h3 class="brow__h"><button class="brow__btn" type="button" id="brow-' + slug + '" aria-expanded="false" aria-controls="bpanel-' + slug + '">' +
          '<span class="brow__cell brow__flight">' + esc(r.flight) + '</span>' +
          '<span class="brow__cell brow__dest"><span class="brow__code">' + esc(r.code) + '</span>' + esc(r.destination) + '</span>' +
          '<span class="brow__cell brow__on"><span class="brow__cat">' + esc(r.category) + '</span><span class="brow__items">' + sub + '</span></span>' +
          '<span class="brow__cell brow__gate"><span class="brow__gatel" aria-hidden="true">Gate </span><span class="vh">Gate </span>' + esc(r.gate) + '</span>' +
          '<span class="brow__cell brow__status"><span class="flaps" aria-hidden="true" aria-live="off" style="--n:' + WIDTH + '">' + tiles() + '</span><span class="vh brow__sr"></span></span>' +
        '</button></h3>' +
        '<div class="bpanel" id="bpanel-' + slug + '" role="region" aria-labelledby="brow-' + slug + '" hidden><div class="bpanel__in">' +
          (r.description ? '<p class="bpanel__desc">' + esc(r.description) + '</p>' : '') + list + order +
        '</div></div></li>';
    }

    var rows = [], btns = [], openRow = null, R = [];
    var state = shopState(), stateKey = '';

    /* What a row says right now: a locked word, or its set to cycle. */
    function plan(r, i) {
      if (state.open) {
        if (i === 0 && state.soon) return { lock: FINAL };
        if (r.status === 'sold-out') return { lock: SOLD };
        return { set: r.openSet };
      }
      if (i === 0) return { lock: opensWord(state) };
      return { set: CLOSED_SET };
    }
    function spoken(r, i) {
      if (!state.open) return 'Closed, opens ' + (state.openSpoken || 'soon');
      if (r.status === 'sold-out') return 'Open now, sold out today';
      if (state.soon) return 'Open now, closing at ' + state.closeText;
      return 'Open now';
    }
    function show(r, word, delay) {
      r.word = word;
      r.el.classList.toggle('is-hl', HIGHLIGHT.indexOf(word) > -1);
      r.el.classList.toggle('is-sold', word === SOLD);
      flapTo(r.flaps, word, delay);
    }
    /* Every row back to the first thing it should say in this state. Rows
       that share a set start at different places in it, so a board full of
       GENERAL rows does not all say the same thing at once. */
    function applyState(delayFor) {
      var used = {};
      R.forEach(function (r, i) {
        var p = plan(r, i);
        r.lock = p.lock || null; r.set = p.set || null;
        if (r.set) {
          var key = r.set === CLOSED_SET ? 'closed' : r.setKey;
          used[key] = used[key] || 0;
          r.idx = used[key]++ % r.set.length;
          /* row 1 is the one that starts on NOW BOARDING */
          if (i > 0 && HIGHLIGHT.indexOf(r.set[r.idx]) > -1) r.idx = (r.idx + 1) % r.set.length;
        }
        r.sr.textContent = ', ' + spoken(r, i);
        show(r, r.lock || r.set[r.idx], delayFor(i));
      });
    }
    function advance(r) {
      if (r.lock) { if (r.word !== r.lock) show(r, r.lock, 0); return; }
      r.idx = (r.idx + 1) % r.set.length;
      show(r, r.set[r.idx], 0);
    }

    /* The cycle: row i first flips at 1.2s + i * STAGGER, then every CYCLE.
       Runs only while the board is on screen and the tab is showing. */
    var seen = false, cycling = false, settled = false;
    function stopCycle() { cycling = false; R.forEach(function (r) { clearTimeout(r.timer); }); }
    function startCycle() {
      if (reduce || cycling || !settled || !seen || document.hidden) return;
      cycling = true;
      R.forEach(function (r, i) {
        (function step(wait) {
          r.timer = setTimeout(function () { if (!cycling) return; advance(r); step(CYCLE); }, wait);
        })(1200 + i * STAGGER);
      });
    }
    document.addEventListener('visibilitychange', function () { if (document.hidden) stopCycle(); else startCycle(); });

    /* The settle: every row riffles in, one row after the next. */
    function settle(animate) {
      if (settled) return;
      settled = true;
      var stagger = phone.matches ? 50 : 60;
      applyState(function (i) { return animate && !reduce ? i * stagger : -1; });
      startCycle();
    }

    /* The shop clock ticks every minute; the board only moves when the
       state (or row 1's opening time) actually changes. */
    function onMinute(st) {
      state = st;
      var key = st.mode + '|' + (st.open ? '' : opensWord(st));
      if (key === stateKey) return;
      stateKey = key;
      if (!settled) { R.forEach(function (r, i) { r.sr.textContent = ', ' + spoken(r, i); }); return; }
      stopCycle();
      applyState(function () { return reduce ? -1 : 0; });
      startCycle();
    }

    function setRow(row, on) {
      var btn = row.querySelector('.brow__btn'), panel = row.querySelector('.bpanel');
      settle(false);
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

    function build(data) {
      if (data.tbdShowsAs) TBD = data.tbdShowsAs;
      var list = data.rows || [];
      /* The tiles fit the longest thing the board can say: every set in
         use, the closed set, and the words row 1 locks to. */
      var words = CLOSED_SET.concat([FINAL, SOLD, SEASON]);
      list.forEach(function (r) { var code = r.code === 'TBD' ? TBD.code : r.code; words = words.concat(OPEN_SETS[code] || OPEN_SETS.GENERAL); });
      spans.forEach(function (s) {
        var wd = Math.floor(s.start / DAY) % 7;
        words.push(opensWord({ openText: clockText(s.start) }), opensWord({ openText: DAY_SHORT[wd] + ' ' + clockText(s.start) }));
      });
      WIDTH = Math.min(MAXW, Math.max.apply(null, words.map(function (w) { return w.length; })));

      boardRows.innerHTML = list.map(rowHtml).join('');
      rows = [].slice.call(boardRows.querySelectorAll('.brow'));
      btns = rows.map(function (r) { return r.querySelector('.brow__btn'); });
      R = rows.map(function (el) {
        var code = el.getAttribute('data-code'), status = el.getAttribute('data-status');
        var key = OPEN_SETS[code] ? code : 'GENERAL', set = OPEN_SETS[key];
        if (status === 'seasonal') { set = [SEASON].concat(set); key += '+S'; }
        return { el: el, flaps: el.querySelector('.flaps'), sr: el.querySelector('.brow__sr'), status: status, openSet: set, setKey: key, idx: 0, word: '', timer: 0 };
      });
      btns.forEach(function (b, i) { b.addEventListener('click', function () { openBoardRow(rows[i], false); }); });
      if (window.DD && window.DD.wireOrder) window.DD.wireOrder(boardRows);

      onShopMinute(onMinute);
      if (reduce || !('IntersectionObserver' in window)) { seen = true; settle(false); }
      else {
        var sio = new IntersectionObserver(function (es) {
          if (es.some(function (e) { return e.isIntersecting; })) { settle(true); sio.disconnect(); }
        }, { threshold: .2 });
        sio.observe(boardRows);
        /* flip only while the board is on screen */
        new IntersectionObserver(function (es) {
          seen = es[es.length - 1].isIntersecting;
          if (seen) startCycle(); else stopCycle();
        }).observe(board);
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
    return hoursGroups().map(function (g) { return '<tr><th>' + g.days + '</th><td>' + g.text + '</td></tr>'; }).join('');
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
    for (var h = 0; h < tables.length; h++) tables[h].innerHTML = hoursRows();

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

  /* ------------------------------------------------------------ links
     Every link marked data-link takes its URL from LINKS in
     config/ordering.js. An empty value hides the link (and its list item)
     rather than leaving a dead one; the markup's own href is only the
     no-JavaScript fallback. */
  var LINKS = CFG.LINKS || {};
  [].forEach.call(document.querySelectorAll('[data-link]'), function (a) {
    var key = a.getAttribute('data-link');
    if (!(key in LINKS)) return;
    var url = String(LINKS[key] || '').replace(/^\s+|\s+$/g, '');
    var holder = a.parentNode.tagName === 'LI' ? a.parentNode : a;
    if (!url) { holder.hidden = true; return; }
    a.setAttribute('href', url);
    holder.hidden = false; a.hidden = false;
    if (/^https?:/i.test(url)) { a.target = '_blank'; a.rel = 'noopener'; }
  });

  /* ------------------------------------------------------------- gate
     The footer's live hours, from the shop clock: the state in words with
     a pulsing dot while open, a countdown, a bar of today's open hours
     filling in real time, and the week with today marked. The rows fade
     up one after another when the footer comes into view. */
  var gate = document.getElementById('gate');
  if (gate) {
    var gState = document.getElementById('gateState'), gCount = document.getElementById('gateCount');
    var gFill = document.getElementById('gateFill'), gWeek = document.getElementById('gateWeek');
    gWeek.innerHTML = [1, 2, 3, 4, 5, 6, 0].map(function (d, i) {
      var h = HOURS[d];
      return '<li style="--i:' + i + '" data-day="' + d + '"><span>' + DAY_LONG[d].slice(0, 3) + '</span><span>' +
        (h ? clockText(h[0] * 60) + ' \u2013 ' + clockText(h[1] * 60) : 'Closed') + '</span></li>';
    }).join('');
    var weekRows = [].slice.call(gWeek.children);
    onShopMinute(function (st) {
      gState.setAttribute('data-state', st.mode);
      gState.lastChild.textContent = st.open
        ? (st.soon ? 'Final call' : 'Open now') + ' \u00b7 closes ' + st.closeText
        : 'Closed \u00b7 opens ' + (st.openText || 'soon');
      gCount.textContent = st.open ? 'Closes in ' + durText(st.closesIn) : st.opensIn != null ? 'Opens in ' + durText(st.opensIn) : '';
      gFill.style.transform = 'scaleX(' + clamp(st.progress, 0, 1).toFixed(4) + ')';
      var today = Math.floor(st.t / DAY) % 7;
      weekRows.forEach(function (li) {
        var on = +li.getAttribute('data-day') === today;
        li.classList.toggle('is-today', on);
        if (on) li.setAttribute('aria-current', 'date'); else li.removeAttribute('aria-current');
      });
    });
    if (reduce || !('IntersectionObserver' in window)) gate.classList.add('is-in');
    else {
      var gio = new IntersectionObserver(function (es) {
        if (es.some(function (e) { return e.isIntersecting; })) { gate.classList.add('is-in'); gio.disconnect(); }
      }, { threshold: .35 });
      gio.observe(gate);
    }
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
      var dt = Math.max(0, Math.min(.05, (now - lastT) / 1000 || .016));
      lastT = now;
      boost += (boostTarget - boost) * .06;
      boostTarget *= .90;
      x += (38 + boost) * dt;              /* rightward */
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

  /* ------------------------------------------------------------- social
     NOW BOARDING: the TikTok and Instagram wall, built from
     /assets/social/posts.json.

     To add or swap a post (no code change):
       1. Drop the photo in assets/social/, e.g. social-09.jpg. A tall photo
          at least 1080px wide looks best; any size works.
       2. Add an entry to assets/social/posts.json:
            "platform": "tiktok" or "instagram"
            "url":      the post's link (in the app: Share > Copy link)
            "poster":   "assets/social/social-09.jpg"
            "focus":    the point of the photo to keep in the crop, "50% 50%"
            "caption":  under 60 characters
            "alt":      what the photo shows, for screen readers
       3. Run `python3 scripts/social-posters.py` to cut the 9:16 WebP crops.
     A post with an empty url still shows; it opens the profile in a new
     tab instead of the post. Posts show in the file's order, with the two
     follow tickets after the 3rd and the 6th.

     Nothing from TikTok or Instagram loads with the page. Opening a post
     shows our poster and an "Open on ..." button at once; the official
     embed script loads only then, and the embed replaces the poster once
     it has rendered. If it never does (blocked, offline) the poster stays. */
  var wall = document.getElementById('socialWall');
  var social = document.getElementById('social');
  if (wall && social) (function () {
    var PROFILE = { tiktok: LINKS.tiktok, instagram: LINKS.instagram };    /* from LINKS in config/ordering.js */
    var NAME = { tiktok: 'TikTok', instagram: 'Instagram' };
    var HANDLE = { tiktok: '@dubai.dips', instagram: '@dubaianddips' };
    var ROUTES = ['DXB', 'FCO', 'NRT', 'CAI'];
    var ROT = [-1.6, 1.2, -.7, 1.8, -1.9, .8, -1.2, 1.5, -.4, 2, -1, .6];
    var SPEED = [.8, -1.25, 1];            /* per column; negative moves down as you scroll */
    var VALID = /^https:\/\/(www\.|m\.|vm\.)?(tiktok\.com|instagram\.com)\//i;
    var wide = window.matchMedia('(min-width: 768px)');
    var pin = document.getElementById('socialPin'), stage = pin.firstElementChild;
    var posts = [], slots = [], tops = [], over = [0, 0, 0], D = 0, pinned = false;

    function esc(v) {
      return String(v == null ? '' : v).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    }
    function plat(p) { return p.platform === 'instagram' ? 'instagram' : 'tiktok'; }
    function url(p) { return VALID.test(p.url || '') ? p.url : ''; }
    function path(p) { return '/' + String(p).replace(/^\/+/, ''); }
    function webp(poster, w) { return path(poster).replace(/\.(jpe?g|png)$/i, '') + '-' + w + '.webp'; }
    function picture(p, lazy, sizes) {
      return '<picture><source type="image/webp" srcset="' + esc(webp(p.poster, 720)) + ' 720w, ' + esc(webp(p.poster, 1080)) + ' 1080w" sizes="' + sizes + '">' +
        '<img src="' + esc(path(p.poster)) + '" alt="' + esc(p.alt) + '" width="720" height="1280"' + (lazy ? ' loading="lazy"' : '') +
        ' decoding="async" style="object-position:' + esc(p.focus || '50% 50%') + '"></picture>';
    }
    function star(cls) { return '<svg class="logo logo--star ' + (cls || '') + '" aria-hidden="true" focusable="false"><use href="#dd-star"/></svg>'; }

    function postCard(p, n) {
      var pl = plat(p), link = url(p), route = ROUTES[n % ROUTES.length];
      var cap = esc(String(p.caption || '').slice(0, 60));
      var action = link ? 'Watch on ' + NAME[pl] : 'See ' + HANDLE[pl] + ' on ' + NAME[pl] + ' (opens in a new tab)';
      var tag = link ? 'button' : 'a';
      var attrs = link ? ' type="button" data-post="' + n + '"' : ' href="' + PROFILE[pl] + '" target="_blank" rel="noopener"';
      return '<' + tag + ' class="bp"' + attrs + '>' +
        '<span class="bp__stub bp__top" aria-hidden="true">' +
          '<span class="bp__badge bp__badge--' + pl + '">' + (pl === 'tiktok' ? 'TT' : 'IG') + '</span>' +
          '<span class="bp__route">' + route + ' <i>&rarr;</i> HOU</span>' +
          '<span class="bp__gate"><i>Gate</i>' + (n < 9 ? '0' : '') + (n + 1) + '</span>' +
        '</span>' +
        '<span class="bp__photo">' + picture(p, true, '(min-width: 768px) 300px, 72vw') +
          '<span class="bp__none" aria-hidden="true">' + star() + '<b>' + route + '</b></span>' +
          '<span class="bp__play" aria-hidden="true">' + (link ? '&#9654;' : '&nearr;') + '</span>' +
        '</span>' +
        '<span class="bp__stub bp__bot"><i class="bp__notch bp__notch--l" aria-hidden="true"></i><i class="bp__notch bp__notch--r" aria-hidden="true"></i>' +
          '<span class="bp__cap">' + cap + '</span><span class="vh">. ' + action + '</span>' +
          '<span class="bp__meta" aria-hidden="true"><span>D&amp;D Airlines</span><span>' + NAME[pl] + '</span></span>' +
          '<span class="bp__code" aria-hidden="true"></span>' +
        '</span></' + tag + '>';
    }
    function followCard(pl) {
      return '<a class="bp bp--follow" href="' + PROFILE[pl] + '" target="_blank" rel="noopener">' +
        '<span class="bp__frow bp__frow--top" aria-hidden="true"><span>Boarding pass</span><span>HOU &rarr; ' + (pl === 'tiktok' ? 'TT' : 'IG') + '</span></span>' +
        '<span class="bp__follow">' + star() +
        '<span class="bp__big">Board on <em>' + NAME[pl] + '</em></span>' +
        '<span class="bp__handle">' + HANDLE[pl] + '</span>' +
        '<span class="bp__count">10k+ travelers</span>' +
        '<span class="bp__go" aria-hidden="true">Follow &nearr;</span><span class="vh"> (opens in a new tab)</span>' +
        '</span><span class="bp__frow bp__frow--bot" aria-hidden="true"><span>D&amp;D Airlines</span><span class="bp__code"></span></span></a>';
    }

    /* ---- the shear. Each column travels at its SPEED times D, and stops
       once its own last card is in view (over[c] is how far that is), so
       a column of four and a column of three both show every card. */
    function progress() {
      var dist = pin.offsetHeight - stage.offsetHeight;
      return dist > 0 ? clamp(-pin.getBoundingClientRect().top / dist, 0, 1) : 0;
    }
    function offset(c, p) {
      var run = Math.min(over[c], Math.abs(SPEED[c]) * D * p);
      return SPEED[c] > 0 ? -run : run - over[c];
    }
    function paintWall(p) {
      if (!pinned) return;
      for (var i = 0; i < slots.length; i++) slots[i].style.transform = 'translate3d(0,' + offset(i % 3, p).toFixed(1) + 'px,0)';
    }
    var wallLoop = loop(progress, paintWall, .14);
    function measure() {
      pinned = !reduce && wide.matches && slots.length > 3;
      social.classList.toggle('is-pinned', pinned);
      slots.forEach(function (s) { s.style.transform = ''; });
      if (!pinned) return;
      var st = stage.getBoundingClientRect(), vh = stage.clientHeight, bottom = [0, 0, 0];
      tops = slots.map(function (s, i) {
        var r = s.getBoundingClientRect();
        bottom[i % 3] = Math.max(bottom[i % 3], r.bottom - st.top);
        return r.top - st.top;
      });
      D = 0;
      for (var c = 0; c < 3; c++) {
        over[c] = Math.max(0, bottom[c] + 56 - vh);
        D = Math.max(D, over[c] / Math.abs(SPEED[c]));
      }
      wallLoop.reset();
    }
    /* Tabbing to a card scrolls the page to the point where that card sits
       in the middle of the stage, so keyboard order never lands off screen. */
    wall.addEventListener('focusin', function (e) {
      if (!pinned || !D) return;
      var slot = e.target.closest('.sw-slot'), i = slots.indexOf(slot);
      try { if (i < 0 || !e.target.matches(':focus-visible')) return; } catch (err) { return; }
      stage.scrollTop = 0;                         /* focus may have scrolled the clipped stage itself */
      requestAnimationFrame(function () {
        stage.scrollTop = 0;
        var c = i % 3, s = SPEED[c], vh = stage.clientHeight;
        var want = (vh - slot.offsetHeight) / 2 - tops[i];
        var run = clamp(s > 0 ? -want : want + over[c], 0, over[c]);
        var p = clamp(run / (Math.abs(s) * D), 0, 1);
        var dist = pin.offsetHeight - vh;
        window.scrollTo({ top: pin.getBoundingClientRect().top + scrollY() + p * dist, behavior: 'instant' });
        wallLoop.reset();
      });
    });

    /* ---- the title flips in, letter by letter, when it comes into view */
    var FLIP = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    function flipTitle() {
      var cells = [];
      [].forEach.call(social.querySelectorAll('[data-flap]'), function (el) {
        var text = el.getAttribute('data-flap');
        el.textContent = '';
        text.split(' ').forEach(function (word, w) {
          if (w) el.appendChild(document.createTextNode(' '));
          var wd = document.createElement('span');
          wd.className = 'sf-word';
          for (var k = 0; k < word.length; k++) {
            var c = document.createElement('span');
            c.className = 'sf-ch';
            c.textContent = ' ';
            c.setAttribute('data-to', word.charAt(k));
            wd.appendChild(c);
            cells.push(c);
          }
          el.appendChild(wd);
        });
      });
      function run() {
        var t0 = performance.now();
        (function frame() {
          var now = performance.now(), alive = false;
          for (var i = 0; i < cells.length; i++) {
            var to = cells[i].getAttribute('data-to'), n = Math.floor((now - t0 - i * 38) / 48);
            if (n < 0) { alive = true; continue; }
            if (n >= 6) { if (cells[i].textContent !== to) cells[i].textContent = to; continue; }
            var ch = FLIP.charAt(Math.floor(Math.random() * FLIP.length));
            cells[i].textContent = to === to.toLowerCase() && to !== to.toUpperCase() ? ch.toLowerCase() : ch;
            alive = true;
          }
          if (alive) requestAnimationFrame(frame);
        })();
      }
      if (!('IntersectionObserver' in window)) return run();
      var io = new IntersectionObserver(function (es) {
        if (es.some(function (e) { return e.isIntersecting; })) { io.disconnect(); run(); }
      }, { threshold: .6 });
      io.observe(social.querySelector('.social__title'));
    }
    if (!reduce) flipTitle();

    /* ---- the modal */
    var modal = document.getElementById('swm'), mBody = document.getElementById('swmBody'), mTitle = document.getElementById('swmTitle');
    var lastCard = null, loads = {}, watch = null, giveUp = 0;
    function load(src, again) {
      if (loads[src] && !again) return loads[src];
      var old = document.querySelector('script[data-embed="' + src + '"]');
      if (old) old.parentNode.removeChild(old);
      return (loads[src] = new Promise(function (ok, no) {
        var s = document.createElement('script');
        s.src = src; s.async = true; s.setAttribute('data-embed', src);
        s.onload = ok;
        s.onerror = function () { delete loads[src]; no(); };
        document.body.appendChild(s);
      }));
    }
    function focusables() {
      return [].filter.call(modal.querySelectorAll('a[href],button,iframe,[tabindex]:not([tabindex="-1"])'),
        function (el) { return el.offsetParent !== null || el === document.activeElement; });
    }
    function openPost(n, card) {
      var p = posts[n], pl = plat(p), link = url(p);
      if (!link) return;
      lastCard = card;
      mTitle.textContent = NAME[pl] + ' · ' + String(p.caption || '').slice(0, 60);
      mBody.innerHTML = '<div class="swm__embed" id="swmEmbed"></div>' +
        '<figure class="swm__fallback">' + picture(p, false, '(min-width: 600px) 360px, 80vw') +
        '<figcaption><a class="btn btn--line swm__open" href="' + esc(link) + '" target="_blank" rel="noopener">Open on ' + NAME[pl] + '<span class="vh"> (opens in a new tab)</span></a></figcaption></figure>';
      modal.classList.remove('has-embed');
      modal.hidden = false;
      document.documentElement.classList.add('swm-open');
      modal.querySelector('.swm__close').focus();
      emit('social_open', { platform: pl });

      var box = document.getElementById('swmEmbed'), id = /\/video\/(\d+)/.exec(link);
      if (pl === 'tiktok' && id) {
        box.innerHTML = '<blockquote class="tiktok-embed" cite="' + esc(link) + '" data-video-id="' + id[1] + '" style="max-width:605px;min-width:300px"><section></section></blockquote>';
      } else if (pl === 'instagram') {
        box.innerHTML = '<blockquote class="instagram-media" data-instgrm-permalink="' + esc(link) + '" data-instgrm-version="14" style="max-width:540px;min-width:300px;width:100%"></blockquote>';
      } else return;                               /* a TikTok link with no video id: the poster and the button it is */
      /* the embed replaces the poster only once its iframe exists */
      if (window.MutationObserver) {
        watch = new MutationObserver(function () {
          if (box.querySelector('iframe')) { modal.classList.add('has-embed'); watch.disconnect(); clearTimeout(giveUp); }
        });
        watch.observe(box, { childList: true, subtree: true });
        giveUp = setTimeout(function () { if (watch) watch.disconnect(); }, 12000);
      }
      if (pl === 'tiktok') load('https://www.tiktok.com/embed.js', true).catch(function () {});
      else load('https://www.instagram.com/embed.js').then(function () {
        if (window.instgrm && window.instgrm.Embeds) window.instgrm.Embeds.process();
      }).catch(function () {});
    }
    function closePost() {
      if (modal.hidden) return;
      if (watch) watch.disconnect();
      clearTimeout(giveUp);
      modal.hidden = true;
      mBody.innerHTML = '';                        /* stops the video */
      document.documentElement.classList.remove('swm-open');
      if (lastCard) lastCard.focus({ preventScroll: true });
    }
    modal.addEventListener('click', function (e) { if (e.target.closest('[data-swm-close]')) closePost(); });
    modal.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') { e.preventDefault(); closePost(); return; }
      if (e.key !== 'Tab') return;
      var f = focusables();
      if (!f.length) return;
      var first = f[0], last = f[f.length - 1];
      if (e.shiftKey && (document.activeElement === first || !modal.contains(document.activeElement))) { last.focus(); e.preventDefault(); }
      else if (!e.shiftKey && document.activeElement === last) { first.focus(); e.preventDefault(); }
    });
    /* focus that escapes (into an embed's iframe and out again) is brought back */
    document.addEventListener('focusin', function (e) {
      if (!modal.hidden && !modal.contains(e.target)) modal.querySelector('.swm__close').focus();
    });
    wall.addEventListener('click', function (e) {
      var b = e.target.closest('button[data-post]');
      if (b) openPost(parseInt(b.getAttribute('data-post'), 10), b);
      else if (e.target.closest('a.bp')) emit('social_follow', { href: e.target.closest('a.bp').href });
    });

    function build(list) {
      posts = (Array.isArray(list) ? list : []).filter(function (p) { return p && p.poster; });
      var html = [];
      posts.forEach(function (p, n) {
        html.push(postCard(p, n));
        if (n === 2) html.push(followCard('tiktok'));
        if (n === 5) html.push(followCard('instagram'));
      });
      if (posts.length < 3) html.push(followCard('tiktok'));
      if (posts.length < 6) html.push(followCard('instagram'));
      wall.innerHTML = html.map(function (h, k) {
        return '<li class="sw-slot">' + h.replace('class="bp', 'style="--rot:' + ROT[k % ROT.length] + 'deg" class="bp') + '</li>';
      }).join('');
      slots = [].slice.call(wall.children);
      [].forEach.call(wall.querySelectorAll('.bp__photo img'), function (img) {
        img.addEventListener('error', function () { img.closest('.bp').classList.add('is-noposter'); });
      });
      measure();
      if (document.fonts && document.fonts.ready) document.fonts.ready.then(measure);
    }

    if (!reduce) {
      window.addEventListener('scroll', function () { if (pinned) wallLoop.wake(); }, { passive: true });
      window.addEventListener('resize', measure, { passive: true });
      if (wide.addEventListener) wide.addEventListener('change', measure);
    }
    fetch('/assets/social/posts.json', { cache: 'no-cache' })
      .then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); })
      .then(build)
      .catch(function () { build([]); });
  })();

})();
