import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import type { ReactElement } from "react";
import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";

import {
  initLogger,
  memoryProvider as memoryLogs,
  resetLogger,
} from "@/shared/lib/logger";
import {
  initTelemetry,
  memoryProvider,
  resetTelemetry,
} from "@/shared/lib/telemetry";
import { SidebarProvider } from "@/shared/ui/sidebar";
import { TooltipProvider } from "@/shared/ui/tooltip";

/**
 * A stand-in for the explorer: the `@/utils` barrel needs a booted app. It
 * holds names, ids and the open one, and fires its events on `emit`.
 */
const app = vi.hoisted(() => {
  const listeners = new Set<() => void>();
  const on = (cb: () => void) => {
    listeners.add(cb);
    return { dispose: () => listeners.delete(cb) };
  };
  const state = {
    names: [] as string[],
    ids: {} as Record<string, string>,
    current: null as string | null,
    lessons: [] as string[],
  };
  return {
    state,
    emit: () => listeners.forEach((listener) => listener()),
    PgExplorer: {
      get allWorkspaceNames() {
        return state.names;
      },
      get currentWorkspaceName() {
        return state.current;
      },
      workspaceIdOf: (name: string) => state.ids[name],
      isWorkspaceNameValid: (name: string) => /^(?!\s)[\w\s-]+$/.test(name),
      switchWorkspace: vi.fn(),
      renameWorkspace: vi.fn(),
      createWorkspace: vi.fn(),
      fs: { readDir: vi.fn(), getMetadata: vi.fn(), readToString: vi.fn() },
      onDidCreateWorkspace: on,
      onDidRenameWorkspace: on,
      onDidDeleteWorkspace: on,
      onDidSwitchWorkspace: on,
    },
    PgTutorial: {
      isWorkspaceTutorial: (name: string) => state.lessons.includes(name),
      open: vi.fn(),
    },
    PgView: { setModal: vi.fn(), setToast: vi.fn() },
  };
});
vi.mock("@/utils", () => ({
  PgExplorer: app.PgExplorer,
  PgTutorial: app.PgTutorial,
  PgView: app.PgView,
}));
vi.mock("@/views/flow/lessons", () => ({
  PgLesson: {
    state: { path: null, record: null },
    onDidChange: () => ({ dispose: () => {} }),
  },
  getLessonPath: () => ({ steps: [1, 2, 3, 4] }),
  positionLabel: () => "1 of 4",
  foldRecord: () => null,
}));
const modals = vi.hoisted(() => ({
  DeleteWorkspace: () => null,
  ExportWorkspace: () => null,
}));
vi.mock("@/views/sidebar/explorer/Component/Modals", () => modals);
const files = vi.hoisted(() => ({ readWorkspaceFiles: vi.fn() }));
vi.mock("../model/workspace-files", async (importOriginal) => ({
  rebaseFiles: (
    (await importOriginal()) as typeof import("../model/workspace-files")
  ).rebaseFiles,
  readWorkspaceFiles: files.readWorkspaceFiles,
}));

import { PINS_KEY } from "../model/pins";
import ProjectList from "./ProjectList";

// The stock Sidebar reads the viewport through `matchMedia`, which jsdom lacks
beforeAll(() => {
  vi.stubGlobal("matchMedia", (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addEventListener: () => {},
    removeEventListener: () => {},
    addListener: () => {},
    removeListener: () => {},
    dispatchEvent: () => false,
  }));
});
afterAll(() => {
  vi.unstubAllGlobals();
});

let sent: ReturnType<typeof memoryProvider>;
let logged: ReturnType<typeof memoryLogs>;
beforeEach(() => {
  app.state.names = ["alpha", "beta", "Hello Anchor"];
  app.state.ids = { alpha: "id-a", beta: "id-b", "Hello Anchor": "id-h" };
  app.state.current = "beta";
  app.state.lessons = ["Hello Anchor"];
  vi.clearAllMocks();
  app.PgExplorer.renameWorkspace.mockResolvedValue(undefined);
  app.PgExplorer.createWorkspace.mockResolvedValue(undefined);
  app.PgExplorer.switchWorkspace.mockResolvedValue(undefined);
  app.PgTutorial.open.mockResolvedValue(undefined);
  app.PgView.setModal.mockResolvedValue(null);
  sent = memoryProvider();
  initTelemetry({ providers: [sent] });
  logged = memoryLogs();
  initLogger({ providers: [logged] });
});
afterEach(() => {
  localStorage.clear();
  resetTelemetry();
  resetLogger();
});

const draw = () =>
  render(
    <TooltipProvider>
      <SidebarProvider>
        <ProjectList />
      </SidebarProvider>
    </TooltipProvider>
  );

const menuOf = (name: string) => {
  fireEvent.pointerDown(
    screen.getByRole("button", { name: `Actions for ${name}` }),
    { button: 0, ctrlKey: false }
  );
  return screen.getByRole("menu");
};

const projectNames = () =>
  within(screen.getByRole("group", { name: "Projects" }))
    .getAllByRole("button", { name: /^(alpha|beta|gamma)$/ })
    .map((button) => button.textContent);

const events = (name: string) =>
  sent.events.filter((e) => e.name === name).map((e) => e.params);

const toasts = () =>
  app.PgView.setToast.mock.calls.map(
    ([, props]) => (props as { options: { name: string } }).options.name
  );

