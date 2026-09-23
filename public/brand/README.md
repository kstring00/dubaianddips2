# Dubai & Dips brand assets

Lifted from *Dubai & Dips Branding & Guidelines* (InDesign PDF, Oct 2025).
Every path is the PDF's own vector geometry, shifted to the origin and
rounded to 0.01pt. Nothing was redrawn, traced or re-fitted: minification
(svgo) runs with curve conversion off, and each file was rendered and
diffed against the PDF at 8x (primary, stacked, logomark, star: 0 pixels
off beyond anti-aliasing).

## Files

| Folder | What | From PDF page |
| --- | --- | --- |
| `logo/primary-*` | Primary logo, Burj Khalifa as the "i" | 2 (black master) |
| `logo/stacked-*` | Secondary, stacked logo | 7 (black master) |
| `logo/logomark-*` | "D" + star logomark | 4 (black master) |
| `star/star-*` | The four-pointed star alone | 4 (from the logomark) |
| `pattern/*` | Star pattern, one seamless tile (62.8 x 64.61) | 12 |
| `boarding-pass/bpass-*` | Italy (FCO), Turkey (IST), Dubai (DXB), Europe (EUR) | 13 |

### Colourways (each logo)

| Suffix | Ink | Burj / star | Use on |
| --- | --- | --- | --- |
| `-bark` | Bark | Browned Sugar | light grounds (transparent) |
| `-offwhite` | Off-White | Mint Condition | Courtyard or Bark (transparent) |
| `-black` | black | black | one-colour use |
| `-on-light` | Bark | Browned Sugar | on its own Off-White panel |
| `-on-courtyard` | Off-White | Mint Condition | on its own Courtyard panel |
| `-on-bark` | Off-White | Mint Condition | on its own Bark panel |

The `-on-*` files include the protection area (cap height of the "D" on
every side) and the ground colour, ready for social avatars, slides, etc.

### Pattern

`pattern-sugar` is the tile the site uses, behind the menu only: Browned
Sugar strokes at 22% on the Off-White ground.
`pattern-on-courtyard` / `pattern-on-bark` are the two treatments the PDF
shows (stroke a shade darker on Courtyard at 18%, a shade lighter on Bark at
14%). `pattern-dark` / `pattern-light` are the same strokes on a transparent
tile, and `pattern-mask` is black for use as a CSS mask. Tile size is
62.8 x 64.61 units; keep that ratio when scaling it.

### Boarding passes

Text on the passes is outlined. The QR code is the only thing on the PDF
page that was a bitmap (153 px, anti-aliased); it was rebuilt as vector
squares by reading its 29 x 29 module grid, and the rebuilt code decodes to
the same address as the original: `https://www.instagram.com/dubaianddips/`.

## Colours (sampled from the swatches)

| Name | Sampled | Printed label |
| --- | --- | --- |
| Courtyard | `#475842` | 475842 |
| Mint Condition | `#C4DECC` | D1E3D2 (differs; swatch is CMYK 23/3/22/0) |
| Bark | `#4A3D36` | 493C35 (rounding) |
| Browned Sugar | `#9C774F` | C2835F (differs) |
| Off-White | `#FCFBF9` | E6DBC6 (differs; swatch is CMYK 1/1/2/0) |
| Natural Choice | `#E3DED0` | E3D3D0 (differs) |

The site uses the sampled values (see `/brand.css`) until the owner confirms.

## Rules (from the PDF)

Never stretch, recolour outside the palette, add effects or shadows, or
crowd the protection area. Stacked logo for vertical or square spaces,
primary logo for horizontal ones.
