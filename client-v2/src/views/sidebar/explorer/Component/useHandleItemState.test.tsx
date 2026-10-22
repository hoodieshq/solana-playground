import { render } from "@testing-library/react";
import { useRef, type ReactElement } from "react";
import { ThemeProvider, type DefaultTheme } from "styled-components";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { PgExplorer } from "../../../../utils";
import { forgetTree } from "./kept-tree";
import { useHandleItemState } from "./useHandleItemState";

/** What the mocked explorer reports; each test sets its own */
const given = vi.hoisted(() => ({ workspace: "w1" as string | undefined }));

/** The explorer's listeners, for a test to fire as the explorer would */
const fire = vi.hoisted(() => ({
  openFile: (_file: { path: string } | null) => {},
  switchWorkspace: () => {},
}));

// The utils barrel needs build-time globals the unit runner does not define.
vi.mock("../../../../utils", () => ({
  PgView: { classNames: { FOLDER: "folder", OPEN: "open" } },
  PgCommon: { sleep: () => new Promise(() => {}) },
  PgExplorer: {
    get currentWorkspaceId() {
      return given.workspace;
    },
    getElFromPath: (path: string) =>
      document.querySelector(`[data-path='${path}']`) ?? undefined,
    openFolder: vi.fn((el: HTMLElement) => el.classList.add("open")),
    // One level is enough for these trees: a file sits right under `src/`
    openAllParents: (path: string) =>
      document
        .querySelector(`[data-path='${path.replace(/[^/]+$/, "")}']`)
        ?.classList.add("open"),
    collapseAllFolders: () =>
      document
        .querySelectorAll(".folder")
        .forEach((el) => el.classList.remove("open")),
    setSelectedEl: () => {},
    removeCtxSelectedEl: () => {},
    onDidSwitchWorkspace: (cb: () => void) => {
      fire.switchWorkspace = cb;
      return { dispose: () => {} };
    },
    onDidOpenFile: (cb: (file: { path: string } | null) => void) => {
      fire.openFile = cb;
      return { dispose: () => {} };
    },
  },
}));

const theme = { name: "test" } as unknown as DefaultTheme;

/**
 * The tree of `workspace` (`w1` by default): its `src/`, closed or open when
 * `open` is given, holding `lib.rs`; no tree at all for `null`, as before a
 * project's files have been drawn
 */
const Tree = ({
  open,
  workspace = "w1",
}: {
  open?: boolean;
  workspace?: string | null;
}) => {
  const ref = useRef<HTMLDivElement>(null);
  useHandleItemState(ref);
  return (
    <div ref={ref} id="root-dir">
      {workspace && (
        <>
          <div
            className={open ? "folder open" : "folder"}
            data-path={`/${workspace}/src/`}
          />
          <div data-path={`/${workspace}/src/lib.rs`} />
        </>
      )}
    </div>
  );
};

const inTheme = (tree: ReactElement) => (
  <ThemeProvider theme={theme}>{tree}</ThemeProvider>
);

const draw = (open?: boolean) => render(inTheme(<Tree open={open} />));

const srcIsOpen = (workspace = "w1") =>
  document
    .querySelector(`[data-path='/${workspace}/src/']`)!
    .classList.contains("open");

// Before, not after: Testing Library unmounts the last tree after this file's
// own `afterEach`, and that unmount keeps it again
beforeEach(() => {
  forgetTree();
  given.workspace = "w1";
  vi.mocked(PgExplorer.openFolder).mockClear();
});

describe("useHandleItemState across an unmount", () => {
  it("opens again the folders open when the tree unmounted", () => {
    draw(true).unmount();
    draw();
    expect(srcIsOpen()).toBe(true);
  });

  it("keeps for the project open when the tree unmounts", () => {
    // The tree can mount before the explorer has opened its project
    given.workspace = undefined;
    const first = draw(true);
    given.workspace = "w1";
    first.unmount();

    draw();
    expect(srcIsOpen()).toBe(true);
  });

  it("opens nothing for another project", () => {
    draw(true).unmount();
    given.workspace = "w2";
    draw();
    expect(PgExplorer.openFolder).not.toHaveBeenCalled();
  });

  it("keeps nothing while no project is open", () => {
    given.workspace = undefined;
    draw(true).unmount();
    draw();
    expect(PgExplorer.openFolder).not.toHaveBeenCalled();
  });
});

describe("useHandleItemState when a project opens", () => {
  // `PgExplorer.switchWorkspace` announces the open file, then the switch,
  // and React draws the new project's tree some time after both: on a loaded
  // machine, after any fixed wait
  it("opens the open file's folder once the tree that holds it is drawn", () => {
    const view = render(inTheme(<Tree workspace={null} />));
    fire.openFile({ path: "/w2/src/lib.rs" });
    fire.switchWorkspace();

    view.rerender(inTheme(<Tree workspace="w2" />));
    expect(srcIsOpen("w2")).toBe(true);
  });

  it("opens it again after the switch shuts a tree already drawn", () => {
    render(inTheme(<Tree workspace="w2" />));
    fire.openFile({ path: "/w2/src/lib.rs" });
    fire.switchWorkspace();

    expect(srcIsOpen("w2")).toBe(true);
  });
});
