# Friction log

Things the environment made harder than they should be. Collected while
working, per the product brief's traceability principle.

## 2026-08-19 — redesign night

- **Themes could not change typography.** `ThemeParam` never declared the
  `font` override even though the defaults machinery honors one
  (`font.other ??=`). Fixed in place (type addition to
  `utils/theme/interface.ts`).
- **Monaco rejects theme names with spaces** (`Illegal theme name!`), which
  silently constrained every playground theme to a single word. Fixed by
  kebab-casing the name Monaco registers (`Monaco.tsx`).
- **Changing the default theme did nothing for existing browsers** —
  `PgTheme.set` writes the current theme name to `localStorage` on every load,
  so the old default was pinned everywhere. Fixed with a one-time storage
  migration; an explicit later choice sticks.
- **`components/Topbar` is dead code** — imported nowhere; the only `<Topbar>`
  in the tree is a local styled name inside `Secondary.tsx`. Upstream cleanup
  candidate.
- **Monaco color maps only accept hex** — an `rgba()` border token reached
  Monaco and rendered as a wrong bright fallback with no error. All theme
  tokens that can reach Monaco use 8-digit hex.

## 2026-08-20 — redesign iteration 2

- **Rail buttons are divs** (`SidebarButton.tsx`) — no keyboard focus, no
  `aria-label` beyond the tooltip. Restyled in this pass but not made
  accessible; a small upstream-worthy fix.
- **Explorer rows don't truncate** — a long filename overflows the row
  rather than ellipsizing. Pre-existing; became more visible with rounded
  row pills.
- **The approval card scrolls as a whole inside the chat** — when a diff is
  tall, the Apply/Reject actions scroll out of view with it. The diff body
  should own the scrolling, capped, with actions pinned. Assistant-panel
  follow-up, not a redesign item.
- **Native `color-scheme` was never set** — scrollbars and form controls
  followed the OS scheme regardless of theme. Fixed in `PgTheme.set` for all
  themes.

## 2026-08-19 — assistant build (earlier)

- **The client discards raw compiler output** — only a boolean and a lossy
  terminal print survive a build. The assistant needed a capture module
  (D4); upstream could expose this on `PgProgramInfo`.
- **Build-server paths carry a per-session uuid prefix** that must be
  stripped before any model (or person) reads them.
- **Monaco models are reused on reopen**, so writing a file that is open in a
  tab does not refresh the editor without an explicit model sync.
