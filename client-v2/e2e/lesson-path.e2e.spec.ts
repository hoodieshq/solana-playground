import { expect, test } from "@playwright/test";

/**
 * D16: opening a tutorial that has never been started, while a real
 * project is the active workspace, used to throw
 * `Current tutorial has not been set` or bounce back to `/`. An
 * already-started tutorial always worked, so the regression only shows
 * on a first open.
 */
test("opens an unstarted tutorial from an active project", async ({ page }) => {
  // Booting the dev server, creating a project and importing a tutorial
  // is well past the 30s default.
  test.setTimeout(120_000);

  await page.goto("/");

  // The gallery opens by itself when there are no workspaces. It has no
  // `role="dialog"` -- `components/Modal` renders plain divs -- so anchor
  // on its title text instead.
  const gallery = page.getByText("What do you want to build?");
  await expect(gallery).toBeVisible();

  // Make a real project the active workspace first -- D16 only shows up
  // when a project is already active, not on the very first, empty-state
  // open (`views/flow/gallery/StartFromScratch.tsx`: default framework,
  // default name, "Start").
  await page.getByRole("button", { name: "Start →" }).click();
  await expect(gallery).toHaveCount(0);

  // Reopen the gallery from the header's project switcher
  // (`views/flow/header/ProjectSwitcher.tsx`) now that a project is active.
  // The switcher opens a popover of plain buttons (no `role="menu"`, same
  // pattern as `StatusChips.tsx`'s profile popover); `Browse gallery` is
  // the item that opens the gallery itself.
  await page.locator('button[aria-haspopup="true"]').click();
  await page.getByRole("button", { name: "Browse gallery" }).click();
  await expect(gallery).toBeVisible();

  await page.getByRole("tab", { name: /tutorials/i }).click();

  // The tutorial card's title has no click handler of its own; only the
  // "Open" button inside the same card does
  // (`views/flow/gallery/TutorialsTab.tsx`). Scope to that card by walking
  // up from the title text: `Title` -> `Body` -> `Card`.
  const card = page
    .getByText("Hello Anchor", { exact: true })
    .locator("xpath=../..");
  await card.getByRole("button", { name: "Open" }).click();

  // The tutorial's own editor must appear, and the app must not have
  // fallen back to the home route.
  await expect(page).toHaveURL(/\/tutorials\/hello-anchor/);
  await expect(page.getByText("Current tutorial has not been set")).toHaveCount(
    0
  );
});

/**
 * The path this covers: `views/flow/lessons/paths/hello-anchor.ts`. Its
 * step 1 (`write-program`) has no attempt recorded and no page verified,
 * so the band still names it "aiming at build" and the assistant action
 * is at rung zero.
 */
test("a lesson step is finished by the toolchain, not by a click", async ({
  page,
}) => {
  // Opening the gallery, opening a tutorial and letting the assistant
  // panel mount are each their own async settle; well past the 30s
  // default.
  test.setTimeout(120_000);

  await page.goto("/");

  // Same anchor as the test above -- `components/Modal` renders no
  // `role="dialog"`, so the gallery has to be found by its title text.
  const gallery = page.getByText("What do you want to build?");
  await expect(gallery).toBeVisible();

  await page.getByRole("tab", { name: /tutorials/i }).click();

  // Only the "Open" button inside a tutorial card has a click handler;
  // the title text itself does not (`views/flow/gallery/TutorialsTab.tsx`).
  const card = page
    .getByText("Hello Anchor", { exact: true })
    .locator("xpath=../..");
  await card.getByRole("button", { name: "Open" }).click();
  await expect(gallery).toHaveCount(0);

  // Open lands on upstream's own About/Start screen for a lesson tutorial
  // that has never been started -- Start is what creates the workspace
  // (`PgTutorial.start()` -> `PgExplorer.createWorkspace()`) and is what
  // flips `LessonRoute` over to the lesson chrome. `exact` matters here:
  // the assistant panel's own "Start" (demo mode) button is always on the
  // page too, and Playwright's default name match is a case-insensitive
  // substring, so "START" would otherwise match both.
  await page.getByRole("button", { name: "START", exact: true }).click();

  // The rail switches to the lesson's steps, and the band names step 1.
  // `hello-anchor.ts` has four steps, so this is also a count check.
  //
  // KNOWN FAILURE as of this commit: this assertion is red. Clicking
  // "Open" on a lesson-registered tutorial that has never been started
  // navigates to `/tutorials/hello-anchor` and unconditionally renders
  // `views/flow/lessons/LessonSurface.tsx` (wired in
  // `routes/tutorials/tutorials.tsx`'s `handleTutorial`, the
  // `getLessonPath(tutorial.name)` branch added in "Give a lesson its
  // own main surface"). That branch never checks
  // `PgTutorial.isStarted(tutorial.name)` the way the upstream
  // `<Tutorial>` component it replaces does, so the one thing that
  // creates the workspace -- the About page's "Start" button, which
  // calls `PgTutorial.start()` -> `PgExplorer.createWorkspace()` -- is
  // never reached. `PgExplorer.currentWorkspaceName` never becomes
  // "Hello Anchor", `getLessonPath(PgExplorer.currentWorkspaceName)`
  // in `PgLesson.init()` keeps returning `null`, and the "Steps" tab
  // never renders. This is a real, reproducible regression, not a
  // timing issue -- no amount of waiting resolves it, since nothing is
  // converging. Out of scope for this task (e2e spec file only); see
  // task-15-report.md for the full trace. Left unweakened on purpose.
  await expect(page.getByRole("tab", { name: "Steps" })).toBeVisible();
  await expect(page.getByText("Step 1 of 4")).toBeVisible();

  // The objective text is rendered twice at once -- once in the band,
  // once in the step rail's own row for the current step -- so scope to
  // the band's own text block (the "Step 1 of 4" eyebrow's parent) to
  // keep this a single-element locator.
  const band = page.getByText("Step 1 of 4").locator("..");
  await expect(
    band.getByText("Define the hello instruction and log a message")
  ).toBeVisible();

  // Nothing has been verified yet, so the rail still names what the
  // current step is aiming at rather than marking it done.
  await expect(page.getByText("aiming at build")).toBeVisible();

  // The page opens over the editor and closes again.
  await page.getByRole("button", { name: "Read the page" }).click();
  await expect(
    page.getByRole("dialog", { name: /hello instruction/i })
  ).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(
    page.getByRole("dialog", { name: /hello instruction/i })
  ).toHaveCount(0);

  // The first ask opens the door rather than answering outright. The e2e
  // has no connected model, so there is no transcript to assert on --
  // the prompt text itself is unit-tested in `hints.test.ts`. What is
  // deterministic here is the band's own action label: rung zero reads
  // "I'm stuck"; one click with no attempt yet recorded moves it to
  // "Try it first" (`band-copy.ts`'s `assistantLabel`).
  await expect(page.getByRole("button", { name: "I'm stuck" })).toBeVisible();
  await page.getByRole("button", { name: "I'm stuck" }).click();
  await expect(
    page.getByRole("button", { name: "Try it first" })
  ).toBeVisible();
});
