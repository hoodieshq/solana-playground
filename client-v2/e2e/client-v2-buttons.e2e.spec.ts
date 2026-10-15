import { expect, seedWorkspace, test } from "./fixtures";

type AssistantWindow = Window & {
  __pgAssistant?: {
    startAssistantMessage: () => string;
    appendToAssistantMessage: (id: string, delta: string) => void;
  };
};

const CODE = "anchor build\nanchor deploy";

test.describe("client-v2-buttons", () => {
  test("client-v2-buttons: Copying a code block", async ({
    seededPage: page,
    context,
  }) => {
    test.setTimeout(120_000);
    await context.grantPermissions(["clipboard-read", "clipboard-write"]);

    // An assistant reply is rendered by `components/Markdown`, which draws
    // fenced code through `components/CodeBlock`. Sending a message for real
    // would need a model, so the reply is written into the store directly.
    await page.evaluate(
      ({ code }) => {
        const store = (window as AssistantWindow).__pgAssistant;
        if (!store) throw new Error("assistant store not exposed");
        const id = store.startAssistantMessage();
        store.appendToAssistantMessage(
          id,
          "Run:\n\n```sh\n" + code + "\n```\n"
        );
      },
      { code: CODE }
    );

    const block = page.locator("pre", { hasText: "anchor build" }).first();
    await expect(block).toBeVisible();

    // The button shows on hover only
    const copy = page.locator('[data-slot="copy-button"]').first();
    await block.hover();
    await copy.click();

    await expect(copy).toHaveAccessibleName("Copied");
    const copied = await page.evaluate(() => navigator.clipboard.readText());
    // Markdown hands the block its code with the fence's closing newline
    expect(copied.trimEnd()).toBe(CODE);
  });

  test("client-v2-buttons: A refused clipboard is not reported as copied", async ({
    page,
  }) => {
    test.setTimeout(120_000);
    // An init script runs only in documents loaded after it is added, so it
    // goes in before seedWorkspace's navigation; that is why this test seeds
    // its own page instead of taking seededPage
    await page.addInitScript(() => {
      navigator.clipboard.writeText = () =>
        Promise.reject(new DOMException("denied", "NotAllowedError"));
    });
    const logged: string[] = [];
    page.on("console", (message) => logged.push(message.text()));

    await seedWorkspace(page);
    await page.waitForFunction(
      () => !!(window as AssistantWindow).__pgAssistant
    );
    await page.evaluate(() => {
      const store = (window as AssistantWindow).__pgAssistant!;
      const id = store.startAssistantMessage();
      store.appendToAssistantMessage(id, "Run:\n\n```sh\nanchor build\n```\n");
    });

    const block = page.locator("pre", { hasText: "anchor build" }).first();
    await expect(block).toBeVisible();
    const copy = page.locator('[data-slot="copy-button"]').first();
    await block.hover();
    await copy.click();

    // The refusal is logged under ui:button, and the button never claims
    // the copy happened. The label is read once, right after the log: a
    // retrying matcher would wait out the Copied timer and pass anyway
    await expect
      .poll(() => logged.some((l) => l.includes("[ui:button]")))
      .toBe(true);
    expect(await copy.getAttribute("aria-label")).toBe("Copy");
  });

  test("client-v2-buttons: Build cannot be started twice", async ({
    seededPage: page,
  }) => {
    test.setTimeout(120_000);
    let builds = 0;
    let release!: () => void;
    const held = new Promise<void>((resolve) => (release = resolve));
    await page.route("**/build", async (route) => {
      builds += 1;
      await held;
      await route.fulfill({
        contentType: "application/json",
        body: JSON.stringify({ stderr: "", uuid: "e2e-build", idl: null }),
      });
    });

    await page.locator("#flow-stage-tab-build").click();
    await page.getByRole("button", { name: "Build", exact: true }).click();

    // The surface keeps its button while the run is in flight, now busy
    const busy = page.getByRole("button", { name: /Building/ });
    await expect(busy).toBeDisabled();
    await expect(busy).toHaveAttribute("aria-busy", "true");
    await busy.click({ force: true });

    release();
    await expect(page.getByText("Build succeeded")).toBeVisible();
    expect(builds).toBe(1);
  });

  test("client-v2-buttons: The Build stage offers Deploy as a brand button", async ({
    seededPage: page,
  }) => {
    test.setTimeout(120_000);
    await page.route("**/build", (route) =>
      route.fulfill({
        contentType: "application/json",
        body: JSON.stringify({ stderr: "", uuid: "e2e-build", idl: null }),
      })
    );

    await page.locator("#flow-stage-tab-build").click();
    await page.getByRole("button", { name: "Build", exact: true }).click();

    // A view shows at most one brand button; the assistant panel beside the
    // stage is a view of its own, with its own Connect
    const brand = page
      .locator('[role="tabpanel"][aria-labelledby="flow-stage-tab-build"]')
      .locator('[data-slot="brand-button"]:visible');
    await expect(brand).toHaveCount(1);
    await expect(brand).toHaveText(/Deploy/);
  });
});
