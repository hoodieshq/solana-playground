import { badgesFor } from "./badges";

describe("badgesFor", () => {
  it("earns both when every step is proved and the program is deployed", () => {
    const badges = badgesFor({ allProved: true, deployed: true });
    expect(badges.map((b) => [b.name, b.earned])).toEqual([
      ["Hello Anchor", true],
      ["First deploy", true],
    ]);
  });

  it("keeps the tutorial's badge locked after a skipped step", () => {
    const [tutorial, deploy] = badgesFor({ allProved: false, deployed: true });
    expect(tutorial.earned).toBe(false);
    expect(tutorial.locked).toMatch(/skipped step/);
    expect(deploy.earned).toBe(true);
  });

  it("earns no deploy badge without a deploy", () => {
    const [, deploy] = badgesFor({ allProved: true, deployed: false });
    expect(deploy.earned).toBe(false);
  });
});
