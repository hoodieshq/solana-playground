import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, expect, it, vi } from "vitest";

import { PgTerminal } from "../../../utils";

import ConsoleDrawer from "./ConsoleDrawer";

vi.mock("../../main/secondary/terminal/Component/Terminal", () => ({
  default: () => <div className="xterm" />,
}));

// The `@/utils` barrel reaches generated globals (`GLOBAL_SETTINGS`) that
// exist only in a booted app; the drawer's imports pull it in, so it is empty.
const logError = vi.hoisted(() => vi.fn());
vi.mock("../../../shared/lib/logger", () => ({
  createLogger: () => ({ error: logError }),
}));

vi.mock("@/utils", () => ({
  PgTerminal: { clear: vi.fn() },
}));

beforeEach(() => {
  vi.mocked(PgTerminal.clear).mockReset().mockResolvedValue(undefined);
  logError.mockReset();
});

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

it("should clear the terminal from the Clear button", () => {
  render(<ConsoleDrawer open={true} onToggle={vi.fn()} />);
  fireEvent.click(screen.getByRole("button", { name: "Clear" }));
  expect(PgTerminal.clear).toHaveBeenCalledTimes(1);
});

it("should report a clear that fails", async () => {
  const failure = new Error("boom");
  vi.mocked(PgTerminal.clear).mockRejectedValueOnce(failure);
  render(<ConsoleDrawer open={true} onToggle={vi.fn()} />);
  fireEvent.click(screen.getByRole("button", { name: "Clear" }));
  await vi.waitFor(() => expect(logError).toHaveBeenCalledTimes(1));
  expect(logError.mock.calls[0][0]).toBe(failure);
  expect(logError.mock.calls[0][1].report).toBe(true);
});
