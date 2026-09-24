/* Dubai & Dips - ordering configuration.
   ONE file for every ordering-related value on the site. Toast is the
   ordering engine; this site never takes a payment. Every Order button on
   every page reads its destination from here, the delivery card and the
   demo read their numbers from here, and the phone number on every page
   comes from here.

   Plain script, no build step: it sets window.DD_CONFIG before site.js,
   demo.js and the 404 page run. Keep it valid ES5 - it has to run on old
   phones.

   AFTER THE MEETING, fill in:
     TOAST_ORDER_URL   Aladdin's Toast Online Ordering link. It is set to
                       "/order-demo" for the pitch so every Order button on
                       the site lands on the branded demo. Swap it for the
                       Toast link and set DEMO to false. Delete nothing.
     TOAST_PICKUP_URL  optional: a Toast deep link straight to pickup
     TOAST_DELIVERY_URL optional: a Toast deep link straight to delivery
     TOAST_GROUP_URL   optional: a Toast group-ordering link
     PHONE             the shop's real number (the current one is the
                       placeholder that was already on the site)
     SHOP.address      the real street address (also a placeholder)
     HOURS             confirm against the door sign
     LINKS             googleReviews and privacyPolicy are still empty
     REWARDS_LIVE      true once Toast loyalty is switched on
     DEMO_ITEMS prices these are demo prices; no price on the boards was
                       legible, so confirm against the real menu
     DEMO_TAX_RATE     Houston combined sales tax, confirm with the accountant

   If TOAST_ORDER_URL is empty, no button goes dead: every Order button
   opens the "Ordering goes live soon" sheet with tap-to-call and the hours. */
