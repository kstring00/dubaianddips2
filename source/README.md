# Source files

The originals the site was built from. Nothing in here is served: the site is
`index.html`, `site.js`, `404.html` and `assets/`, and this folder stays out
of the deploy (see `.vercelignore`).

| File | What it is | Where it ended up |
| --- | --- | --- |
| `herovideo.mp4` | 1920x1080, 5.04s, 24fps, no audio. The first Higgsfield push-in. | Retired. The hero is now the chocolate-bar film (`assets/hero.mp4`, poster `assets/hero-poster.webp`, share card `assets/og.jpg` from its last frame). |
| `herodd.jpg` | The room photo, 1360x765. | `assets/social/social-04.jpg`, the green-wall card on the social wall. |
| `ddd.jpg` | Frappe with whipped cream and both a pistachio and a dark chocolate drizzle. | `assets/menu-dubai-frappe.webp`, the featured panel at the top of the menu, and `assets/social/social-02.jpg`. Used as the Dubai Chocolate Frappe on the strength of the visual match with the hero panel on the in-store board. **Confirm this is that drink and not the Pistachio Frappe.** |
| `biscoff.jpg` | Biscoff frappe studio shot. | `assets/social/social-06.jpg` on the social wall. It is also the obvious photo for a future The Frappes card. |
| `foodd-lineup.jpg` | The six drink lineup. | `assets/social/social-03.jpg` on the social wall. The right-hand cup crops cleanly to a strawberry matcha (pink over green, matcha on the foam) and is the obvious photo for a future The Matchas card. |
| `safforn.jpg` | Kunafa on a gold board. | `assets/menu-kunafa.webp`, the image at the top of the D&D Desserts panel, and `assets/social/social-01.jpg`. |
| `unnamed.jpg` | Counter shot: pistachio gelato, branded cup and bag. | `assets/social/social-05.jpg` on the social wall, where a phone snapshot fits. |

The two Higgsfield films (the chocolate bar opening into the room, and the
matcha cup coming apart) were delivered as 1280-wide H.264 with a single
keyframe and B-frames, which cannot be scrubbed smoothly. They are re-encoded
into `assets/` and the originals are not kept in the repo.

## Photography still needed

The menu category cards are typographic on the green because there is no
shop photography for them. A photo for any of these drops straight in:
Classic Coffees, The Matchas, The Lattes, The Frappes, The Refreshers,
The Smoothies, Breakfast Bites, The Crepes, The Waffles. Shoot them the way
`biscoff.jpg` and `ddd.jpg` were shot: one item, marble surface, plain
background, natural light. No AI food imagery in the menu section, because
it renders the wordmark on the cups differently in every frame.

## How the films are encoded

A short keyframe interval and no B-frames are what make scrubbing land on the
right frame instead of decoding from the start of the file on every scroll.
`-movflags +faststart` puts the index at the front so the first frame shows
before the whole file arrives.

```
ffmpeg -i film.mp4 -an -vf "scale=1280:-2" -c:v libx264 -profile:v high \
  -pix_fmt yuv420p -g 8 -keyint_min 8 -sc_threshold 0 -bf 0 -crf 27 \
  -preset slow -tune film -movflags +faststart assets/hero.mp4

ffmpeg -i film.mp4 -vf "select='eq(n\,0)',scale=1280:-2" -frames:v 1 \
  -c:v libwebp -quality 82 assets/hero-poster.webp
```
