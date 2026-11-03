# Tasks

All tasks belong to HOO-2507 and land in one PR, because the Quickstart
runs only when all of them are in. Tasks 1 and 2 can run in parallel; 3 needs
both; 4 needs 3.

## 1. Runtime

- [ ] 1.1 Scripts load `@solana/kit`, `@solana/kit-plugin-rpc`,
      `@solana/kit-plugin-signer`, `@solana-program/system` and
      `@solana-program/token-2022` from `client-v2/supported-packages.json`,
      merged by `generate-packages.mjs` and `craco.config.js`; recorded in
      `docs/upstream-divergences.md` (HOO-2507)
- [ ] 1.2 `signerFromFile` resolves to the Playground wallet; scripts
      transpile to ES2020; `PgJsRuntime.execute` reports how a run ended
      (HOO-2507)

## 2. The link

- [ ] 2.1 `features/docs-link`: encode and decode the link, with the
      broken-link reasons and the telemetry (`docs_link_*`) (HOO-2507)
- [ ] 2.2 `/open` opens the file as an unsaved client project, or shows
      "This link is broken" with Back to the docs and Go to Home (HOO-2507)

## 3. Run

- [ ] 3.1 Run button in the stage row of a project with no program, and the
      run's callout above the editor, with `client_run_*` events; depends on
      1.2 and 2.2 (HOO-2507)
- [ ] 3.2 Funding card for a link with `sol`: Copy address, Get devnet SOL
      (faucet.solana.com), Check again, Not now; depends on 3.1 (HOO-2507)

## 4. Proof

- [ ] 4.1 e2e for every scenario of `docs-open-link` and `client-run`
      (stubbed RPC), and the link format handed to the docs team; depends on
      3.2 (HOO-2507)
- [ ] 4.2 (manual) The Quickstart link on the preview runs all five steps on
      devnet with a funded Playground wallet (HOO-2507)
