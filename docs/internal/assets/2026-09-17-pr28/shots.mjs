/**
 * Shoots the stepper before and after a page reload on a project that has
 * really been built, for the before/after pair a visual PR needs.
 *
 * Run once per branch, changing OUT:
 *   OUT=before node e2e/shots.mjs     # on the base branch
 *   OUT=after  node e2e/shots.mjs     # on the PR branch
 *
 * The build is a real round trip to the configured build server, so the
 * `lastBuildFailed` this exercises is the one the build command writes. The
 * deploy half of the fix is not covered here: deploying needs devnet SOL,
 * and the in-product airdrop is behind GitHub sign-in.
 */
import { chromium } from "@playwright/test";

const OUT = process.env.OUT ?? "shot";
const DIR = process.env.SHOT_DIR ?? "/tmp/claude-501/shots";
const log = (...a) => console.log(new Date().toISOString().slice(11, 19), ...a);

const browser = await chromium.launch();
const page = await (
  await browser.newContext({ viewport: { width: 1440, height: 900 } })
).newPage();
page.on("pageerror", (e) => log("PAGEERROR:", e.message));

const stepper = async () => {
  const out = [];
  for (const id of ["write", "build", "deploy", "interact"]) {
    out.push(
      await page.locator(`#flow-stage-tab-${id}`).getAttribute("aria-label")
    );
  }
  return out.join("  |  ");
};

const shoot = async (name) => {
  // The stepper's own row: the tablist that holds the four stage buttons.
  const strip = page.locator('[role="tablist"][aria-label="Development loop"]');
  await strip.screenshot({ path: `${DIR}/${OUT}-${name}.png` });
  log(`shot ${OUT}-${name}.png ::`, await stepper());
};

const fail = async (why) => {
  log("STOPPED:", why);
  await page.screenshot({ path: `${DIR}/${OUT}-FAILED.png`, fullPage: true });
  log("state:", await stepper());
  await browser.close();
  process.exit(1);
};

// --- seed a project -------------------------------------------------------
await page.goto("http://localhost:3000/", { waitUntil: "domcontentloaded" });
const gallery = page.locator("[data-gallery-modal]");
await gallery.waitFor({ state: "visible", timeout: 90000 });
await gallery.getByLabel("Project name").fill("stepper-shot");
await gallery.getByRole("button", { name: /^Start/ }).click();
await gallery.waitFor({ state: "hidden", timeout: 30000 });
await page.locator("#root-dir").waitFor({ state: "visible", timeout: 30000 });
log("project seeded ::", await stepper());

// --- a real build ---------------------------------------------------------
await page.locator("#flow-stage-tab-build").click();
await page.waitForTimeout(800);
const buildBtn = page.getByRole("button", { name: /^Build/ }).first();
if (!(await buildBtn.count())) await fail("no Build button on the Build surface");
await buildBtn.click();
log("build started, waiting for it to settle...");
try {
  await page.waitForFunction(
    () =>
      /done|failed/.test(
        document
          .querySelector("#flow-stage-tab-build")
          ?.getAttribute("aria-label") ?? ""
      ),
    { timeout: 240000 }
  );
} catch {
  await fail("build never settled within 240s");
}
const verdict = await page
  .locator("#flow-stage-tab-build")
  .getAttribute("aria-label");
if (/failed/.test(verdict)) await fail(`build failed: ${verdict}`);
log("build settled ::", await stepper());

await shoot("1-built");

// --- the bug: reload ------------------------------------------------------
await page.reload({ waitUntil: "domcontentloaded" });
await page
  .locator("#flow-stage-tab-write")
  .waitFor({ state: "visible", timeout: 60000 });
// The on-chain fetch behind the deploy half is asynchronous; give the page
// room to settle either way before the shot.
await page.waitForTimeout(8000);
await shoot("2-after-reload");

await browser.close();
log("done");
