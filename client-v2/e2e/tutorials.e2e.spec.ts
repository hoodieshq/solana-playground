import { LONG, expect, test } from "./fixtures";

test("client-v2-tutorials: The assistant beside Hello Anchor", async ({
  page,
}) => {
  await page.goto("/tutorials/hello-anchor");
  const start = page.getByRole("button", { name: "Start", exact: true });
  await expect(start).toBeVisible(LONG);

  // Before Start there is no project: the assistant names the tutorial and
  // the files column offers nothing to create
  // The panel's head is an h2; the About page's own title is the h1
  await expect(
    page.getByRole("heading", { level: 2, name: "Hello Anchor", exact: true })
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Ask about Hello Anchor" })
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Create a new project" })
  ).toHaveCount(0);

  // Start makes the tutorial's project, which the assistant then follows
  await start.click();
  await expect(start).toBeHidden(LONG);
  await expect(
    page.getByRole("heading", { name: "Ask about Hello Anchor" })
  ).toBeVisible();
});