describe("ProjectList", () => {
  it("pins by key, keeps the pin by id, and lists the pinned first", () => {
    draw();
    expect(projectNames()).toEqual(["alpha", "beta"]);

    fireEvent.keyDown(menuOf("beta"), { key: "p" });

    expect(JSON.parse(localStorage.getItem(PINS_KEY)!)).toEqual(["id-b"]);
    expect(projectNames()).toEqual(["beta", "alpha"]);
    expect(events("nav_project_action")).toEqual([
      { action: "pin", via: "key" },
    ]);
  });

  it("drops a stored pin no workspace has", () => {
    localStorage.setItem(PINS_KEY, JSON.stringify(["id-a", "gone"]));
    draw();
    expect(JSON.parse(localStorage.getItem(PINS_KEY)!)).toEqual(["id-a"]);
  });

  it("renames in place through the explorer, announced for sync", async () => {
    draw();
    fireEvent.click(
      within(menuOf("alpha")).getByRole("menuitem", { name: "Rename alpha" })
    );
    const field = screen.getByRole("textbox", { name: "Rename alpha" });
    fireEvent.change(field, { target: { value: "gamma" } });
    fireEvent.keyDown(field, { key: "Enter" });

    await waitFor(() =>
      expect(app.PgExplorer.renameWorkspace).toHaveBeenCalledWith("gamma", {
        from: "alpha",
        announce: true,
      })
    );
    await waitFor(() =>
      expect(screen.queryByRole("textbox", { name: "Rename alpha" })).toBeNull()
    );
    expect(events("nav_project_action")).toEqual([
      { action: "rename", via: "click" },
    ]);
  });

  it.each([
    ["beta", "A project named beta already exists."],
    ["bad/name", "Use letters, digits, spaces, - and _."],
    [" lead", "Use letters, digits, spaces, - and _."],
  ])("keeps the field open for %j and says why", (value, message) => {
    draw();
    fireEvent.keyDown(menuOf("alpha"), { key: "r" });
    const field = screen.getByRole("textbox", { name: "Rename alpha" });
    fireEvent.change(field, { target: { value } });
    fireEvent.keyDown(field, { key: "Enter" });

    expect(screen.getByRole("alert").textContent).toBe(message);
    expect(field.getAttribute("aria-invalid")).toBe("true");
    expect(app.PgExplorer.renameWorkspace).not.toHaveBeenCalled();
  });

  it("tells the user a rename failed, and reports it", async () => {
    // The project went away (renamed or deleted elsewhere) while the field
    // was open
    const failure = new Error("Workspace not found");
    app.PgExplorer.renameWorkspace.mockRejectedValue(failure);
    draw();
    fireEvent.keyDown(menuOf("alpha"), { key: "r" });
    const field = screen.getByRole("textbox", { name: "Rename alpha" });
    fireEvent.change(field, { target: { value: "gamma" } });
    fireEvent.keyDown(field, { key: "Enter" });

    await waitFor(() => expect(toasts()).toEqual(["project-action-failed"]));
    expect(events("nav_project_action")).toEqual([
      { action: "rename", via: "key" },
    ]);
    expect(events("nav_project_action_failed")).toEqual([{ action: "rename" }]);
    expect(logged.entries).toEqual([
      expect.objectContaining({
        ns: "app-nav:projects",
        error: failure,
        report: true,
      }),
    ]);
  });

  it("duplicates into the next free copy name, from the store", async () => {
    app.state.names = ["alpha", "alpha copy", "beta"];
    files.readWorkspaceFiles.mockResolvedValue([
      ["/alpha/src/lib.rs", "fn main() {}"],
    ]);
    draw();

    fireEvent.keyDown(menuOf("alpha"), { key: "d" });

    await waitFor(() =>
      expect(app.PgExplorer.createWorkspace).toHaveBeenCalledWith(
        "alpha copy 2",
        { files: [["/alpha copy 2/src/lib.rs", "fn main() {}"]] }
      )
    );
    expect(files.readWorkspaceFiles).toHaveBeenCalledWith(
      "alpha",
      app.PgExplorer.fs
    );
  });

  it("opens a project by switching, a lesson through the tutorial", async () => {
    draw();
    fireEvent.click(screen.getByRole("button", { name: "alpha" }));
    await waitFor(() =>
      expect(app.PgExplorer.switchWorkspace).toHaveBeenCalledWith("alpha")
    );

    fireEvent.click(screen.getByRole("button", { name: "Hello Anchor" }));
    await waitFor(() =>
      expect(app.PgTutorial.open).toHaveBeenCalledWith("Hello Anchor")
    );
  });

  it("does nothing to open the project already open", () => {
    draw();
    fireEvent.click(screen.getByRole("button", { name: "beta" }));
    expect(app.PgExplorer.switchWorkspace).not.toHaveBeenCalled();
  });

  it("hands export and delete to their dialogs, with the project's name", () => {
    draw();
    fireEvent.keyDown(menuOf("alpha"), { key: "e" });
    fireEvent.keyDown(menuOf("Hello Anchor"), { key: "Delete" });

    const [exported, deleted] = app.PgView.setModal.mock.calls.map(
      ([element]) => element as ReactElement<Record<string, unknown>>
    );
    expect(exported.type).toBe(modals.ExportWorkspace);
    expect(exported.props).toEqual({ name: "alpha" });
    expect(deleted.type).toBe(modals.DeleteWorkspace);
    expect(deleted.props).toEqual({ name: "Hello Anchor", isLesson: true });
  });

  it("follows the explorer: a project created elsewhere appears", () => {
    draw();
    act(() => {
      app.state.names = ["alpha", "beta", "gamma"];
      app.state.ids = { alpha: "id-a", beta: "id-b", gamma: "id-g" };
      app.emit();
    });
    expect(projectNames()).toEqual(["alpha", "beta", "gamma"]);
  });
});
