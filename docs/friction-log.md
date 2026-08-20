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

## 2026-08-20 — provider presets

- **Preset model ids rot silently.** `gemini-2.5-flash` was retired for new
  keys, so the Gemini preset failed on the first send with no warning before
  it. Nothing validates the id at connect time; the id is only editable, not
  checked. See D11.
- **What worked:** `openai.ts` forwards 300 chars of the error body verbatim,
  and Google's 404 names its own migration target — the diagnosis took one
  paste. Worth keeping that passthrough when the error surface gets nicer.
- **Vendor pricing pages lag their own model list.** Google's docs present
  3.6 Flash as current while the pricing page carries no numbers for it, so
  the research table records `n/d` rather than a guess.

## 2026-08-19 — assistant build (earlier)

- **The client discards raw compiler output** — only a boolean and a lossy
  terminal print survive a build. The assistant needed a capture module
  (D4); upstream could expose this on `PgProgramInfo`.
- **Build-server paths carry a per-session uuid prefix** that must be
  stripped before any model (or person) reads them.
- **Monaco models are reused on reopen**, so writing a file that is open in a
  tab does not refresh the editor without an explicit model sync.

## 2026-08-20 — Gemini's OpenAI-compatible shim

- **It omits `index` on tool-call deltas.** The loop accumulated calls as
  `calls[part.index]`, so an undefined index wrote a property named
  `"undefined"` onto the array, `calls.length` stayed `0`, and the finished
  message carried no `tool_calls`. The tool never ran, no text arrived, and the
  empty bubble was discarded — a turn that looked like a hang after the dots.
  The request itself was a clean 200 with a valid `list_files` call in it.
  Fixed with `part.index ?? calls.length`, which also covers OpenAI's indexed
  fragments.
- **It reports `finish_reason: "stop"` on a turn that called a tool**, where
  OpenAI reports `"tool_calls"`. Anything branching on `finish_reason` would
  read that as "the model is done".
- **Thought signatures are mandatory on the round trip.** Gemini 3 returns
  `extra_content.google.thought_signature` on a tool-call delta and rejects the
  follow-up request with a 400 if it does not come back. Echoed verbatim; the
  blob is encrypted, so nothing may reformat it. Not in the docs we could find
  — the error message is the only source.
- **A turn that returns neither text nor a tool call is now reported.** It
  used to end silently, which is indistinguishable from a hang.
- **Free-tier quota is small enough to exhaust in a working session** (429
  from AI Studio keys). Fine for one walkthrough, not for iterating on the
  panel — the local mock in the notes below is cheaper.
- **Testing the wire format needs no key.** A ~100-line node script replaying
  the shim's exact SSE shape (indexless `tool_calls`, `finish_reason: "stop"`,
  a thought signature) against the OpenAI-compatible backend at a
  `localhost` base URL reproduced all of the above and verified each fix. Worth
  keeping that trick for the next shim.
