#!/usr/bin/env python3
"""Build the social wall's poster images.

For every post in assets/social/posts.json whose poster JPG exists, write
two 9:16 WebP crops next to it:

    social-01.jpg  ->  social-01-720.webp   (720 wide)
                       social-01-1080.webp  (1080 wide)

The crop centres on the post's "focus" (the same "x% y%" the page uses as
object-position). A crop is never upscaled: if the photo is smaller than
the target width, that file is written at the photo's own size, so a
landscape phone shot (765 tall -> 430 wide at 9:16) gives two 430-wide
files until a larger original arrives. The JPG stays as the fallback.

    python3 scripts/social-posters.py

Needs Pillow (pip install pillow). Not part of the deploy.
"""
import json
import os
import sys

from PIL import Image, ImageOps

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
POSTS = os.path.join(ROOT, 'assets', 'social', 'posts.json')
WIDTHS = (720, 1080)


def focus(value):
    try:
        x, y = (float(v.strip().rstrip('%')) / 100 for v in value.split())
    except (AttributeError, ValueError):
        x, y = .5, .5
    return min(max(x, 0), 1), min(max(y, 0), 1)


def crop916(im, fx, fy):
    w, h = im.size
    if w * 16 > h * 9:                       # too wide: keep full height
        cw, ch = round(h * 9 / 16), h
    else:                                    # too tall: keep full width
        cw, ch = w, round(w * 16 / 9)
    left = round(min(max(fx * w - cw / 2, 0), w - cw))
    top = round(min(max(fy * h - ch / 2, 0), h - ch))
    return im.crop((left, top, left + cw, top + ch))


def main():
    with open(POSTS, encoding='utf-8') as f:
        posts = json.load(f)
    missing = []
    for post in posts:
        src = os.path.join(ROOT, post['poster'])
        if not os.path.exists(src):
            missing.append(post['poster'])
            continue
        im = ImageOps.exif_transpose(Image.open(src)).convert('RGB')
        c = crop916(im, *focus(post.get('focus')))
        stem = os.path.splitext(src)[0]
        for w in WIDTHS:
            out = c if c.width <= w else c.resize((w, round(w * 16 / 9)), Image.LANCZOS)
            out.save('%s-%d.webp' % (stem, w), 'WEBP', quality=80, method=6)
        print('%-32s %dx%d crop -> %s' % (post['poster'], c.width, c.height,
              ', '.join('%d' % min(w, c.width) for w in WIDTHS)))
    for m in missing:
        print('missing: %s (the card shows its typographic pass until the photo is added)' % m)
    return 0


if __name__ == '__main__':
    sys.exit(main())
