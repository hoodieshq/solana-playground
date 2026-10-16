import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// The utils barrel reads build-time globals this runner does not define; the
// lesson store only needs the names to exist.
vi.mock("../../../utils", () => ({
  PgExplorer: {},
  PgProgramInfo: {},
  PgTutorial: {},
  PgView: {},
}));

// The tutorials module reads build-time globals too; the registry only
// checks that the path's tutorial is named.
vi.mock("../../../tutorials", () => ({
  TUTORIALS: [{ name: "Hello Anchor" }],
}));

vi.mock("../../sidebar/explorer/Component", () => ({
  __esModule: true,
  default: () => (
    <div id="root-dir" data-testid="explorer">
      tree
    </div>
  ),
}));

vi.mock("../../sidebar/explorer/Component/useCreateItem", () => ({
  useCreateItem: () => ({ createItem: vi.fn() }),
}));

import { render, screen } from "@testing-library/react";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { ThemeProvider, type DefaultTheme } from "styled-components";

import LeftPanel, { isLessonTab, type LessonTab } from "./LeftPanel";
import { INITIAL_LESSON_STATE, PgLesson } from "../lessons";
import type { LessonState } from "../lessons";
import { LESSON_PATHS } from "../lessons/paths";

(
  globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

// A theme that answers every key: the styles are not under test, and the
// real theme's module needs the utils barrel.
const anyTheme: DefaultTheme = new Proxy(
  {},
  {
    get: (_, key) =>
      key === Symbol.toPrimitive || key === "toString"
        ? () => "inherit"
        : anyTheme,
  }
) as unknown as DefaultTheme;

const lessonState: LessonState = {
  path: LESSON_PATHS[0],
  record: INITIAL_LESSON_STATE.record,
  loadFailed: false,
};

describe("LeftPanel", () => {
  let container: HTMLDivElement;
  let root: Root;
  let fire: (s: LessonState) => void;
  let canPass: boolean;
  const pass = vi.fn();

  const mount = (tab: LessonTab, onTabChange: (t: LessonTab) => void) => {
    act(() => {
      root.render(
        <ThemeProvider theme={anyTheme}>
          <LeftPanel collapsed={false} tab={tab} onTabChange={onTabChange} />
        </ThemeProvider>
      );
    });
    act(() => fire(lessonState));
  };

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
    // the segmented measures its thumb with one; jsdom has none
    vi.stubGlobal(
      "ResizeObserver",
      class {
        observe() {}
        unobserve() {}
        disconnect() {}
      }
    );
    canPass = false;
    pass.mockReset();
    vi.spyOn(PgLesson, "onDidChange").mockImplementation((cb) => {
      fire = cb;
      return { dispose: vi.fn() };
    });
    vi.spyOn(PgLesson, "canPass").mockImplementation(() => canPass);
    vi.spyOn(PgLesson, "pass").mockImplementation(pass);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
    vi.restoreAllMocks();
  });

  it("holds Steps and Files in a Segmented named Lesson panel, marking the current tab", () => {
    mount("files", vi.fn());
    const group = container.querySelector('[data-slot="segmented"]');
    expect(group?.getAttribute("aria-label")).toBe("Lesson panel");
    const steps = group?.querySelector("#flow-left-tab-steps");
    const files = group?.querySelector("#flow-left-tab-files");
    expect(steps?.getAttribute("data-state")).toBe("off");
    expect(files?.getAttribute("data-state")).toBe("on");
  });

  it("reports the pressed tab", () => {
    const onTabChange = vi.fn();
    mount("steps", onTabChange);
    const files = container.querySelector<HTMLElement>("#flow-left-tab-files");
    act(() => files?.click());
    expect(onTabChange).toHaveBeenCalledWith("files");
  });

  // The tab lives in `Flow`; this proves only that a fresh mount draws
  // whichever tab it is handed, which is what the Sheet's remount relies on
  it("shows the step rail on steps and the explorer on files, from the tab it is given on mount", () => {
    mount("steps", vi.fn());
    expect(container.querySelector('[data-slot="step-rail"]')).not.toBeNull();
    expect(container.querySelector('[data-testid="explorer"]')).toBeNull();

    act(() => root.unmount());
    root = createRoot(container);
    mount("files", vi.fn());
    expect(container.querySelector('[data-slot="step-rail"]')).toBeNull();
    expect(container.querySelector('[data-testid="explorer"]')).not.toBeNull();
  });

  it("offers Skip this step only when the step can be passed, and passes it", () => {
    mount("steps", vi.fn());
    const skip = () =>
      Array.from(container.querySelectorAll("button")).find(
        (b) => b.textContent === "Skip this step"
      );
    expect(skip()).toBeUndefined();

    canPass = true;
    // A new object: the same one would bail out of the re-render
    act(() =>
      fire({
        path: lessonState.path,
        record: lessonState.record,
        loadFailed: false,
      })
    );
    act(() => skip()?.click());
    expect(pass).toHaveBeenCalledTimes(1);
  });
});

describe("isLessonTab", () => {
  it("accepts the two tabs and nothing else", () => {
    expect(isLessonTab("steps")).toBe(true);
    expect(isLessonTab("files")).toBe(true);
    // The Segmented reports a plain string; anything but a tab is ignored
    expect(isLessonTab("")).toBe(false);
    expect(isLessonTab("settings")).toBe(false);
  });
});

describe("LeftPanel in the flush frame", () => {
  // Outside a lesson: the store's listener is taken and never fired, so the
  // panel keeps `INITIAL_LESSON_STATE`
  beforeEach(() => {
    vi.spyOn(PgLesson, "onDidChange").mockImplementation(() => ({
      dispose: vi.fn(),
    }));
    vi.spyOn(PgLesson, "canPass").mockImplementation(() => false);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  const draw = (collapsed: boolean) =>
    render(
      <ThemeProvider theme={anyTheme}>
        <LeftPanel collapsed={collapsed} tab="steps" onTabChange={vi.fn()} />
      </ThemeProvider>
    );

  it.each([false, true])(
    "has no fold strip of its own (collapsed: %s): the stage bar folds it",
    (collapsed) => {
      draw(collapsed);
      expect(
        screen.queryByRole("button", { name: /project panel/ })
      ).toBeNull();
      expect(screen.queryByRole("button", { name: "New file" })).toBeNull();
    }
  );

  it("shows the tree and its New file footer, and no switch, outside a lesson", () => {
    draw(false);
    expect(document.getElementById("root-dir")).not.toBeNull();
    expect(screen.getByRole("button", { name: "+ New file" })).toBeTruthy();
    // No tab row at all: the column's only fold control is the stage bar's
    expect(document.querySelector('[data-slot="segmented"]')).toBeNull();
    expect(screen.queryByRole("group", { name: "Lesson panel" })).toBeNull();
    expect(document.getElementById("flow-left-tab-steps")).toBeNull();
    expect(document.getElementById("flow-left-tab-files")).toBeNull();
  });

  it("draws nothing while hidden", () => {
    const { container } = draw(true);
    // Not even its landmark: an empty, unnamed <aside> is still listed by a
    // screen reader
    expect(container.firstChild).toBeNull();
  });
});
