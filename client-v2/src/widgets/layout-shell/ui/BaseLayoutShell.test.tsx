import { render, screen } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";

import BaseLayoutShell from "./BaseLayoutShell";
import type { BaseLayoutShellProps } from "./BaseLayoutShell";

class NoopResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}
const desktopMatchMedia = (query: string) => ({
  matches: false,
  media: query,
  onchange: null,
  addEventListener: () => {},
  removeEventListener: () => {},
  addListener: () => {},
  removeListener: () => {},
  dispatchEvent: () => false,
});
beforeEach(() => {
  vi.stubGlobal("ResizeObserver", NoopResizeObserver);
  vi.stubGlobal("matchMedia", desktopMatchMedia);
});
afterEach(() => vi.unstubAllGlobals());

const props = (
  viewport: BaseLayoutShellProps["viewport"]
): BaseLayoutShellProps => ({
  viewport,
  leftOpen: true,
  onLeftOpenChange: vi.fn(),
  assistantOpen: true,
  onAssistantOpenChange: vi.fn(),
  assistantSheetOpen: false,
  onAssistantSheetChange: vi.fn(),
  consoleOpen: false,
  onConsoleOpenChange: vi.fn(),
  horizontal: undefined,
  vertical: undefined,
  onHorizontalLayout: vi.fn(),
  onVerticalLayout: vi.fn(),
  left: <nav>left slot</nav>,
  stage: <main>stage slot</main>,
  console: <div className="xterm">console slot</div>,
  assistant: <section>assistant slot</section>,
  assistantOpener: <button type="button">Expand assistant</button>,
});

it("should lay out every slot on a wide screen", () => {
  render(<BaseLayoutShell {...props("wide")} />);
  for (const slot of [
    "left slot",
    "stage slot",
    "console slot",
    "assistant slot",
  ]) {
    expect(screen.getByText(slot)).toBeTruthy();
  }
  expect(document.querySelector('[data-slot="sidebar"]')).not.toBeNull();
  expect(
    document.querySelectorAll('[data-slot="resizable-panel-group"]')
  ).toHaveLength(2);
  expect(screen.queryByRole("button", { name: "Expand assistant" })).toBeNull();
});

it("should keep a folded console mounted", () => {
  render(<BaseLayoutShell {...props("wide")} />);
  expect(document.querySelector(".xterm")).not.toBeNull();
});

it("should put the assistant in a closed Sheet below 1024 px, with its opener", () => {
  render(<BaseLayoutShell {...props("compact")} />);
  expect(screen.queryByText("assistant slot")).toBeNull();
  expect(screen.getByRole("button", { name: "Expand assistant" })).toBeTruthy();
  expect(
    document.querySelectorAll('[data-slot="resizable-panel-group"]')
  ).toHaveLength(1);
});

it("should show the assistant Sheet when it is open", () => {
  const open = props("phone");
  render(
    <BaseLayoutShell
      viewport={open.viewport}
      leftOpen={open.leftOpen}
      onLeftOpenChange={open.onLeftOpenChange}
      assistantOpen={open.assistantOpen}
      onAssistantOpenChange={open.onAssistantOpenChange}
      assistantSheetOpen
      onAssistantSheetChange={open.onAssistantSheetChange}
      consoleOpen={open.consoleOpen}
      onConsoleOpenChange={open.onConsoleOpenChange}
      onHorizontalLayout={open.onHorizontalLayout}
      onVerticalLayout={open.onVerticalLayout}
      left={open.left}
      stage={open.stage}
      console={open.console}
      assistant={open.assistant}
      assistantOpener={open.assistantOpener}
    />
  );
  expect(screen.getByText("assistant slot")).toBeTruthy();
});

it("should set the design system's sidebar widths", () => {
  render(<BaseLayoutShell {...props("wide")} />);
  const wrapper = document.querySelector<HTMLElement>(
    '[data-slot="sidebar-wrapper"]'
  )!;
  expect(wrapper.style.getPropertyValue("--sidebar-width")).toBe("14.5rem");
  expect(wrapper.style.getPropertyValue("--sidebar-width-icon")).toBe(
    "3.25rem"
  );
});
