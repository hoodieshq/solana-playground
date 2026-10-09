import { fireEvent, render, screen } from "@testing-library/react";
import { createElement, useRef } from "react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";

// Partial mock: only `usePanelRef` is replaced, so the tests can see which
// imperative calls the shell makes. The refs ignore the library's own
// assignment to `current`, which would replace the spies.
const panelSpies = vi.hoisted(() => ({
  created: 0,
  groups: {} as Record<
    string,
    { defaultLayout?: unknown; onLayoutChanged?: (l: unknown) => void }
  >,
  handles: [] as Array<{
    collapse: ReturnType<typeof vi.fn>;
    resize: ReturnType<typeof vi.fn>;
    isCollapsed: ReturnType<typeof vi.fn>;
  }>,
}));
vi.mock("react-resizable-panels", async (importOriginal) => {
  const real = await importOriginal<typeof import("react-resizable-panels")>();
  return {
    ...real,
    // Records each group's layout props by id, then renders the real group
    Group: (groupProps: {
      id?: string;
      defaultLayout?: unknown;
      onLayoutChanged?: (l: unknown) => void;
    }) => {
      panelSpies.groups[groupProps.id ?? ""] = groupProps;
      return createElement(
        real.Group,
        groupProps as React.ComponentProps<typeof real.Group>
      );
    },
    usePanelRef: () => {
      const index = useRef(-1);
      if (index.current < 0) index.current = panelSpies.created++;
      const handle = panelSpies.handles[index.current];
      return useRef({
        get current() {
          return handle;
        },
        set current(_ignored: unknown) {},
      }).current;
    },
  };
});

import BaseLayoutShell, { PANEL_SIZES } from "./BaseLayoutShell";
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
  panelSpies.created = 0;
  panelSpies.groups = {};
  panelSpies.handles = [0, 1].map(() => ({
    collapse: vi.fn(),
    resize: vi.fn(),
    isCollapsed: vi.fn(() => false),
  }));
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
  left: () => <nav>left slot</nav>,
  onLeftSheetChange: vi.fn(),
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
  ).toHaveLength(2);
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
      onLeftSheetChange={open.onLeftSheetChange}
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

it("should keep the console mounted when the window crosses 1024 px", () => {
  const { rerender } = render(<BaseLayoutShell {...props("wide")} />);
  const before = screen.getByText("console slot");
  rerender(<BaseLayoutShell {...props("compact")} />);
  expect(screen.getByText("console slot")).toBe(before);
  expect(screen.queryByText("assistant slot")).toBeNull();
});

it("should mark the sidebar expanded or collapsed from leftOpen", () => {
  const open = render(<BaseLayoutShell {...props("wide")} />);
  expect(
    document.querySelector('[data-slot="sidebar"]')!.getAttribute("data-state")
  ).toBe("expanded");
  open.unmount();
  render(<BaseLayoutShell {...props("wide")} leftOpen={false} />);
  expect(
    document.querySelector('[data-slot="sidebar"]')!.getAttribute("data-state")
  ).toBe("collapsed");
});

it("should report the Sheet closing", () => {
  const shell = { ...props("phone"), assistantSheetOpen: true };
  render(<BaseLayoutShell {...shell} />);
  const sheet = document.querySelector('[data-slot="sheet-content"]')!;
  fireEvent.keyDown(sheet, { key: "Escape" });
  expect(shell.onAssistantSheetChange).toHaveBeenCalledWith(false);
});

it("should collapse the assistant panel when assistantOpen turns false", () => {
  const [assistant] = panelSpies.handles;
  const { rerender } = render(<BaseLayoutShell {...props("wide")} />);
  expect(assistant.collapse).not.toHaveBeenCalled();
  expect(assistant.resize).not.toHaveBeenCalled();
  rerender(<BaseLayoutShell {...props("wide")} assistantOpen={false} />);
  expect(assistant.collapse).toHaveBeenCalledTimes(1);
});

it("should open a collapsed assistant panel at its default width when assistantOpen turns true", () => {
  // `expand()` would open a panel that mounted folded at its minimum
  const [assistant] = panelSpies.handles;
  assistant.isCollapsed.mockReturnValue(true);
  render(<BaseLayoutShell {...props("wide")} />);
  expect(assistant.resize).toHaveBeenCalledTimes(1);
  expect(assistant.resize).toHaveBeenCalledWith(PANEL_SIZES.assistant.default);
  expect(assistant.collapse).not.toHaveBeenCalled();
});

it("should open a folded console at its default height when consoleOpen turns true", () => {
  const consolePanel = panelSpies.handles[1];
  consolePanel.isCollapsed.mockReturnValue(true);
  render(<BaseLayoutShell {...props("wide")} consoleOpen />);
  expect(consolePanel.resize).toHaveBeenCalledWith(PANEL_SIZES.console.default);
});

it("should do nothing when the console panel already matches consoleOpen", () => {
  const consolePanel = panelSpies.handles[1];
  consolePanel.isCollapsed.mockReturnValue(true);
  render(<BaseLayoutShell {...props("wide")} />);
  expect(consolePanel.collapse).not.toHaveBeenCalled();
  expect(consolePanel.resize).not.toHaveBeenCalled();
});

it("should not take or save a horizontal layout below 1024 px", () => {
  const compact = props("compact");
  render(
    <BaseLayoutShell {...compact} horizontal={{ center: 70, assistant: 30 }} />
  );
  const group = panelSpies.groups["layout-horizontal"];
  expect(group.defaultLayout).toBeUndefined();
  expect(group.onLayoutChanged).toBeUndefined();
});

it("should take and save the horizontal layout on a wide screen", () => {
  const wide = props("wide");
  render(
    <BaseLayoutShell {...wide} horizontal={{ center: 70, assistant: 30 }} />
  );
  const group = panelSpies.groups["layout-horizontal"];
  expect(group.defaultLayout).toEqual({ center: 70, assistant: 30 });
  group.onLayoutChanged!({ center: 60, assistant: 40 });
  expect(wide.onHorizontalLayout).toHaveBeenCalledWith({
    center: 60,
    assistant: 40,
  });
});
