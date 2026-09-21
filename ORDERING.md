# Online ordering

Toast is the ordering engine. This site never takes a payment: every Order
button sends the customer to Toast's hosted ordering page, and until that
link exists every Order button opens the "Ordering goes live soon" sheet
(tap-to-call plus the hours) instead of going anywhere dead.

Everything ordering-related is read from **`config/ordering.js`**. No fee,
minimum, radius, phone number or Toast link lives anywhere else.

## After the meeting: values to fill in

| Key | Now | Set it to |
| --- | --- | --- |
| `TOAST_ORDER_URL` | `"/order-demo"` (pitch: every Order button lands on the branded demo) | Aladdin's Toast Online Ordering link |
| `DEMO` | `true` (shows the Demo pill on `/order-demo`, logs events to the console) | `false` |
| `TOAST_PICKUP_URL` | `""` | Toast deep link straight to pickup, if Toast gives one; otherwise leave empty (falls back to `TOAST_ORDER_URL`) |
| `TOAST_DELIVERY_URL` | `""` | Toast deep link straight to delivery, same rule |
| `TOAST_GROUP_URL` | `""` | Toast group-ordering link once one exists; until then the "Treat your office" card uses `TOAST_ORDER_URL` |
| `PHONE` | `(281) 555-0147` / `+12815550147` | the shop's real number (this is the placeholder that was already on the site) |
| `HOURS` / `HOURS_LABELS` | placeholder hours from the old markup | the real hours; the nav, footer, sheet and demo time picker all follow |
| `SHOP.address`, `SHOP.directions` | placeholder address | the real address and Google Maps link |
| `REWARDS_LIVE` | `false` (rewards labelled "Coming soon") | `true` once Toast loyalty is on |
| `ANALYTICS_ENDPOINT` | `""` | optional: a URL that accepts a JSON POST per event (see below) |
| `DEMO_ITEMS[].price` | demo prices | real menu prices (no price on the boards was legible) |
| `DEMO_TAX_RATE` | `0.0825` | confirm Houston combined sales tax |

Already set as asked: `DELIVERY_MINIMUM: 15`, `DELIVERY_RADIUS_MILES: 5`,
`DELIVERY_FEE_TIERS: [{min:15, fee:4.99}, {min:25, fee:2.99}, {min:40, fee:0}]`,
`GROUP_ORDER_MINIMUM: 50`.

## Where the Order buttons are

Every element with `data-order="pickup|delivery|group"` is an Order button:
header, hero (opening state and landing copy), the featured item, every
menu item and every category on the board, the delivery card, the group
card, the Visit section, the footer, the phone thumb bar, and the 404 page.
`site.js` sets each one's `href` from config. With a URL, the click opens
Toast in the same tab on a phone and a new tab on a desktop. Without one,
the click opens the sheet.

## Analytics

There was no analytics on the site. `track.js` adds `DD.track(name, props)`.
Every event goes to `window.dataLayer`, `gtag()` and `plausible()` when
those exist, to `ANALYTICS_ENDPOINT` when set, and is kept in `DD.events`
(open the console and type `DD.events`). Events:

- `order_click` `{mode, place, item, category, live, viewport}` on every Order button
- `order_sheet_open` `{place}` when the "goes live soon" sheet opens
- `call_click` `{place}` on the phone links that carry `data-call`
- `demo_open`, `demo_step_view`, `demo_step_complete` `{step 1..4, name}`, `demo_item_added`, `demo_restart` on `/order-demo`

## The demo route

`/order-demo` is a branded imitation of the Toast flow for the pitch: mode,
menu (six real items), cart (tax, tiered delivery fee, tip, time picker),
and the hand-off screen. No card inputs, no confirmation numbers, state in
memory only. It stays after the meeting; nothing needs deleting.

## Installable

`manifest.webmanifest`, `sw.js` and the icons in `assets/` make the site
installable. The service worker caches the shell, never a video and never
anything off this origin, so Toast pages are never cached.

## Checks

```
node scripts/check.mjs       # static checks + Playwright walk of every order button, both config states, the demo, 360px layout
node scripts/serve.mjs 8787  # local server with the same rewrites as vercel.json
```
