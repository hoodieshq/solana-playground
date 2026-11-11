import type { Page } from "@playwright/test";
import { Keypair } from "@solana/web3.js";

import { fakeDevnet } from "./fake-devnet";
import {
  consoleTrigger,
  DEVNET_RPC,
  expect,
  LONG,
  stubSignedIn,
  test,
} from "./fixtures";

/**
 * The browser scenarios of `client-v2-deploy`. The rest of its scenarios
 * need a real devnet and are walked by hand (`(manual)` in the spec).
 */

const PROGRAM_ID = "6PNd3SLJU8V6mqVmDNaV6x2UR6A8ZedA3p5FPrBjAVkj";

test("client-v2-deploy: A devnet record viewed on testnet", async ({
  seededPage: page,
}) => {
  // Testnet is the selected network; its requests are refused, so CI never reaches
  // it: the cluster is read from the endpoint's URL, not from an answer
  await page.route("https://api.testnet.solana.com/**", (route) =>
    route.abort("connectionrefused")
  );
  await page.evaluate(
    ([programId, at]) => {
      const settings = JSON.parse(localStorage.getItem("settings") ?? "{}");
      settings.connection = settings.connection ?? {};
      settings.connection.endpoint = { option: "testnet" };
      localStorage.setItem("settings", JSON.stringify(settings));
      localStorage.setItem(
        "flow.deploys",
        JSON.stringify([
          {
            id: "e2e-deploy",
            workspace: "e2e-project",
            cluster: "devnet",
            programId,
            // eslint-disable-next-line unicorn/no-null -- `flow.deploys` persists `signature: null` for a deploy with no signature
            signature: null,
            at,
          },
        ])
      );
    },
    [PROGRAM_ID, Date.now()] as const
  );
  await page.reload();
  await expect(page.locator("#root-dir")).toBeVisible(LONG);

  await page.locator("#flow-stage-tab-deploy").click();
  const history = page
    .locator("#flow-stage-panel-deploy")
    .getByRole("region", { name: "History" });
  const link = history.getByRole("link", {
    name: `View deployment (${PROGRAM_ID}) on Explorer (Devnet)`,
  });
  await expect(link).toHaveText("Explorer (Devnet)", LONG);
  await expect(link).toHaveAttribute("href", /[?&]cluster=devnet(&|$)/);

  // The devnet deployment is not on testnet: the stage is empty here, with
  // no count and no result card, the network in the summary's row, and the
  // pill is no redeploy: Go to Build, since this project was never built
  const panel = page.locator("#flow-stage-panel-deploy");
  await expect(panel.locator('[data-slot="stage-empty-meta"]')).toHaveCount(0);
  await expect(panel.getByLabel("Network", { exact: true })).toContainText(
    "Testnet"
  );
  await expect(panel.getByText("Nothing deployed yet")).toBeVisible();
  await expect(
    panel.getByRole("status", { name: "Deploy result" })
  ).toHaveCount(0);
  await expect(
    panel.getByRole("button", { name: "Go to Build" })
  ).toBeVisible();
  await expect(panel.getByRole("button", { name: /^Redeploy/ })).toHaveCount(0);
});

/** Where the title and the pill are, one frame of the stage */
interface Frame {
  title: number;
  pill: number;
  /** Rows of the visible progress region; 0 while it is not drawn */
  steps: number;
}

/**
 * Records, now and then every animation frame until the result card shows, where the
 * Deploy stage's title and pill are, and how many steps the progress region
 * lists. The reserve the region keeps under itself is aria-hidden and is not
 * counted.
 */
const sampleFrames = (page: Page) =>
  page.evaluate(() => {
    const frames: Frame[] = [];
    (window as unknown as { __deployFrames: Frame[] }).__deployFrames = frames;
    const tick = () => {
      const panel = document.querySelector("#flow-stage-panel-deploy");
      if (!panel || panel.querySelector('[aria-label="Deploy result"]')) {
        return;
      }
      const top = (selector: string) =>
        panel.querySelector(selector)?.getBoundingClientRect().top ?? NaN;
      const shown = Array.from(
        panel.querySelectorAll('[aria-label="Deploy progress"]')
      ).find((region) => !region.closest('[aria-hidden="true"]'));
      frames.push({
        title: top('[data-slot="stage-empty-title"]'),
        pill: top('[data-slot="brand-button"]'),
        steps: shown?.querySelectorAll("li").length ?? 0,
      });
      requestAnimationFrame(tick);
    };
    // The first frame is taken now, before the evaluate returns, so the
    // baseline always comes before the press
    tick();
  });

const recordedFrames = (page: Page) =>
  page.evaluate(
    () => (window as unknown as { __deployFrames: Frame[] }).__deployFrames
  );

/**
 * A built program on the fake devnet, its builds answered with a few KB of
 * program bytes, and every send held a little, so the run lasts frames enough
 * to measure
 */
