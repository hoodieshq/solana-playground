import { defineConfig } from "@playwright/test";

/**
 * Browser-level tests. Kept out of `src` so CRA's jest never collects them -
 * its testMatch would otherwise try to run `.spec.ts` files under a runner
 * that has no browser.
 */
export default defineConfig({
  testDir: "./e2e",
  // The dev server is slow to boot: wasm chunks plus the generate step
  //
  // Per test. 30s was under what the slowest specs actually need: the
  // migration ones seed a config, reload, and wait for a whole workspace to
  // come back, and measure 38-47s on their own. They passed only when the
  // machine was otherwise idle, so the suite failed in a different place on
  // each sequential run -- which reads as flakiness and trains you to ignore
  // it. Raised to cover them with room, since a genuine hang still fails,
  // just a minute later. Override either way - tighter to catch a stall
  // sooner, looser when slowMo paces the run:
  //   E2E_TIMEOUT=15000 yarn test-e2e
  //   SLOWMO=800 E2E_TIMEOUT=120000 yarn test-e2e --headed
  timeout: Number(process.env.E2E_TIMEOUT ?? 60_000),
  // Deliberately well under the test timeout, so an assertion that will never
  // pass fails naming its locator rather than as a bare "test timeout". 10s
  // was not enough for the first assertion in a spec: that one waits on the
  // explorer's async init, which on a loaded machine running the suite
  // sequentially takes longer than everything that follows it.
  expect: { timeout: 20_000 },
  fullyParallel: false,
  reporter: process.env.CI ? "list" : "line",
  use: {
    baseURL: "http://localhost:3000",
    trace: "on-first-retry",
    // Without this, an action inherits the whole test timeout and reports a
    // bare "test timeout" - naming no locator. Fail fast and say which one.
    actionTimeout: 10_000,
    // Watch the flow at human speed: SLOWMO=600 yarn test-e2e --headed
    launchOptions: { slowMo: Number(process.env.SLOWMO ?? 0) },
  },
  webServer: {
    // `dev` runs `generate-fast`: still syncs public/, but skips
    // `generate-crates`, which shells out to cargo and dominates the runtime
    command: "yarn dev",
    url: "http://localhost:3000",
    // Reuse a dev server you already have running; CI always starts its own
    reuseExistingServer: !process.env.CI,
    timeout: 300_000,
    env: { BROWSER: "none" },
  },
});
