# Flow visual-parity screenshots

Captured against the `flow-demo` Anchor project at 1440x900 (the browser
reports a scaled 1568x708 viewport), dev server on `:3000`, build server
set to `SolPg` via the gear settings, Solana V2 theme. One app screenshot
per board, named to sit next to it.

- `01-write.png` / `board-write.png` — Write stage: floating header
  (logomark, project switcher, stepper, cluster/wallet/gear chips), the
  bare `FILES` tree with `+ New file`, the editor, the permanent assistant
  column with its `Assistant` eyebrow and tab strip.
- `02-build-failed.png` / `board-build-fails.png` — Build stage after
  breaking `src/lib.rs` with `let x: u64 = "1";` in `initialize`, built via
  the console (`build`): the humanized E0308 card ("A text value is
  assigned to a number") with the real-source excerpt, inline `<- expected
  u64, found &str` label, "Fix with assistant" / "Open in editor" / "Show
  compiler output". The fixture was removed and the project rebuilt clean
  afterwards.
- `03-interact.png` / `board-interact.png` — Interact stage: the header
  meta line, deployment selector and Upload IDL toolbar match the board.
  The content area does not: this session's wallet holds 0 SOL and the
  devnet faucet returned 429 ("airdrop limit ... faucet has run dry"), so
  the seeded deploy-history record (`decisions.md` D17 — the store is
  real, this entry is not a program actually on chain; confirmed via a
  direct `getAccountInfo` call returning `null`) cannot be deployed for
  real in this pass. The panel honestly reports "Program is not
  deployed." rather than fabricate a populated test panel.

## Matched

- Floating panels: gutters, 1px border, corner radius, raised background
  on all three columns (left/center/right) and the console drawer sitting
  inside the center panel rather than as its own box.
- Header: gradient logomark, project switcher, centered pill stepper with
  shape-coded status (check / dot / ring, not color alone), right-aligned
  cluster/wallet/gear chips.
- Left panel: bare `FILES` tree (workspace picker, icon toolbar and
  per-section Build/Deploy/Run/Test buttons hidden via the documented
  selectors) plus a plain `+ New file` footer button.
- Console: collapsed to a one-line status handle (`CONSOLE · <status>`)
  instead of a permanently open pane.
- Build: humanized error card language ("A text value is assigned to a
  number") over raw rustc text, with a real-source excerpt around the
  failing line instead of only the compiler's own gutter snippet.
- Assistant: header eyebrow + live chips (active file, build/cluster
  status) above the tab strip, matching the board's compact assistant
  column treatment.
- Deploy / Interact: card language for "Latest deployment" / "History",
  and a header meta line (`cluster · N deployments`, `latest · cluster ·
  id`) instead of a bare toolbar.

## Not matched (left for later, see D18)

- Editor tab strip: `01-write.png` shows a single open file with no visible
  tab row; the board sketches a tab strip. Upstream's `EditorWithTabs`
  chrome was not touched.
- Syntax highlighting inside the Build stage's real-source excerpt: plain
  monospace text, not the editor's own tokenizer.
- Assistant internals (chat bubbles, composer, backend picker): only the
  header chips were aligned to the board language; the rest is
  unchanged from the prior iteration.
- `Test.tsx` account/instruction cards on Interact: not exercised in this
  pass (see `03-interact.png` above) — the toolbar and header match, the
  populated card layout is unverified against the board.