const builtOnFakeDevnet = async (page: Page) => {
  const devnet = await fakeDevnet(page);
  await page.route(DEVNET_RPC, async (route) => {
    const body = route.request().postData() ?? "";
    if (body.includes('"sendTransaction"')) {
      await new Promise((resolve) => setTimeout(resolve, 150));
    }
    await route.fallback();
  });
  await page.route("**/build", (route) =>
    route.fulfill({
      contentType: "application/json",
      // eslint-disable-next-line unicorn/no-null -- the build server's JSON for a build with no IDL
      body: JSON.stringify({ stderr: "", uuid: "e2e-build", idl: null }),
    })
  );
  await page.route("**/deploy/*", (route) =>
    route.fulfill({
      contentType: "application/octet-stream",
      body: Buffer.alloc(2600, 7),
    })
  );
  return devnet;
};

/** Where the stage's title and pill are now, rounded to the pixel */
const titleAndPill = (page: Page) =>
  page.evaluate(() => {
    const panel = document.querySelector("#flow-stage-panel-deploy");
    const top = (selector: string) =>
      Math.round(
        panel?.querySelector(selector)?.getBoundingClientRect().top ?? NaN
      );
    return `${top('[data-slot="stage-empty-title"]')} ${top(
      '[data-slot="brand-button"]'
    )}`;
  });

/**
 * Builds from the Build stage, then opens Deploy with the console open: a
 * deploy opens the console, which shortens the stage's frame, and that move
 * is not the stage's own. Returns once the stage has stopped moving into
 * place.
 */
const buildThenOpenDeploy = async (page: Page) => {
  const drawer = consoleTrigger(page);
  if ((await drawer.getAttribute("aria-expanded")) !== "true") {
    await drawer.click();
  }
  await expect(drawer).toHaveAttribute("aria-expanded", "true");
  await page.locator("#flow-stage-tab-build").click();
  await page
    .locator("#flow-stage-panel-build")
    .getByRole("button", { name: "Build", exact: true })
    .click();
  await expect(
    page
      .locator("#flow-stage-panel-build")
      .getByRole("button", { name: "Continue to Deploy" })
  ).toBeVisible(LONG);
  await page.locator("#flow-stage-tab-deploy").click();
  const panel = page.locator("#flow-stage-panel-deploy");
  await expect(panel.getByLabel("Who pays")).toBeVisible(LONG);
  await expect
    .poll(async () => {
      const before = await titleAndPill(page);
      await page.waitForTimeout(250);
      return (await titleAndPill(page)) === before;
    }, LONG)
    .toBe(true);
};

/**
 * Deploys from the stage and checks every frame up to the result: the title
 * and the pill stay where they were before the press, and the progress region
 * showed `steps` rows at most
 */
const deployInPlace = async (page: Page, steps: number) => {
  const panel = page.locator("#flow-stage-panel-deploy");
  const pill = panel.getByRole("button", { name: "Deploy to devnet" });
  // The click scrolls a pill below the frame's edge into view; that scroll
  // is the test's, not the deploy's, so it happens before the first frame
  await pill.scrollIntoViewIfNeeded();
  await sampleFrames(page);
  await pill.click();
  await expect(
    panel.getByRole("status", { name: "Deploy result" })
  ).toBeVisible(LONG);

  const frames = await recordedFrames(page);
  const [before] = frames;
  expect(before.steps).toBe(0);
  expect(Math.max(...frames.map((f) => f.steps))).toBe(steps);
  const moved = frames.filter(
    (f) =>
      Math.abs(f.title - before.title) > 0.5 ||
      Math.abs(f.pill - before.pill) > 0.5
  );
  expect(moved).toEqual([]);
};

test.describe("a first deploy on the fake devnet", () => {
  test.setTimeout(180_000);

  test("client-v2-deploy: A first deploy starts in place", async ({
    seededPage: page,
  }) => {
    const devnet = await builtOnFakeDevnet(page);
    // A Playground wallet with SOL already, so the run funds nothing
    const wallet = Keypair.generate();
    devnet.fund(wallet.publicKey.toBase58(), 10);
    await page.evaluate((secret) => {
      localStorage.setItem(
        "wallet",
        JSON.stringify({
          accounts: [{ kp: secret, name: "Wallet 1" }],
          currentIndex: 0,
          state: "pg",
          // eslint-disable-next-line unicorn/no-null -- the wallet's stored state writes no standard wallet as null
          standardName: null,
        })
      );
    }, Array.from(wallet.secretKey));
    await page.reload();
    await expect(page.locator("#root-dir")).toBeVisible(LONG);

    await buildThenOpenDeploy(page);
    await deployInPlace(page, 3);
    expect(devnet.unhandled).toEqual([]);
  });

  test("client-v2-deploy: A first deploy that funds the wallet starts in place", async ({
    seededPage: page,
  }) => {
    const devnet = await builtOnFakeDevnet(page);
    // No wallet yet: the deploy makes one with no SOL, and the faucet, open
    // to a signed-in user, funds it first
    await stubSignedIn(page.context());
    await page.evaluate(() => {
      const settings = JSON.parse(localStorage.getItem("settings") ?? "{}");
      settings.wallet = { automaticAirdrop: true };
      localStorage.setItem("settings", JSON.stringify(settings));
    });
    await page.reload();
    await expect(page.locator("#root-dir")).toBeVisible(LONG);

    await buildThenOpenDeploy(page);
    await deployInPlace(page, 4);
    expect(devnet.unhandled).toEqual([]);
  });
});
