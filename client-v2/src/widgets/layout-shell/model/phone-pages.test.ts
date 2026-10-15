import { describe, expect, it } from "vitest";

import { pageForStage, stageForPage } from "./phone-pages";

describe("pageForStage", () => {
  it.each([
    ["build", "work", "preview"],
    ["build", "menu", "preview"],
    ["build", "preview", null],
    ["write", "preview", "work"],
    ["write", "work", null],
    ["write", "menu", null],
  ] as const)("%s seen from %s goes to %s", (stage, page, expected) => {
    expect(pageForStage(stage, page)).toBe(expected);
  });
});

describe("stageForPage", () => {
  it("shows the last preview stage on the preview", () => {
    expect(stageForPage("preview", "write", "deploy")).toBe("deploy");
  });
  it("leaves a preview stage alone on the preview", () => {
    expect(stageForPage("preview", "interact", "build")).toBeNull();
  });
  it("shows write on the work page", () => {
    expect(stageForPage("work", "build", "build")).toBe("write");
  });
  it("leaves the stage alone on the menu", () => {
    expect(stageForPage("menu", "build", "build")).toBeNull();
  });
});
