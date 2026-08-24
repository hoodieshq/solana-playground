# Flow build screenshots

Captured at 1440x900, Solana V2 theme, build server set to SolPg. `01`-`03`
and `06`-`07` are fresh captures against a `flow-demo` Anchor project on
this pass; `04`, `05` and `08` are reused from
`.superpowers/sdd/2026-08-21-flow-build/` (deploy, interact, classic —
unaffected by this pass's explorer-buttons and patch-card fixes).

- `01-write.png` — Write stage: the editor with tabs, header stepper on
  Write, permanent assistant column.
- `02-build-failed.png` — Build stage after breaking `src/lib.rs` with
  `let x: u64 = "1";` in `initialize`: humanized error card (E0308,
  mismatched types) and the raw-output toggle.
- `03-build-ok.png` — Build stage after restoring the file and rebuilding:
  "Build succeeded", Continue to Deploy / Generate IDL / Export project.
- `04-deploy.png` — Deploy stage: latest deployment and deploy history.
  Reused from an earlier pass; deploy history there is seeded (no funded
  wallet in that session) — the store itself is real and records genuine
  deploys, per `decisions.md` D17.
- `05-interact.png` — Interact stage: the IDL-driven test panel, wallet
  connected and airdropped on devnet.
- `06-gallery.png` — New Workspace gallery (project switcher): Programs
  (34) and Tutorials (16) tabs.
- `07-gear.png` — Settings overlay: Server endpoint (SolPg) and UI theme
  (Solana V2) visible.
- `08-classic.png` — `/?classic`: the pre-Flow floating-panel layout, kept
  as the fallback.
