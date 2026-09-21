/* Dubai & Dips - a lightweight event tracker.
   There was no analytics on the site, so this is the seam: every order
   button click and every demo step calls DD.track(name, props). Events go
   to whatever is present - window.dataLayer (GTM), gtag(), plausible() -
   and, when DD_CONFIG.ANALYTICS_ENDPOINT is set, are posted there with
   sendBeacon. Every event is also kept in DD.events for the pitch (open
   the console, type DD.events) so direct-order share can be measured once
   a real sink is chosen. */
(function () {
  'use strict';
  var cfg = window.DD_CONFIG || {};
  var DD = window.DD = window.DD || {};
  DD.events = [];
  DD.track = function (name, props) {
    var ev = { name: name, props: props || {}, ts: Date.now(), page: location.pathname };
    DD.events.push(ev);
    if (DD.events.length > 200) DD.events.shift();
    try {
      if (Array.isArray(window.dataLayer)) window.dataLayer.push({ event: name, dd: ev.props });
      if (typeof window.gtag === 'function') window.gtag('event', name, ev.props);
      if (typeof window.plausible === 'function') window.plausible(name, { props: ev.props });
      if (cfg.ANALYTICS_ENDPOINT) {
        var body = JSON.stringify(ev);
        if (navigator.sendBeacon) navigator.sendBeacon(cfg.ANALYTICS_ENDPOINT, body);
        else fetch(cfg.ANALYTICS_ENDPOINT, { method: 'POST', body: body, keepalive: true, headers: { 'Content-Type': 'application/json' } });
      }
      if (cfg.DEMO && window.console && console.debug) console.debug('[dd]', name, ev.props);
    } catch (e) { /* analytics must never break the page */ }
    return ev;
  };
})();
