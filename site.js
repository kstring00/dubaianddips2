/* Dubai & Dips. One script for the whole page.
   Three scroll-driven pieces share one idea: a normalized progress value
   drives everything, DOM writes happen only when a value changes, and a rAF
   loop eases toward the scroll target and stops when it settles. */
(function () {
  'use strict';

  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var phone = window.matchMedia('(max-width: 899px)');

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
    var scrub = scrubber(film, function (dur) {
      if (reduce) scrub.seek(dur);
    });
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

      var navIn = easeInOut(range(p, .84, .94));
      set(nav, 'opacity', navIn.toFixed(3));
      set(nav, 'pointerEvents', navIn > .6 ? 'auto' : 'none');
    }

    if (reduce) {
      /* Static close state: the room, the copy, the nav. The CSS already
         collapses the stage; the film seeks to its last frame on load. */
      film.preload = 'auto'; film.load();
      nav.style.opacity = '1'; nav.style.pointerEvents = 'auto';
      window.addEventListener('scroll', navStuck, { passive: true });
      navStuck();
    } else {
      var heroLoop = loop(function () { return clamp(scrollY() / travel, 0, 1); }, applyHero, phone.matches ? .2 : .14);
      film.preload = 'auto'; film.load();
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

  /* --------------------------------------------------------------- menu
     Each category card is a real link to /menu/<slug>. The panel markup
     is already in the page, so it works with no JavaScript and crawlers
     read it; here we lift it out as a sheet, give it a history entry,
     trap focus inside it, and put focus back where it was on close. */
  var menu = document.getElementById('menu');
  if (menu) {
    var menuScrim = document.getElementById('menuScrim');  /* not `scrim`: var is function scoped and the hero owns that name */
    var sheets = {};
    [].forEach.call(menu.querySelectorAll('.sheet'), function (el) { sheets[el.getAttribute('data-slug')] = el; });
    var openSheet = null, lastFocus = null;
    var baseTitle = document.title;
    var canonical = document.querySelector('link[rel=canonical]');
    var baseCanonical = canonical ? canonical.getAttribute('href') : null;
    function setCanonical(href) { if (canonical && href) canonical.setAttribute('href', href); }

    function slugFromPath() {
      var m = /^\/menu\/([a-z0-9-]+)\/?$/.exec(location.pathname);
      return m && sheets[m[1]] ? m[1] : null;
    }
    function focusables(el) {
      return [].slice.call(el.querySelectorAll('a[href],button:not([disabled]),input,select,textarea,[tabindex]:not([tabindex="-1"])'))
        .filter(function (n) { return n.offsetWidth || n.offsetHeight || n.getClientRects().length; });
    }
    function onKey(e) {
      if (e.key === 'Escape' || e.key === 'Esc') { e.preventDefault(); close(); return; }
      if (e.key !== 'Tab' || !openSheet) return;
      var f = focusables(openSheet);
      if (!f.length) return;
      var first = f[0], last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { last.focus(); e.preventDefault(); }
      else if (!e.shiftKey && document.activeElement === last) { first.focus(); e.preventDefault(); }
    }
    function show(slug, moveFocus) {
      var el = sheets[slug];
      if (!el || openSheet === el) return;
      if (openSheet) hide(false);
      openSheet = el;
      el.classList.add('is-open');
      el.setAttribute('role', 'dialog');
      el.setAttribute('aria-modal', 'true');
      menuScrim.classList.add('is-on');
      document.documentElement.classList.add('is-sheet-open');
      document.title = el.getAttribute('data-title') + ' | Dubai & Dips';
      setCanonical(location.origin + '/menu/' + slug);
      document.addEventListener('keydown', onKey);
      if (moveFocus !== false) {
        var btn = el.querySelector('[data-close]');
        if (btn) btn.focus();
      }
    }
    function hide(restore) {
      if (!openSheet) return;
      openSheet.classList.remove('is-open');
      openSheet.removeAttribute('role');
      openSheet.removeAttribute('aria-modal');
      openSheet = null;
      menuScrim.classList.remove('is-on');
      document.documentElement.classList.remove('is-sheet-open');
      document.title = baseTitle;
      setCanonical(baseCanonical);
      document.removeEventListener('keydown', onKey);
      if (restore !== false && lastFocus && lastFocus.focus) { lastFocus.focus(); }
      lastFocus = null;
    }
    /* Close walks the history back when we pushed the entry ourselves, so
       the back button and the close button end up in the same place. */
    function close() {
      if (history.state && history.state.sheet) history.back();
      else { try { history.replaceState(null, '', '/'); } catch (e) {} hide(); }
    }

    document.addEventListener('click', function (e) {
      var link = e.target.closest ? e.target.closest('[data-sheet]') : null;
      if (link && !e.metaKey && !e.ctrlKey && !e.shiftKey && e.button === 0) {
        e.preventDefault();
        var slug = link.getAttribute('data-sheet');
        lastFocus = link;
        try { history.pushState({ sheet: slug }, '', '/menu/' + slug); } catch (err) {}
        show(slug);
        return;
      }
      if (e.target.closest && e.target.closest('[data-close]')) { e.preventDefault(); close(); }
    });
    menuScrim.addEventListener('click', close);
    window.addEventListener('popstate', function () {
      var slug = slugFromPath();
      if (slug) show(slug);
      else hide();
    });

    var initial = slugFromPath();
    if (initial) {
      try { history.replaceState({ sheet: initial }, '', location.pathname); } catch (e) {}
      show(initial);
    }
  }

  /* -------------------------------------------------------------- band
     The packaging ticker. Two identical sets ride in one flex track; the
     track is translated and wrapped by exactly one set width, so the loop
     has no reset seam. Drifts right, against the ticket rail above it.
     Scroll velocity adds a little speed and decays back to base. Transform
     only, and the rAF stops whenever the band is off screen or hovered. */
  var band = document.getElementById('band');
  if (band && !reduce) {
    var track = document.getElementById('bandTrack');
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
