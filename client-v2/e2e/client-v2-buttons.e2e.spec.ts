import { expect, test } from "./fixtures";

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
});
