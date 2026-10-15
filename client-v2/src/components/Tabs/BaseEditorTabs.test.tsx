import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { BaseEditorTab } from "./BaseEditorTab";
import { BaseEditorTabs } from "./BaseEditorTabs";

const FILES = ["a.rs", "b.rs", "c.rs"];

/** Three tabs, `b.rs` current, and a Wallet button in `end` */
const setup = () => {
  const onSelect = vi.fn();
  render(
    <BaseEditorTabs id="tabs" end={<button type="button">Wallet</button>}>
      {FILES.map((name) => (
        <BaseEditorTab
          key={name}
          path={`/${name}`}
          name={name}
          icon={null}
          current={name === "b.rs"}
          menuOpen={false}
          onSelect={() => onSelect(name)}
          onClose={vi.fn()}
        />
      ))}
    </BaseEditorTabs>
  );
  const tab = (name: string) => screen.getByRole("tab", { name });
  return { onSelect, tab, user: userEvent.setup() };
};

describe("BaseEditorTabs", () => {
  it("holds only the tabs in the tab list; end sits beside it", () => {
    setup();
    const list = screen.getByRole("tablist");
    expect(
      within(list)
        .getAllByRole("tab")
        .map((tab) => tab.textContent)
    ).toEqual(FILES);
    const wallet = screen.getByRole("button", { name: "Wallet" });
    expect(list.contains(wallet)).toBe(false);
    expect(document.getElementById("tabs")!.contains(wallet)).toBe(true);
    expect(document.getElementById("tabs")!.contains(list)).toBe(true);
  });

  it("moves focus with the arrow keys, wrapping, and opens nothing", async () => {
    const { onSelect, tab, user } = setup();
    tab("b.rs").focus();

    await user.keyboard("{ArrowRight}");
    expect(document.activeElement).toBe(tab("c.rs"));
    await user.keyboard("{ArrowRight}");
    expect(document.activeElement).toBe(tab("a.rs"));
    await user.keyboard("{ArrowLeft}");
    expect(document.activeElement).toBe(tab("c.rs"));

    expect(onSelect).not.toHaveBeenCalled();
  });

  it("moves focus to the first tab on Home and the last on End", async () => {
    const { onSelect, tab, user } = setup();
    tab("b.rs").focus();

    await user.keyboard("{Home}");
    expect(document.activeElement).toBe(tab("a.rs"));
    await user.keyboard("{End}");
    expect(document.activeElement).toBe(tab("c.rs"));

    expect(onSelect).not.toHaveBeenCalled();
  });

  it("opens the focused tab's file on Enter", async () => {
    const { onSelect, tab, user } = setup();
    tab("b.rs").focus();

    await user.keyboard("{ArrowRight}{Enter}");

    expect(onSelect.mock.calls).toEqual([["c.rs"]]);
  });

  it("moves from a tab's close button to the next trigger", async () => {
    const { tab, user } = setup();
    screen.getByRole("button", { name: "Close a.rs" }).focus();

    await user.keyboard("{ArrowRight}");

    expect(document.activeElement).toBe(tab("b.rs"));
  });
});
