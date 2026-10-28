import fs from "node:fs";
import path from "node:path";
import { fireEvent, render, screen } from "@testing-library/react";
import { expect, it, vi } from "vitest";

import { BOTTOM_BAR_PX } from "../tokens";
import BaseConsoleDrawer, { CONSOLE_BODY_ID } from "./BaseConsoleDrawer";

const idle = { text: "", tone: "idle" as const };

const draw = (
  open: boolean,
  handlers: {
    onOpenChange?: (open: boolean) => void;
    onClear?: () => void;
    onStop?: () => void;
    running?: "build" | "deploy" | null;
  }
) =>
  render(
    <BaseConsoleDrawer
      open={open}
      status={idle}
      onOpenChange={handlers.onOpenChange ?? vi.fn()}
      onClear={handlers.onClear ?? vi.fn()}
      onStop={handlers.onStop ?? vi.fn()}
      running={handlers.running ?? null}
      shortcut="⌘J"
    >
      <div className="xterm" />
    </BaseConsoleDrawer>
  );

it("names its button Terminal and controls the body by its fixed id", () => {
  draw(false, {});
  const button = screen.getByRole("button", { name: "Terminal" });
  expect(button.getAttribute("aria-expanded")).toBe("false");
  expect(button.getAttribute("aria-controls")).toBe(CONSOLE_BODY_ID);
  expect(
    document.getElementById(CONSOLE_BODY_ID)!.querySelector(".xterm")
  ).not.toBeNull();
});

it("asks to open, from the button and from the strip, while closed", () => {
  const onOpenChange = vi.fn();
  draw(false, { onOpenChange });
  fireEvent.click(screen.getByRole("button", { name: "Terminal" }));
  fireEvent.click(
    screen.getByText("Terminal", { selector: "[data-console-label]" })
  );
  expect(onOpenChange.mock.calls).toEqual([[true], [true]]);
});

it("asks to close from the button while open", () => {
  const onOpenChange = vi.fn();
  draw(true, { onOpenChange });
  fireEvent.click(screen.getByRole("button", { name: "Terminal" }));
  expect(onOpenChange.mock.calls).toEqual([[false]]);
});

// The layout shell owns ⌘/Ctrl+J; a listener of the drawer's own would
// toggle the console a second time on the same key
it("leaves ⌘J and Ctrl+J to the shell", () => {
  const onOpenChange = vi.fn();
  draw(false, { onOpenChange });
  fireEvent.keyDown(window, { key: "j", ctrlKey: true });
  fireEvent.keyDown(window, { key: "j", metaKey: true });
  expect(onOpenChange).not.toHaveBeenCalled();
});

it("clears without toggling", () => {
  const onOpenChange = vi.fn();
  const onClear = vi.fn();
  draw(true, { onOpenChange, onClear });
  fireEvent.click(screen.getByRole("button", { name: "Clear" }));
  expect(onClear).toHaveBeenCalledTimes(1);
  expect(onOpenChange).not.toHaveBeenCalled();
});

// Spec 13: Stop takes Clear's place while a command runs
it.each([
  ["build", true],
  ["build", false],
  ["deploy", true],
  ["deploy", false],
] as const)(
  "offers Stop %s in place of Clear (open: %s), without toggling",
  (run, open) => {
    const onOpenChange = vi.fn();
    const onStop = vi.fn();
    draw(open, { onOpenChange, onStop, running: run });

    const stop = screen.getByRole("button", { name: `Stop ${run}` });
    expect(stop.textContent).toBe("Stop");
    expect(screen.queryByRole("button", { name: "Clear" })).toBeNull();
    fireEvent.click(stop);
    expect(onStop).toHaveBeenCalledTimes(1);
    expect(onOpenChange).not.toHaveBeenCalled();
  }
);

it("offers no Stop while nothing runs", () => {
  draw(true, {});
  expect(screen.queryByRole("button", { name: /^Stop/ })).toBeNull();
  expect(screen.getByRole("button", { name: "Clear" })).toBeTruthy();
});

it("shows the status text with a dot of its tone", () => {
  render(
    <BaseConsoleDrawer
      open={false}
      status={{ text: "build failed", tone: "error" }}
      onOpenChange={vi.fn()}
      onClear={vi.fn()}
      onStop={vi.fn()}
      running={null}
      shortcut="⌘J"
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

it("sits flush in the frame: no edges of its own, the shell's handle draws the line", () => {
  const { container } = draw(true, {});
  const root = container.firstElementChild!;
  expect(root.className).not.toMatch(/\bborder/);
  expect(root.className).not.toMatch(/rounded/);
});
