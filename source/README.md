# Source files

The originals the site was built from. Nothing in here is served: the site is
`index.html`, `site.js`, `404.html` and `assets/`, and this folder stays out
of the deploy (see `.vercelignore`).

| File | What it is | Where it ended up |
| --- | --- | --- |
| `herovideo.mp4` | 1920x1080, 5.04s, 24fps, no audio. The first Higgsfield push-in. | Retired. The hero is now the chocolate-bar film (`assets/hero.mp4`, `assets/hero.webm`, poster `assets/hero-poster.webp`, share card `assets/og.jpg` from its last frame). |
| `herodd.jpg` | The room photo, 1360x765. | Not shipped since the video hero. Keep it for print or socials. |
| `biscoff.jpg` | Biscoff frappe studio shot. | `assets/known-biscoff.webp` |
| `ddd.jpg` | Pistachio and chocolate frappe studio shot. | `assets/known-pistachio.webp` |
| `foodd-lineup.jpg` | The six drink lineup. | `assets/known-lineup.webp` |
| `safforn.jpg` | Kunafa on a gold board. | Not shipped at the moment. |
| `unnamed.jpg` | Counter shot: pistachio gelato, branded cup and bag. | Not shipped at the moment. |

The two Higgsfield films (the chocolate bar opening into the room, and the
matcha cup coming apart) were delivered as 1280-wide H.264 with a single
keyframe and B-frames, which cannot be scrubbed smoothly. They are re-encoded
into `assets/` and the originals are not kept in the repo.

## How the films are encoded

A short keyframe interval and no B-frames are what make scrubbing land on the
right frame instead of decoding from the start of the file on every scroll.
`-movflags +faststart` puts the index at the front so the first frame shows
before the whole file arrives.

```
ffmpeg -i film.mp4 -an -vf "scale=1280:-2" -c:v libx264 -profile:v high \
  -pix_fmt yuv420p -g 8 -keyint_min 8 -sc_threshold 0 -bf 0 -crf 27 \
  -preset slow -tune film -movflags +faststart assets/hero.mp4

ffmpeg -i film.mp4 -an -vf "scale=1280:-2" -c:v libvpx-vp9 -g 8 -keyint_min 8 \
  -lag-in-frames 0 -auto-alt-ref 0 -crf 40 -b:v 0 -deadline good -cpu-used 2 \
  -row-mt 1 assets/hero.webm

ffmpeg -i film.mp4 -vf "select='eq(n\,0)',scale=1280:-2" -frames:v 1 \
  -c:v libwebp -quality 82 assets/hero-poster.webp
```
