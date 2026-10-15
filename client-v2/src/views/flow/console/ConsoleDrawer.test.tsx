import { fireEvent, render, screen } from "@testing-library/react";
import { expect, it, vi } from "vitest";

import ConsoleDrawer from "./ConsoleDrawer";

vi.mock("../../main/secondary/terminal/Component/Terminal", () => ({
  default: () => <div className="xterm" />,
}));

// The `@/utils` barrel reaches generated globals (`GLOBAL_SETTINGS`) that
// exist only in a booted app; the drawer's imports pull it in, so it is empty.
vi.mock("@/utils", () => ({
  PgTerminal: { clear: vi.fn().mockResolvedValue(undefined) },
}));

it("should show what it is told and ask to toggle", () => {
  const onToggle = vi.fn();
  render(<ConsoleDrawer open={false} onToggle={onToggle} />);
  const handle = screen.getByRole("button", { name: "Console" });
  expect(handle.getAttribute("aria-expanded")).toBe("false");
  expect(
    document.querySelector("#flow-console-drawer-body .xterm")
  ).not.toBeNull();
  fireEvent.click(handle);
  expect(onToggle).toHaveBeenCalledTimes(1);
});

it("should report itself expanded when open", () => {
  render(<ConsoleDrawer open={true} onToggle={vi.fn()} />);
  const handle = screen.getByRole("button", { name: "Console" });
  expect(handle.getAttribute("aria-expanded")).toBe("true");
});
