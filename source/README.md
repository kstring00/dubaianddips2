# Source files

The originals the site was built from. Nothing in here is served: the site is
`index.html` plus `assets/`, and these stay out of the deploy.

| File | What it is | Where it ended up |
| --- | --- | --- |
| `herovideo.mp4` | 1920x1080, 5.04s, 24fps, no audio. The Higgsfield push-in. | Retired with the video hero. `assets/hero-poster.jpg` and `assets/hero-poster-mobile.jpg` stay for the share card. |
| `herodd.jpg` | The room photo, 1360x765. The hero walks into it. | `assets/hero-room-1200.webp`, `hero-room-1920.webp`, `hero-room-2200.webp` (quality 80, the two larger ones are upscaled from 1360), and `hero-room-blur.webp` (1200 wide, pre-blurred for the foreground band). Stage B cut-outs would go in `assets/layers/`. |
| `biscoff.jpg` | Biscoff frappe studio shot. | `assets/known-biscoff.webp` |
| `ddd.jpg` | Pistachio and chocolate frappe studio shot. | `assets/known-pistachio.webp` |
| `foodd-lineup.jpg` | The six drink lineup. | `assets/known-lineup.webp` |
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
