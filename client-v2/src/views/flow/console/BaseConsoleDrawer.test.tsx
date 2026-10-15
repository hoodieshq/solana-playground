import { fireEvent, render, screen } from "@testing-library/react";
import { expect, it, vi } from "vitest";

import BaseConsoleDrawer from "./BaseConsoleDrawer";

const idle = { text: "", tone: "idle" as const };

const draw = (
  open: boolean,
  handlers: { onToggle?: () => void; onClear?: () => void }
) =>
  render(
    <BaseConsoleDrawer
      open={open}
      status={idle}
      onToggle={handlers.onToggle ?? vi.fn()}
      onClear={handlers.onClear ?? vi.fn()}
    >
      <div className="xterm" />
    </BaseConsoleDrawer>
  );

it("names its button Console and controls the body by its fixed id", () => {
  draw(false, {});
  const button = screen.getByRole("button", { name: "Console" });
  expect(button.getAttribute("aria-expanded")).toBe("false");
  expect(button.getAttribute("aria-controls")).toBe("flow-console-drawer-body");
  expect(
    document.querySelector("#flow-console-drawer-body .xterm")
  ).not.toBeNull();
});

it("toggles once from the button and once from the strip", () => {
  const onToggle = vi.fn();
  draw(false, { onToggle });
  fireEvent.click(screen.getByRole("button", { name: "Console" }));
  expect(onToggle).toHaveBeenCalledTimes(1);
  fireEvent.click(
    screen.getByText("Console", { selector: "[data-console-label]" })
  );
  expect(onToggle).toHaveBeenCalledTimes(2);
});

it("clears without toggling", () => {
  const onToggle = vi.fn();
  const onClear = vi.fn();
  draw(true, { onToggle, onClear });
  fireEvent.click(screen.getByRole("button", { name: "Clear the console" }));
  expect(onClear).toHaveBeenCalledTimes(1);
  expect(onToggle).not.toHaveBeenCalled();
});

it("shows the status text with a dot of its tone", () => {
  render(
    <BaseConsoleDrawer
      open={false}
      status={{ text: "build failed", tone: "error" }}
      onToggle={vi.fn()}
      onClear={vi.fn()}
    />
  );
  expect(screen.getByText("build failed")).toBeTruthy();
  expect(
    document
      .querySelector('[data-slot="status-dot"]')
      ?.getAttribute("data-variant")
  ).toBe("error");
});
