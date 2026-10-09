import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";

import {
  initTelemetry,
  memoryProvider,
  resetTelemetry,
} from "@/shared/lib/telemetry";
// The `@/utils` barrel reaches generated globals (`GLOBAL_SETTINGS`) that
// exist only in a booted app, so the test builds it from the three pieces the
// shell uses: the real keybinds and editor events, and a deploy command it
// can start.
const deploy = vi.hoisted(() => ({
  starts: new Set<(input: string | null) => void>(),
}));
vi.mock("@/utils", async () => {
  const { PgKeybind } = await import("@/utils/keybind");
  const { PgEditor } = await import("@/utils/editor");
  return {
    PgKeybind,
    PgEditor,
    PgCommand: {
      deploy: {
        onDidStart: (cb: (input: string | null) => void) => {
          deploy.starts.add(cb);
          return { dispose: () => deploy.starts.delete(cb) };
        },
      },
    },
  };
});

import { PgFlow } from "@/views/flow/state/stage";
import { PgAssistant } from "@/views/sidebar/assistant/store";
import { LAYOUT_STORAGE_KEY } from "../model/layout-state";
import LayoutShell from "./LayoutShell";

const listeners = new Set<() => void>();
let width = 1440;
const screenMedia = (query: string) => {
  const max = Number(/max-width:\s*(\d+)px/.exec(query)?.[1]);
  return {
    get matches() {
      return width <= max;
    },
    media: query,
    onchange: null,
    addEventListener: (_: string, fn: () => void) => listeners.add(fn),
    removeEventListener: (_: string, fn: () => void) => listeners.delete(fn),
    addListener: () => {},
    removeListener: () => {},
    dispatchEvent: () => false,
  };
};
const resizeTo = (next: number) => {
  width = next;
  window.innerWidth = next;
  listeners.forEach((fn) => fn());
};
class NoopResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}

let sent: ReturnType<typeof memoryProvider>;
beforeEach(() => {
  width = 1440;
  window.innerWidth = 1440;
  vi.stubGlobal("matchMedia", screenMedia);
  vi.stubGlobal("ResizeObserver", NoopResizeObserver);
  localStorage.clear();
  PgFlow["_dispatch"]({ type: "workspace-change" });
  sent = memoryProvider();
  initTelemetry({ providers: [sent] });
});
afterEach(() => {
  PgFlow["_dispatch"]({ type: "workspace-change" });
  vi.unstubAllGlobals();
  resetTelemetry();
});

const toggled = () =>
  sent.events
    .filter((event) => event.name === "layout_panel_toggled")
    .map((event) => event.params);

const consoleButton = () => screen.getByRole("button", { name: "Console" });

// `PgKeybind` listens on `document` and reads Ctrl or Meta as "Ctrl"; the
// stock Sidebar listens on `window`, which an event on `document` reaches.
const press = (init: KeyboardEventInit) => fireEvent.keyDown(document, init);

const shell = () =>
  render(
    <LayoutShell
      left={(collapsed, toggle) => (
        <button type="button" onClick={toggle}>
          {collapsed ? "Expand project panel" : "Collapse project panel"}
        </button>
      )}
      stage={<main>stage</main>}
      console={(open, toggle) => (
        <button
          type="button"
          aria-label="Console"
          aria-expanded={open}
          onClick={toggle}
        />
      )}
      assistant={(open, toggle) => (
        <button type="button" onClick={toggle}>
          {open ? "Collapse assistant" : "Expand assistant"}
        </button>
      )}
    />
  );

it("should report the width class once per load", () => {
  shell();
  expect(
    sent.events.filter((event) => event.name === "layout_viewport")
  ).toEqual([expect.objectContaining({ params: { width: "wide" } })]);
});

it("should toggle the console by button and by Ctrl+J, and say which", () => {
  shell();
  fireEvent.click(consoleButton());
  expect(consoleButton().getAttribute("aria-expanded")).toBe("true");
  press({ key: "j", ctrlKey: true });
  expect(consoleButton().getAttribute("aria-expanded")).toBe("false");
  expect(toggled()).toEqual([
    { panel: "console", open: true, via: "button" },
    { panel: "console", open: false, via: "key" },
  ]);
});

it("should report ⌘B once, via key", () => {
  shell();
  press({ key: "b", metaKey: true });
  expect(
    screen.getByRole("button", { name: "Expand project panel" })
  ).toBeTruthy();
  expect(toggled()).toEqual([{ panel: "left", open: false, via: "key" }]);
});

it("should report the project panel's own button as a button", () => {
  shell();
  fireEvent.click(
    screen.getByRole("button", { name: "Collapse project panel" })
  );
  expect(toggled()).toEqual([{ panel: "left", open: false, via: "button" }]);
});

it("should toggle the assistant by Ctrl+R", () => {
  shell();
  press({ key: "r", ctrlKey: true });
  expect(screen.getByRole("button", { name: "Expand assistant" })).toBeTruthy();
  expect(toggled()).toEqual([{ panel: "assistant", open: false, via: "key" }]);
});

it("should keep toggling from the current value on repeated keys", () => {
  shell();
  press({ key: "j", ctrlKey: true });
  press({ key: "j", ctrlKey: true });
  press({ key: "j", ctrlKey: true });
  expect(consoleButton().getAttribute("aria-expanded")).toBe("true");
  expect(toggled()).toHaveLength(3);
});

