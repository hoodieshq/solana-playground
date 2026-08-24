# Solana brand research — for the redesign

**Date:** 2026-08-19 · **Feeds:** `themes/solana-v2` (see the redesign spec)
Sources: `solana.com/branding` and the CSS solana.com actually serves
(`/_next/static/css/*` on 2026-08-19), which is more honest than the brand page.

## What the brand is

- **Official colors:** Solana Purple `#9945FF`, Solana Green `#14F195` — both
  confirmed ~30× each in production CSS, so they are working values, not
  poster values.
- **The canonical gradient, verbatim from their CSS:**
  `linear-gradient(135deg, #9945ff 10%, #14f195 90%)`. We use exactly this
  recipe wherever the gradient is allowed.
- **Dark surfaces are purple-tinted, not neutral:** production backgrounds are
  `#1d1a23`, `#1b1622`, `#26232c`, over `#000`. Not blue-gray — a violet-black
  family.
- **Borders and hovers are lavender-white at low alpha:** `#ece4fd` at 12–20%
  (`#ece4fd1f`, `#ece4fd33`) rather than pure white. A small authentic detail
  worth copying — it is what makes their dark UI feel warm instead of gray.
- **Typography:** proprietary — `Diatype` (ABC Diatype) as the primary
  grotesque, `ABC Mono`/`DSemi` for mono, `Monument` for display. And — the
  decisive find — **`Space Grotesk` appears in solana.com's own font stacks**,
  shipped by them.
- **Shape language:** border-radius distribution in their CSS clusters at
  `.5rem`/`.75rem`/`1rem`/`16px` with `9999px` pills for buttons. The logomark
  is three parallelograms; angular, speed-themed. Never distort the logo, keep
  clearspace (brand page).
- Full brand guide exists as a Google Doc linked from `solana.com/branding`;
  assets (SVG/PNG) in their public Drive.

## Chosen tokens

| Token | Value | Source |
| --- | --- | --- |
| bgBase (chrome: rail, topbar, status) | `#000000` | brand base, their site base |
| bgSurface (editor, panels) | `#0F0D13` | violet-black family, sits between #000 and #1d1a23 |
| bgRaised (cards, inputs, menus) | `#1A1721` | tuned from their `#1d1a23` |
| bgHover | `#262230` | tuned from their `#26232c` |
| border | `rgba(236, 228, 253, 0.12)` | their `#ece4fd1f/33` trick |
| borderStrong | `rgba(236, 228, 253, 0.2)` | — |
| purple / green | `#9945FF` / `#14F195` | official |
| cyan (info) | `#80ECFF` | kept from the existing solana theme |
| textPrimary | `#ECEBF1` | slightly lavender white, ~93% |
| textSecondary | `#9C98A9` | violet-gray |
| error / warning | `#FF4D6A` / `#FFD666` | tuned to sit in the palette |
| gradient | `linear-gradient(135deg, #9945ff 10%, #14f195 90%)` | verbatim from their CSS |
| radius default / cards / buttons | `12px` / `16px` / `9999px` (pill) | their radius distribution |
| font.other (display/UI) | **Space Grotesk** (Google Fonts) | in solana.com's own stacks |
| font.code | JetBrains Mono (kept) | ships with the app; IDE identity |

## Substitutions

- **Diatype → Space Grotesk.** Diatype is proprietary (ABC Dinamo license).
  Space Grotesk is open (OFL), on Google Fonts, and solana.com itself ships it
  in font stacks — the closest legitimate substitute by both letterform and
  provenance. Rejected: Archivo (blander, less techy), Instrument Sans (too
  neutral), Inter (overused default, banned by our own design guidance).
- **ABC Mono/DSemi → JetBrains Mono.** Already bundled, already the editor
  font, monospace identity of the IDE preserved. No change.

## Gradient policy

The `135deg` brand gradient appears in exactly three places and nowhere else:

1. The single primary CTA of a view (one per screen).
2. Progress indication (build/deploy progress bar — the theme already routes
   this through `components.progressbar.indicator.bg`).
3. The active-page indicator on the icon rail.

Everything else uses flat `#9945FF` (interactive/brand) or `#14F195`
(success/positive) — the gradient loses meaning if it is wallpaper.
