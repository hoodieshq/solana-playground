# The brand icons

The page icon, the home-screen icon and the install icons, rendered by design
(Almaz, 4 Nov 2026, HOO-2568) from the triangle-and-circle mark on the brand
gradient. They replace upstream's `favicon.ico`, `logo192.png` and
`manifest.json` in `public/` whenever `scripts/update-static.mjs` runs, through
`scripts/static-overlay.mjs`; `scripts/brand-head.mjs` then points the
mirrored `index.html` at them and sets `theme-color`.

| File | Used for |
| --- | --- |
| `favicon.ico` | 16 and 32 px tab icon; what crawlers read |
| `favicon.svg` | tab icon in browsers that take SVG |
| `favicon-96x96.png` | larger tab and shortcut icon |
| `apple-touch-icon.png` | iOS home screen, 180 px, square and opaque: iOS rounds it |
| `icon-192.png`, `icon-512.png` | manifest icons, purpose `any` |
| `icon-maskable-512.png` | manifest icon, purpose `maskable` (Android crops it) |

`#101011` in `manifest.json` and `theme-color` is the design system's
`--background` (dark theme), the product's ground. A new render replaces the
file here under the same name.
