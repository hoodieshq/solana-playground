import type { Page } from "@playwright/test";

import type { FakeBuildServer } from "./fake-build-server";
import { fakeBuildServer } from "./fake-build-server";
import type { FakeDevnet } from "./fake-devnet";
import { fakeDevnet } from "./fake-devnet";
import { expect, LONG, test } from "./fixtures";
import { beat, cardsFor, lesson, words } from "./hello-anchor";
import { PHONE } from "./viewports";

/**
 * Hello Anchor from the intro card to the finish card at 390 px, on the same
 * stubbed build server and devnet as the desktop's run
 * (`tutorial-hello-anchor`): the phone half of tutorial-flow-v2 task 6.5. The
 * phone shows the same conversation in its Chat space, with the code one tap
 * away in Code, and leaves typing code to the desktop (tutorial-phone).
 */

/** The phone layout's Chat space, below the frame's width */
const chat = (page: Page) => page.getByRole("region", { name: "Chat" });
const feed = (page: Page) => chat(page).getByRole("log");
const code = (page: Page) => page.getByRole("region", { name: "Code" });

const { option, answer, act, won, spent, next } = cardsFor(feed);

/** The controls the phone leaves to the desktop: none may show in its feed */
const desktopOnly = async (page: Page) => {
  for (const name of ["I'll fix it myself", "Type it myself", "Open Call"]) {
    await expect(
      feed(page).getByRole("button", { name, exact: true })
    ).toHaveCount(0);
  }
};

test.describe("tutorial: Hello Anchor on a phone, on a stubbed build server and devnet", () => {
  let devnet: FakeDevnet;
  let builds: FakeBuildServer;

  test.beforeEach(async ({ page }) => {
    // No default backend, whatever the dev server is configured with
    await page.route("**/api/agent", (route) =>
      // eslint-disable-next-line unicorn/no-null -- the endpoint's JSON says null
      route.fulfill({ json: { configured: false, model: null } })
    );
    builds = await fakeBuildServer(page);
    devnet = await fakeDevnet(page);
  });

  test.afterEach(() => {
    // Unset when beforeEach failed, whose own error is the one to read
    if (!builds || !devnet) return;
    expect(builds.unhandled).toEqual([]);
    expect(devnet.unhandled).toEqual([]);
  });

  test("tutorial-phone: Hello Anchor from intro to finish on a phone", async ({
    page,
  }) => {
    test.setTimeout(300_000);
    await page.setViewportSize(PHONE);
    await page.goto("/tutorials/hello-anchor");
    await expect(
      page.getByRole("complementary", { name: "Tutorial chat" })
    ).toHaveCount(0);
    // Before Start the button takes the composer's place, under the thumb
    await chat(page)
      .getByRole("button", { name: /Start step 1/ })
      .first()
      .click(LONG);

    // Step 1: the planned E0412, which the phone only explains: it cannot
    // type the fix, so the learner picks it
    await answer(page, beat("s1.q1", "ask"));
    await act(page, "s1.build").click(LONG);
    await expect(feed(page).getByText("E0412 · line 9").last()).toBeVisible(
      LONG
    );
    await desktopOnly(page);
    await feed(page)
      .getByRole("button", { name: /Explain the error/ })
      .click();
    await answer(page, beat("f1.q2", "ask"));
    await act(page, "f1.build").click(LONG);
    await won(page, "write-program");
    await spent(page, "s1.build", "f1.build");

    // The code, one tap away, and back
    await page.getByRole("button", { name: /^Show the code/ }).click();
    await expect(code(page)).toBeVisible();
    await expect(code(page).getByText("lib.rs").first()).toBeVisible(LONG);
    await page.getByRole("button", { name: "Back to the chat" }).click();
    await expect(feed(page)).toBeVisible();
    await next(page).click();

    // Step 2: the airdrop card makes the wallet and funds it; the deploy
    await answer(page, beat("s2.q2", "ask"));
    await act(page, "s2.airdrop").click(LONG);
    await expect(
      feed(page).getByText(/Made a wallet and added [\d.]+ SOL/)
    ).toBeVisible(LONG);
    await act(page, "s2.deploy").click(LONG);
    await won(page, "deploy");
    expect(devnet.programs()).toHaveLength(1);
    await desktopOnly(page);
    await next(page).click();

    // Step 3: a wrong pick, then a reload, which opens on Chat at that
    // question with the pick still ruled out and step 2's win in the feed
    const q3 = beat("s3.q3", "ask");
    const wrong = q3.why.findIndex((why) => why !== null);
    await option(q3, wrong)(page).click(LONG);
    await expect(option(q3, wrong)(page)).toHaveAttribute(
      "aria-disabled",
      "true"
    );
    await page.reload();
    await expect(option(q3, q3.answer)(page)).toBeVisible(LONG);
    await expect(option(q3, wrong)(page)).toHaveAttribute(
      "aria-disabled",
      "true"
    );
    await won(page, "deploy");
    await answer(page, q3);
    await act(page, "s3.run").click(LONG);
    await expect(
      feed(page).getByText("Program log: Hello, World!").last()
    ).toBeVisible(LONG);
    await won(page, "call-client");
    await next(page).click();

    // Step 4: the new argument, an upgrade at the same address, the call
    await answer(page, beat("s4.q4", "ask"));
    await act(page, "s4.airdrop").click(LONG);
    await expect(
      feed(page)
        .getByText(/Added [\d.]+ SOL/)
        .last()
    ).toBeVisible(LONG);
    await act(page, "s4.ship").click(LONG);
    await expect(feed(page).getByText("Upgraded").last()).toBeVisible(LONG);
    expect(devnet.programs()).toHaveLength(1);
    await feed(page).getByRole("textbox", { name: "name" }).fill("Alex");
    await act(page, "s4.call").click(LONG);
    await won(page, "greet-by-name");

    // The finish is the chat's finish card, and the header says done
    await expect(
      feed(page).getByText(words(lesson.finish.headline), { exact: false })
    ).toBeVisible(LONG);
    const finished = feed(page).getByRole("region", { name: "Finished" });
    await finished.getByText("Transaction details").click();
    await expect(
      finished.getByText("Program log: Hello, Alex!").first()
    ).toBeVisible();
    await expect(
      page.getByRole("button", {
        name: new RegExp(
          `Done · ${lesson.steps.length} of ${lesson.steps.length}\\. Show the steps$`
        ),
      })
    ).toBeVisible();
    await desktopOnly(page);
    // Every step was won on the phone
    for (const { id } of lesson.steps) await won(page, id);
  });
});