window.DD_CONFIG = {
  /* Shows the "Demo" pill on /order-demo and logs events to the console.
     The pill is rendered from this flag, never from markup, so it cannot be
     removed by an accidental edit. */
  DEMO: true,

  /* ---- Toast links --------------------------------------------------- */
  TOAST_ORDER_URL: "/order-demo",   /* "" until Aladdin's Toast link exists; "/order-demo" for the pitch */
  TOAST_PICKUP_URL: "",             /* optional; falls back to TOAST_ORDER_URL */
  TOAST_DELIVERY_URL: "",           /* optional; falls back to TOAST_ORDER_URL */
  TOAST_GROUP_URL: "",              /* optional; falls back to TOAST_ORDER_URL */

  /* ---- The shop ------------------------------------------------------ */
  PHONE: { display: "(281) 555-0147", tel: "+12815550147" },
  SHOP: {
    name: "Dubai & Dips",
    area: "Clear Lake",
    city: "Houston",
    address: "1234 Bay Area Blvd, Suite 100, Houston, TX 77058",
    timezone: "America/Chicago"
  },

  /* ---- Hours: the ONE source ------------------------------------------
     Everything that shows or depends on the hours reads this: the nav's
     "Open until", the departures board (NOW BOARDING / FINAL CALL / OPENS),
     the footer gate, the Visit table, the ordering sheet and the demo's
     pickup times. Open or closed is always worked out in SHOP.timezone,
     never the visitor's own clock.
     Index is day of week, 0 = Sunday. [open, close] in 24-hour shop time;
     half hours are fine (9.5 is 9:30). A close of 24 is midnight: open to
     the end of that day. A close earlier than the open runs past midnight
     (e.g. [18, 2]). null means closed all day. The "Mon to Thu" style rows
     are grouped from this automatically. */
  HOURS: [[10, 22], [9, 22], [9, 22], [9, 22], [9, 22], [9, 24], [9, 24]],
  /* The board's row 1 says FINAL CALL for this many minutes before close. */
  CLOSING_SOON_MINUTES: 30,

  /* ---- Links: the ONE source ------------------------------------------
     Every footer link (and the social wall) reads these. The phone comes
     from PHONE above and Order ahead from TOAST_* above. An empty value
     hides its link rather than leaving a dead one - fill it in and the
     link appears. */
  LINKS: {
    directions: "https://www.google.com/maps/dir/?api=1&destination=Dubai+and+Dips+Clear+Lake+Houston+TX",
    instagram: "https://www.instagram.com/dubaianddips/",
    tiktok: "https://www.tiktok.com/@dubai.dips",
    catering: "#contact",
    googleReviews: "",   /* MISSING: the Google Business "Leave a review" link (g.page/r/.../review) */
    privacyPolicy: ""    /* MISSING: there is no privacy policy page yet */
  },

  /* ---- Delivery ------------------------------------------------------ */
  DELIVERY_MINIMUM: 15,
  DELIVERY_RADIUS_MILES: 5,
  /* The fee for an order at or above `min`. Sorted ascending; the last tier
     that the subtotal reaches is the one that applies. */
  DELIVERY_FEE_TIERS: [{ min: 15, fee: 4.99 }, { min: 25, fee: 2.99 }, { min: 40, fee: 0 }],
  GROUP_ORDER_MINIMUM: 50,

  /* Rewards are labelled "coming soon" until Toast loyalty is on. */
  REWARDS_LIVE: false,

  /* ---- Copy ---------------------------------------------------------- */
  COPY: {
    pickupCta: "Order ahead for pickup",
    pickupShort: "Order pickup",
    orderShort: "Order",
    deliveryCta: "Or get it delivered",
    deliveryTitle: "Delivery, done right.",
    deliveryCover: "We cover part of the driver cost so ordering direct costs you less than the apps.",
    pickupLine: "Prefer pickup? It's ready when you walk in.",
    whyTitle: "Why order direct",
    why: [
      { title: "Cheaper than the apps", text: "No third-party markup on the menu, and a lower delivery fee." },
      { title: "Straight to our kitchen", text: "Your order prints on our ticket rail the second you place it." }
    ],
    groupTitle: "Treat your office",
    groupText: "One link, everyone picks, one payment, and it all arrives together.",
    groupCta: "Start a group order",
    soonTitle: "Ordering goes live soon.",
    soonText: "Online ordering is on its way. Until then, call and we'll have it ready when you walk in.",
    callCta: "Call"
  },

  /* ---- Analytics ----------------------------------------------------- */
  /* Optional: a URL that accepts a POST of {name, props, ts} per event
     (a Vercel function, a Google Sheet webhook, anything). Events also go
     to window.dataLayer, gtag() and plausible() when those exist. */
  ANALYTICS_ENDPOINT: "",

  /* ---- Demo route (/order-demo) -------------------------------------- */
  DEMO_TAX_RATE: 0.0825,
  DEMO_TIPS: [0, 0.10, 0.15, 0.20],
  DEMO_SLOT_MINUTES: 15,
  DEMO_PREP_MINUTES: 15,
  /* Six real items from the site. Prices are DEMO placeholders - the boards
     in the shop do not show a legible price. One modifier each. */
  DEMO_ITEMS: [
    { id: "dubai-frappe", name: "Dubai Chocolate Frappe", category: "The Frappes", price: 8.50,
      image: "/assets/rev-dubai-frappe.webp",
      alt: "The Dubai Chocolate Frappe in a clear cup, whipped cream with pistachio and dark chocolate drizzled over the top.",
      modifier: { label: "Size", options: [{ name: "16 oz", delta: 0 }, { name: "20 oz", delta: 1.00 }] } },
    { id: "pistachio-frappe", name: "Pistachio Frappe", category: "The Frappes", price: 7.75,
      image: "/assets/rev-pistachio-frappe.webp",
      alt: "A pistachio frappe in a clear cup, whipped cream on top with green pistachio sauce drizzled over it.",
      modifier: { label: "Size", options: [{ name: "16 oz", delta: 0 }, { name: "20 oz", delta: 1.00 }] } },
    { id: "biscoff-frappe", name: "Biscoff Frappe", category: "The Frappes", price: 7.75,
      image: "/assets/rev-biscoff-frappe.webp",
      alt: "A Biscoff frappe in a clear cup, cookie butter swirled through it with whipped cream and a whole Biscoff cookie on top.",
      modifier: { label: "Size", options: [{ name: "16 oz", delta: 0 }, { name: "20 oz", delta: 1.00 }] } },
    { id: "strawberry-matcha", name: "Strawberry Matcha", category: "The Matchas", price: 7.25,
      image: "/assets/rev-strawberry-matcha.webp",
      alt: "A strawberry matcha in a clear cup, a pink strawberry layer over green matcha with matcha dusted on the foam.",
      modifier: { label: "Milk", options: [{ name: "Whole", delta: 0 }, { name: "Oat", delta: 0.75 }, { name: "Almond", delta: 0.75 }] } },
    { id: "spanish-latte", name: "Spanish Latte", category: "The Lattes", price: 6.50,
      image: "", initial: "S",
      alt: "",
      modifier: { label: "Milk", options: [{ name: "Whole", delta: 0 }, { name: "Oat", delta: 0.75 }, { name: "Almond", delta: 0.75 }] } },
    { id: "kunafa", name: "Kunafa", category: "D&D Desserts", price: 9.00,
      image: "/assets/rev-kunafa.webp",
      alt: "A round kunafa on a gold board, crisp golden pastry with a mound of crushed green pistachio in the middle.",
      modifier: { label: "Size", options: [{ name: "Single", delta: 0 }, { name: "Family (serves 4)", delta: 18.00 }] } }
  ]
};
