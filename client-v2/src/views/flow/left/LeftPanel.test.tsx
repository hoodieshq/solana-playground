import { fireEvent, render, screen } from "@testing-library/react";
import { ThemeProvider, type DefaultTheme } from "styled-components";
import { afterEach, describe, expect, it, vi } from "vitest";

/** What the mocked explorer and lesson report; each test sets its own */
const given = vi.hoisted(() => ({
  workspace: "a" as string | undefined,
  lesson: { path: null as unknown, record: [] as unknown[] },
}));

// The utils barrel needs build-time globals the unit runner does not define.
vi.mock("../../../utils", () => ({
  PgExplorer: {
    get currentWorkspaceName() {
      return given.workspace;
    },
  },
}));

vi.mock("../../sidebar/explorer/Component", () => ({
  default: () => <div id="root-dir">tree</div>,
}));
vi.mock("../../sidebar/explorer/Component/useCreateItem", () => ({
  useCreateItem: () => ({ createItem: vi.fn() }),
}));

// The lessons module reaches the `@/utils` barrel, whose generated globals
// exist only in a booted app; the panel is drawn here outside a lesson
vi.mock("../lessons", () => ({
  INITIAL_LESSON_STATE: { path: null, record: [] },
  PgLesson: {
    onDidChange: (cb: (state: unknown) => void) => {
      cb(given.lesson);
      return { dispose: () => {} };
    },
    canPass: () => false,
  },
  cursorStep: () => null,
  foldRecord: () => null,
}));
vi.mock("../lessons/StepRail", () => ({ default: () => null }));

import LeftPanel from "./LeftPanel";
import { forgetColumn } from "./kept-column";

/** A theme that answers every key; the styles do not matter here */
const anyTheme: DefaultTheme = new Proxy(
  {},
  {
    get: (_, key) =>
      key === Symbol.toPrimitive || key === "toString"
        ? () => "inherit"
        : anyTheme,
  }
) as unknown as DefaultTheme;

const draw = (collapsed: boolean) =>
  render(
    <ThemeProvider theme={anyTheme}>
      <LeftPanel collapsed={collapsed} />
    </ThemeProvider>
  );

describe("LeftPanel in the flush frame", () => {
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

  it("shows the tree and its New file footer while open", () => {
    draw(false);
    expect(document.getElementById("root-dir")).not.toBeNull();
    expect(screen.getByRole("button", { name: "+ New file" })).toBeTruthy();
  });

  it("draws nothing while hidden", () => {
    const { container } = draw(true);
    // Not even its landmark: an empty, unnamed <aside> is still listed by a
    // screen reader
    expect(container.firstChild).toBeNull();
  });
});

describe("LeftPanel across an unmount", () => {
  /** A lesson the panel shows its Steps and Files tabs for */
  const inLesson = () => {
    given.lesson = { path: { id: "lesson" }, record: [] };
  };
  const body = () => document.getElementById("flow-left-tabpanel")!;

  afterEach(() => {
    forgetColumn();
    given.workspace = "a";
    given.lesson = { path: null, record: [] };
  });

  it("keeps the Files tab across an unmount", () => {
    inLesson();
    const first = draw(false);
    fireEvent.click(document.getElementById("flow-left-tab-files")!);
    first.unmount();

    draw(false);
    expect(
      document
        .getElementById("flow-left-tab-files")!
        .getAttribute("aria-selected")
    ).toBe("true");
  });

  it("keeps the scroll across an unmount", () => {
    const first = draw(false);
    body().scrollTop = 120;
    first.unmount();

    draw(false);
    expect(body().scrollTop).toBe(120);
  });

  it("keeps for the project open when the column hides", () => {
    // A lesson mounts the column before the explorer has opened its project
    given.workspace = undefined;
    inLesson();
    const first = draw(false);
    given.workspace = "a";
    fireEvent.click(document.getElementById("flow-left-tab-files")!);
    first.unmount();

    draw(false);
    expect(
      document
        .getElementById("flow-left-tab-files")!
        .getAttribute("aria-selected")
    ).toBe("true");
  });

  it("ignores another project's memory", () => {
    inLesson();
    const first = draw(false);
    fireEvent.click(document.getElementById("flow-left-tab-files")!);
    body().scrollTop = 120;
    first.unmount();

    given.workspace = "b";
    draw(false);
    expect(
      document
        .getElementById("flow-left-tab-steps")!
        .getAttribute("aria-selected")
    ).toBe("true");
    expect(body().scrollTop).toBe(0);
  });
});
