import fs from "node:fs";
import path from "node:path";
import { fireEvent, render, screen } from "@testing-library/react";
import { expect, it, vi } from "vitest";

import { BOTTOM_BAR_PX } from "../tokens";
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
  fireEvent.click(screen.getByRole("button", { name: "Clear" }));
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

// The shell folds the panel to `BOTTOM_BAR_PX`; the bar draws itself `h-bar`
// tall, from the design system's `--layout-bar`
it("draws the bar exactly as tall as the folded panel", () => {
  const tokens = fs.readFileSync(
    path.join(__dirname, "../../../app/styles/playground-tokens.css"),
    "utf8"
  );
  const bar = /--layout-bar:\s*([\d.]+)rem;/.exec(tokens);
  expect(bar).not.toBeNull();
  expect(parseFloat(bar![1]) * 16).toBe(BOTTOM_BAR_PX);
});
