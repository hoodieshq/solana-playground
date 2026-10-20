import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, expect, it, vi } from "vitest";

import BaseSettingRow from "./BaseSettingRow";
import BaseSettingsPage from "./BaseSettingsPage";
import type { SettingsSection } from "./BaseSettingsPage";

const TITLES = [
  "Network",
  "Project",
  "Block Explorer",
  "Build",
  "Connection",
  "Editor",
  "Notification",
  "Server",
  "Test UI",
  "UI",
  "Wallet",
  "Experimental",
];

const sections: SettingsSection[] = TITLES.map((title) => ({
  id: title.toLowerCase().replace(/ /g, "-"),
  title,
  content: <p>{`${title} content`}</p>,
}));

const scrollIntoView = vi.fn();
beforeEach(() => {
  Element.prototype.scrollIntoView = scrollIntoView;
});
afterEach(() => {
  scrollIntoView.mockReset();
});

const draw = (props: { phone?: boolean; current?: string } = {}) => {
  const onPick = vi.fn();
  const onBack = vi.fn();
  render(
    <BaseSettingsPage
      sections={sections}
      current={props.current ?? "network"}
      onPick={onPick}
      onCurrentChange={vi.fn()}
      onBack={onBack}
      phone={props.phone ?? false}
    />
  );
  return { onPick, onBack };
};

const sectionList = () =>
  screen.getByRole("navigation", { name: "Settings sections" });

it("lists every section and marks the current one", () => {
  draw({ current: "editor" });
  const list = within(sectionList());
  const buttons = list.getAllByRole("button");
  expect(buttons.map((b) => b.textContent)).toEqual(TITLES);
  const editor = list.getByRole("button", { name: "Editor" });
  expect(editor.getAttribute("aria-current")).toBe("true");
  const network = list.getByRole("button", { name: "Network" });
  expect(network.hasAttribute("aria-current")).toBe(false);
});

it("a pick scrolls the section into view", async () => {
  const { onPick } = draw();
  await userEvent.click(
    within(sectionList()).getByRole("button", { name: "Editor" })
  );
  expect(onPick).toHaveBeenCalledExactlyOnceWith("editor");
  const editor = screen.getByRole("region", { name: "Editor" });
  expect(scrollIntoView.mock.contexts).toEqual([editor]);
});

it("Back to app calls onBack", async () => {
  const { onBack } = draw();
  await userEvent.click(screen.getByRole("button", { name: "Back to app" }));
  expect(onBack).toHaveBeenCalledOnce();
});

it("is the region named Settings, headed Settings", () => {
  draw();
  const page = screen.getByRole("region", { name: "Settings" });
  // `getBy` throws when the heading is missing
  within(page).getByRole("heading", { level: 1, name: "Settings" });
});

it("on a phone there is no section list, and the bar carries Back to app and the title", () => {
  draw({ phone: true });
  expect(
    screen.queryByRole("navigation", { name: "Settings sections" })
  ).toBeNull();
  const bar = within(screen.getByTestId("settings-bar"));
  bar.getByRole("button", { name: "Back to app" });
  bar.getByRole("heading", { level: 1, name: "Settings" });
});

const layoutOf = (name: string) =>
  screen.getByText(name).closest("[data-layout]")?.getAttribute("data-layout");

it("a row puts its control beside the text, and under it on a phone", () => {
  const { rerender } = render(
    <BaseSettingRow
      name="Word wrap"
      description="Wrap long lines"
      control={<button>toggle</button>}
      phone={false}
    />
  );
  expect(layoutOf("Word wrap")).toBe("inline");
  screen.getByText("Wrap long lines");
  rerender(
    <BaseSettingRow name="Word wrap" control={<button>toggle</button>} phone />
  );
  expect(layoutOf("Word wrap")).toBe("stacked");
});
