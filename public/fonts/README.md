# Fonts

Self-hosted from here (Google Fonts, SIL Open Font License), standing in for
the licensed brand faces until their web fonts arrive:

| Brand font | Stand-in | File |
| --- | --- | --- |
| Neue Regrade (titles, body, nav, buttons) | Albert Sans | `albert-sans.woff2` |
| Gotham SSm Narrow (eyebrows, small labels) | Encode Sans, semi-condensed | `encode-sans.woff2` |
| Editor's Note italic (accent words, marquee) | Playfair Display Italic | `playfair-display-italic.woff2` |

IvyMode is not loaded: it lives only inside the logo artwork. The
split-flaps and boarding-pass details use the system monospace.

## Switching to the licensed fonts

1. Drop the licensed `.woff2` files in this folder with these names (or
   edit the paths in the `@font-face` rules at the top of `/brand.css`):
   `NeueRegrade-Light.woff2`, `NeueRegrade-Regular.woff2`,
   `NeueRegrade-Medium.woff2`, `NeueRegrade-Semibold.woff2`,
   `GothamSSmNarrow-Book.woff2`, `GothamSSmNarrow-Medium.woff2`,
   `EditorsNote-Italic.woff2`.
2. In `/brand.css`, under "THE FONT SWITCH", replace the one `:root{...}`
   line with the commented line below it.
3. Optional, for speed: point the two `<link rel="preload" as="font">` tags
   in `index.html` and `order-demo.html` at the new files.
