# Source files

The originals the site was built from. Nothing in here is served: the site is
`index.html` plus `assets/`, and these stay out of the deploy.

| File | What it is | Where it ended up |
| --- | --- | --- |
| `herovideo.mp4` | 1920x1080, 5.04s, 24fps, no audio. The Higgsfield push-in. | `assets/hero.mp4` (scrub encode), `assets/hero-poster.jpg`, `assets/hero-poster-mobile.jpg`, `assets/hero-end.webp` |
| `herodd.jpg` | The still the video was generated from. | Superseded by frames pulled from the video, which are higher resolution. |
| `biscoff.jpg` | Biscoff frappe studio shot. | `assets/known-biscoff.webp` |
| `ddd.jpg` | Pistachio and chocolate frappe studio shot. | `assets/known-pistachio.webp` |
| `foodd&d.jpg` | The six drink lineup. | `assets/known-lineup.webp` |
| `safforn.jpg` | Kunafa on a gold board. | `assets/craft-kunafa.webp` |
| `unnamed.jpg` | Counter shot: pistachio gelato, branded cup and bag. | `assets/craft-gelato.webp` |
| `Untitled.png` | Not used. | Not shipped. |

## How the video was encoded

A short keyframe interval and no B frames are what make scrubbing land on the
right frame instead of the nearest keyframe.

```
ffmpeg -i herovideo.mp4 -an -vf "scale=1920:-2" -c:v libx264 -profile:v high \
  -pix_fmt yuv420p -g 6 -keyint_min 6 -sc_threshold 0 -bf 0 -crf 25 \
  -preset slow -movflags +faststart assets/hero.mp4
```

8.8 MB in, 2.4 MB out, 21 keyframes across 121 frames.
