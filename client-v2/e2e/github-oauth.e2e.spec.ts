import { expect, test } from "@playwright/test";
import type { BrowserContext, Page } from "@playwright/test";

/**
 * The sign-in round trip in a real browser: a real popup window, real
 * `window.opener` delivery, real clicks.
 *
 * GitHub is never contacted. `?action=start` is intercepted and answered with a
 * stand-in for the callback page - the handler itself is covered by
 * `github-auth.integration.spec.ts`, which drives it directly. What only a
 * browser can prove is that the popup reaches the opener and that the nonce
 * the client minted survives the round trip.
 */

const PROFILE = {
  login: "stub-user",
  name: "Stub User",
  avatar_url: "https://example.test/avatar.png",
};

/**
 * Stand in for the callback page. Echoes the nonce off the `start` URL, which
 * is what the client requires - a fixed value here would pass while the real
 * binding was broken.
 */
const mockGithubOAuth = async (
  context: BrowserContext,
  opts: { nonce?: "echo" | "wrong" } = {}
) => {
  await context.route("**/api/github-oauth?action=start*", async (route) => {
    const sent = new URL(route.request().url()).searchParams.get("nonce");
    const nonce = opts.nonce === "wrong" ? "0".repeat(32) : sent;
    const payload = JSON.stringify({
      type: "pg-github-auth",
      nonce,
      token: "gho_e2e",
    });
    await route.fulfill({
      status: 200,
      contentType: "text/html; charset=utf-8",
      body:
        `<!doctype html><meta charset="utf-8"><title>stub</title><script>` +
        `if (window.opener) {` +
        `window.opener.postMessage(${payload}, window.location.origin);` +
        `window.close();` +
        `} else {` +
        `new BroadcastChannel("pg-github-auth").postMessage(${payload});` +
        `window.close();` +
        `}` +
        `</script>`,
    });
  });

  await context.route("https://api.github.com/user", (route) =>
    route.fulfill({ status: 200, json: PROFILE })
  );

  // Unmocked, this is a real DNS lookup to a domain that does not exist, and
  // the broken-image placeholder resolves late enough to shift the header -
  // which moves the chip out from under a click that is already in progress.
  await context.route(PROFILE.avatar_url, (route) =>
    route.fulfill({
      status: 200,
      contentType: "image/gif",
      // 1x1 transparent gif
      body: Buffer.from(
        "R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7",
        "base64"
      ),
    })
  );
};

const signInButton = "button[aria-label='Sign in with GitHub']";
const profileChip = `button[aria-label='GitHub profile: ${PROFILE.login}']`;

/**
 * Every run gets a fresh profile, so there are no workspaces and `Flow` opens
 * the gallery over the header. It opens only once `PgExplorer` has initialised,
 * so it has to be waited for rather than assumed present or absent.
 */
const openApp = async (page: Page) => {
  await page.goto("/");
  const gallery = page.getByText("What do you want to build?");
  await gallery.waitFor({ state: "visible", timeout: 20_000 }).catch(() => {});
  if (await gallery.isVisible().catch(() => false)) {
    await page.mouse.click(5, 5); // outside the modal -> useOnClickOutside
    await gallery.waitFor({ state: "hidden", timeout: 10_000 });
  }
  await expect(page.locator(signInButton)).toBeVisible();
};

test.describe("github sign-in — real popup, mocked GitHub", () => {
  test("should sign in, show the identity, and sign back out", async ({
    page,
    context,
  }) => {
    await mockGithubOAuth(context);
    await openApp(page);

    await page.click(signInButton);

    await expect(page.locator(profileChip)).toBeVisible();
    await expect(page.locator(profileChip)).toContainText(PROFILE.login);

    // Sign out: chip opens the popover, then the row, then the confirmation.
    // Assert each step so a failure names the one that broke.
    await page.click(profileChip);
    await expect(
      page.getByRole("link", { name: "Open GitHub profile" })
    ).toBeVisible();

    await page.getByRole("button", { name: "Sign out" }).click();
    await expect(page.getByText("Sign out of GitHub?")).toBeVisible();

    await page.getByRole("button", { name: "Sign out" }).click();

    await expect(page.locator(signInButton)).toBeVisible();
    await expect(page.locator(profileChip)).toHaveCount(0);
  });

  test("should stay signed out when the callback echoes the wrong nonce", async ({
    page,
    context,
  }) => {
    await mockGithubOAuth(context, { nonce: "wrong" });
    await openApp(page);

    await page.click(signInButton);

    // A forgery must not be reported as the user cancelling something
    await expect(page.getByRole("alert")).toContainText(
      /could not be verified/i
    );
    await expect(page.getByRole("alert")).not.toContainText(/cancelled/i);
    await expect(page.locator(signInButton)).toBeVisible();
  });

  test("should sign out on reload, since the token is memory-only", async ({
    page,
    context,
  }) => {
    await mockGithubOAuth(context);
    await openApp(page);

    await page.click(signInButton);
    await expect(page.locator(profileChip)).toBeVisible();

    await page.reload();

    await expect(page.locator(signInButton)).toBeVisible();
    await expect(page.locator(profileChip)).toHaveCount(0);
  });
});
