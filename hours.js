/* Dubai & Dips - the one clock.
   Turns HOURS and SPECIAL_HOURS from config/ordering.js into open /
   closing soon / closed, worked out in the shop's own timezone (America/
   Chicago), never the visitor's. Used by site.js (nav, board, footer gate),
   pages.js (location pages) and the build (structured data), so there is
   one implementation of "are we open".

   To check a state by hand, add ?at=2026-09-26T23:45 to any page URL: the
   clock then runs from that shop-local time.

   Plain ES5; sets window.DD_HOURS. */
(function (root) {
  'use strict';
  var DAY = 1440;
  var DAY_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  var DAY_LONG = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  /* 600 -> "10 AM", 570 -> "9:30 AM", 1440 -> "12 AM" */
  function clockText(min) {
    min = ((Math.round(min) % DAY) + DAY) % DAY;
    var h = Math.floor(min / 60), m = min % 60, ap = h >= 12 ? 'PM' : 'AM';
    return ((h % 12) || 12) + (m ? ':' + (m < 10 ? '0' : '') + m : '') + ' ' + ap;
  }
  /* "2h 14m", "24m" */
  function durText(min) {
    min = Math.max(1, Math.ceil(min));
    var h = Math.floor(min / 60), m = min % 60;
    return (h ? h + 'h ' : '') + (h && !m ? '' : m + 'm');
  }
  function pad2(n) { return (n < 10 ? '0' : '') + n; }
  /* A calendar date k days after y-mo-d. */
  function dateAt(y, mo, d, k) {
    var dt = new Date(Date.UTC(y, mo - 1, d + (k || 0)));
    return { y: dt.getUTCFullYear(), mo: dt.getUTCMonth() + 1, d: dt.getUTCDate(), wd: dt.getUTCDay(),
      key: dt.getUTCFullYear() + '-' + pad2(dt.getUTCMonth() + 1) + '-' + pad2(dt.getUTCDate()) };
  }

  var loadedAt = Date.now();
  /* Now, in the shop's timezone: the date and minutes since midnight. */
  function localNow(tz) {
    var loc = root.location && root.location.search || '';
    var at = /[?&]at=(\d{4})-(\d\d)-(\d\d)T(\d\d):(\d\d)/.exec(loc);
    if (at) {
      var mins = (+at[4]) * 60 + (+at[5]) + (Date.now() - loadedAt) / 60000;
      var dd = dateAt(+at[1], +at[2], +at[3], Math.floor(mins / DAY));
      dd.m = mins % DAY;
      return dd;
    }
    try {
      var o = {};
      new Intl.DateTimeFormat('en-US', { timeZone: tz || 'America/Chicago', hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' })
        .formatToParts(new Date()).forEach(function (x) { o[x.type] = x.value; });
      var n = dateAt(+o.year, +o.month, +o.day, 0);
      n.m = (parseInt(o.hour, 10) % 24) * 60 + parseInt(o.minute, 10) + parseInt(o.second, 10) / 60;
      return n;
    } catch (e) {
      var j = new Date(), l = dateAt(j.getFullYear(), j.getMonth() + 1, j.getDate(), 0);
      l.m = j.getHours() * 60 + j.getMinutes();
      return l;
    }
  }

  /* A clock for one set of hours. opts: { hours, special, tz, soon } */
  function create(opts) {
    var HOURS = opts.hours || [], SPECIAL = opts.special || [], SOON = opts.soon || 30;
    var specialByDate = {};
    SPECIAL.forEach(function (s) { if (s && s.date) specialByDate[s.date] = s; });

    /* [open, close] in hours for a date, or null when closed. */
    function dayHours(date) {
      var s = specialByDate[date.key];
      if (s) return s.closed ? null : [s.open, s.close];
      return HOURS[date.wd] || null;
    }
    function state(now) {
      var n = now || localNow(opts.tz), t = n.m, cur = null, next = null, doneToday = false;
      for (var k = -1; k <= 8; k++) {
        var date = dateAt(n.y, n.mo, n.d, k), h = dayHours(date);
        if (!h) continue;
        var a = k * DAY + Math.round(h[0] * 60), b = k * DAY + Math.round(h[1] * 60);
        if (b <= a) b += DAY;
        if (t >= a && t < b) cur = { start: a, end: b };
        if (a > t && (!next || a < next.start)) next = { start: a, date: dateAt(n.y, n.mo, n.d, Math.floor(a / DAY)) };
        if (b <= t && a >= 0) doneToday = true;
      }
      var st = { t: t, weekday: n.wd, date: n.key, open: !!cur, soon: false, mode: 'closed', progress: 0 };
      if (cur) {
        st.closesIn = cur.end - t;
        st.soon = st.closesIn <= SOON;
        st.mode = st.soon ? 'soon' : 'open';
        st.closeText = clockText(cur.end);
        st.progress = (t - cur.start) / (cur.end - cur.start);
      } else {
        st.progress = doneToday ? 1 : 0;
        if (next) {
          var sameDay = next.start < DAY;
          st.opensIn = next.start - t;
          st.openText = (sameDay ? '' : DAY_SHORT[next.date.wd] + ' ') + clockText(next.start);
          st.openSpoken = (sameDay ? '' : DAY_LONG[next.date.wd] + ' ') + clockText(next.start);
        }
      }
      return st;
    }
    /* The door sign's rows, grouped: Mon to Thu, Fri to Sat, Sun. */
    function groups() {
      var out = [];
      [1, 2, 3, 4, 5, 6, 0].forEach(function (d) {
        var h = HOURS[d], text = h ? clockText(h[0] * 60) + ' to ' + clockText(h[1] * 60) : 'Closed', last = out[out.length - 1];
        if (last && last.text === text) last.to = d; else out.push({ from: d, to: d, text: text });
      });
      return out.map(function (g) { return { from: g.from, to: g.to, days: DAY_SHORT[g.from] + (g.to !== g.from ? ' to ' + DAY_SHORT[g.to] : ''), text: g.text }; });
    }
    /* Every "OPENS ..." the board could ever need, for sizing its tiles. */
    function openingTexts() {
      var out = [];
      HOURS.forEach(function (h, d) { if (h) { out.push(clockText(h[0] * 60), DAY_SHORT[d] + ' ' + clockText(h[0] * 60)); } });
      SPECIAL.forEach(function (s) { if (s && !s.closed && s.open != null) out.push(clockText(s.open * 60), 'Sun ' + clockText(s.open * 60)); });
      return out;
    }
    return { state: state, groups: groups, dayHours: dayHours, openingTexts: openingTexts, hours: HOURS, special: SPECIAL };
  }

  root.DD_HOURS = { create: create, clockText: clockText, durText: durText, localNow: localNow, dateAt: dateAt, DAY: DAY, DAY_SHORT: DAY_SHORT, DAY_LONG: DAY_LONG };
})(typeof window !== 'undefined' ? window : globalThis);