it("should open the assistant on 'Fix with assistant', as auto", () => {
  shell();
  press({ key: "r", ctrlKey: true });
  act(() => PgAssistant.requestPrompt("fix this"));
  expect(
    screen.getByRole("button", { name: "Collapse assistant" })
  ).toBeTruthy();
  expect(toggled().at(-1)).toEqual({
    panel: "assistant",
    open: true,
    via: "auto",
  });
});

it("should send each toggle once under StrictMode", async () => {
  const { StrictMode } = await import("react");
  render(
    <StrictMode>
      <LayoutShell
        left={() => null}
        stage={<main>stage</main>}
        console={(open, toggle) => (
          <button type="button" aria-label="Console" onClick={toggle}>
            {String(open)}
          </button>
        )}
        assistant={() => null}
      />
    </StrictMode>
  );
  fireEvent.click(consoleButton());
  expect(toggled()).toEqual([{ panel: "console", open: true, via: "button" }]);
});

it("should leave a saved value alone on mount, and write v1 on a toggle", () => {
  const newer = JSON.stringify({ v: 2, leftOpen: true });
  localStorage.setItem(LAYOUT_STORAGE_KEY, newer);
  shell();
  expect(localStorage.getItem(LAYOUT_STORAGE_KEY)).toBe(newer);
  fireEvent.click(consoleButton());
  expect(JSON.parse(localStorage.getItem(LAYOUT_STORAGE_KEY)!)).toMatchObject({
    v: 1,
    consoleOpen: true,
  });
});

it("should report the assistant Sheet opening and closing, and save nothing", () => {
  resizeTo(800);
  shell();
  fireEvent.click(screen.getByRole("button", { name: "Expand assistant" }));
  fireEvent.keyDown(document.querySelector('[data-slot="sheet-content"]')!, {
    key: "Escape",
  });
  expect(toggled()).toEqual([
    { panel: "assistant", open: true, via: "button" },
    { panel: "assistant", open: false, via: "button" },
  ]);
  expect(localStorage.getItem(LAYOUT_STORAGE_KEY)).toBeNull();
});

it("should open the project panel Sheet below 768 px and report it", () => {
  resizeTo(500);
  shell();
  fireEvent.click(screen.getByRole("button", { name: "Expand project panel" }));
  const sheet = document.querySelector(
    '[data-slot="sidebar"][data-mobile="true"]'
  );
  expect(sheet).not.toBeNull();
  expect(toggled()).toEqual([{ panel: "left", open: true, via: "button" }]);
  expect(localStorage.getItem(LAYOUT_STORAGE_KEY)).toBeNull();
});

it("should save the open state and read it back", () => {
  const first = shell();
  fireEvent.click(consoleButton());
  first.unmount();
  expect(JSON.parse(localStorage.getItem(LAYOUT_STORAGE_KEY)!)).toMatchObject({
    consoleOpen: true,
  });

  shell();
  expect(consoleButton().getAttribute("aria-expanded")).toBe("true");
});

it("should fall back on a corrupt saved layout and report it", () => {
  localStorage.setItem(LAYOUT_STORAGE_KEY, "{");
  shell();
  expect(
    screen.getByRole("button", { name: "Collapse project panel" })
  ).toBeTruthy();
  expect(
    sent.events.filter((event) => event.name === "layout_restore_failed")
  ).toEqual([expect.objectContaining({ params: { reason: "corrupt" } })]);
});

it("should report a blocked edit once per load", () => {
  shell();
  document.dispatchEvent(new CustomEvent("editorreadonlyedit"));
  document.dispatchEvent(new CustomEvent("editorreadonlyedit"));
  expect(
    sent.events.filter((event) => event.name === "layout_readonly_edit_blocked")
  ).toHaveLength(1);
});

it("should close the Sheet when crossing to wide and keep the saved state", () => {
  resizeTo(800);
  shell();
  fireEvent.click(screen.getByRole("button", { name: "Expand assistant" }));
  expect(document.querySelector('[data-slot="sheet-content"]')).not.toBeNull();

  act(() => resizeTo(1440));
  expect(document.querySelector('[data-slot="sheet-content"]')).toBeNull();
  expect(
    screen.getByRole("button", { name: "Collapse assistant" })
  ).toBeTruthy();
  // Crossing a breakpoint writes nothing
  expect(localStorage.getItem(LAYOUT_STORAGE_KEY)).toBeNull();
});

it("should open the console when a deploy starts, as auto", () => {
  shell();
  act(() => deploy.starts.forEach((cb) => cb(null)));
  expect(consoleButton().getAttribute("aria-expanded")).toBe("true");
  expect(toggled()).toEqual([{ panel: "console", open: true, via: "auto" }]);
});

it("should open the console once when a deploy fails, not for one already failed", () => {
  // The reducer is the only way to set a deploy's status without a deploy
  const dispatch = (ev: Parameters<typeof PgFlow.reduce>[1]) =>
    PgFlow["_dispatch"](ev);
  dispatch({ type: "deploy-start" });
  dispatch({ type: "deploy-finish", ok: false });
  shell();
  expect(toggled()).toEqual([]);

  dispatch({ type: "workspace-change" });
  dispatch({ type: "deploy-start" });
  act(() => dispatch({ type: "deploy-finish", ok: false }));
  expect(toggled()).toEqual([{ panel: "console", open: true, via: "auto" }]);
});
