import { projectSync } from "./project-sync";
import { PgChatStorage } from "../../features/persistence/model/chat-storage";
import { PgProjectSync } from "../../features/persistence/model/project-sync";
import * as restore from "../../features/persistence/model/project-restore";
import { PgSyncMark } from "../../features/persistence/model/sync-mark";
import { PgCommon } from "../../utils/common";
import { PgExplorer } from "../../utils/explorer/explorer";
import { PgFs } from "../../utils/explorer/fs";
import type { Disposable } from "../../utils/types";

/**
 * What this effect subscribes to is the whole of its job.
 *
 * It was subscribed to file changes alone, so a project reached the server
 * only by being typed in: opening one, or signing in with one already open,
 * left it on this device however long you looked at it. That is not visible in
 * a test of `PgProjectSync`, which was correct throughout -- nothing called it.
 *
 * The visibility half is the other side of the same coin. A tab that has been
 * in the background holds a stale in-memory copy of the current workspace, and
 * anything that nudges it uploads that copy over whatever has happened since.
 */

const dispatch = (event: string) =>
  PgCommon.createAndDispatchCustomEvent(event);

const setVisibility = (state: "visible" | "hidden") => {
  Object.defineProperty(document, "visibilityState", {
    value: state,
    configurable: true,
  });
  document.dispatchEvent(new Event("visibilitychange"));
};

describe("the project-sync effect", () => {
  let push: jest.SpyInstance;
  let effect: Disposable | null;

  beforeEach(() => {
    jest.useFakeTimers();
    effect = null;
    push = jest
      .spyOn(PgProjectSync, "pushCurrent")
      .mockResolvedValue("ok" as never);
    jest.spyOn(PgSyncMark, "markDirty").mockResolvedValue(undefined);
    jest.spyOn(PgSyncMark, "projectIds").mockResolvedValue([]);
    jest
      .spyOn(PgExplorer, "currentWorkspaceId", "get")
      .mockReturnValue("p1" as never);
    Object.defineProperty(document, "visibilityState", {
      value: "visible",
      configurable: true,
    });
  });

  afterEach(() => {
    // Disposed here rather than at the end of each test: an assertion that
    // fails before its own `dispose()` leaves the effect subscribed, and the
    // next test sees its pushes
    effect?.dispose();
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  it("still uploads on an edit", () => {
    effect = projectSync();

    dispatch(PgExplorer.events.ON_DID_SAVE_FILE);
    jest.advanceTimersByTime(3000);

    expect(push).toHaveBeenCalled();
  });

  it("collapses a burst of edits into one upload", () => {
    effect = projectSync();

    dispatch(PgExplorer.events.ON_DID_SAVE_FILE);
    dispatch(PgExplorer.events.ON_DID_SAVE_FILE);
    dispatch(PgExplorer.events.ON_DID_SAVE_FILE);
    jest.advanceTimersByTime(3000);

    expect(push).toHaveBeenCalledTimes(1);
  });

  it("flushes a pending edit when the user leaves the project", () => {
    // Otherwise the debounce is simply cancelled by the switch and the edit
    // waits for the next reconcile to notice it
    effect = projectSync();

    dispatch(PgExplorer.events.ON_DID_SAVE_FILE);
    dispatch(PgExplorer.events.ON_DID_SWITCH_WORKSPACE);

    expect(push).toHaveBeenCalledTimes(1);

    // ...and does not then blind-push the incoming project on a timer. What
    // the incoming project needs is a reconcile, which may well mean pulling
    // rather than pushing -- covered in "opening a project" below.
    jest.advanceTimersByTime(3000);
    expect(push).toHaveBeenCalledTimes(1);
  });

  it("uploads tutorial progress and the program keypair", () => {
    // These three files are written straight to `PgFs` by `PgTutorial` and
    // `PgProgramInfo`, not through `saveFileToState`, so none of the explorer
    // events fires for them. They are also exactly the files the snapshot
    // deliberately carries -- so the only files sync exists to move were the
    // only ones nothing ever scheduled an upload for, and a tutorial's page
    // number reached the server only if some unrelated edit happened later.
    effect = projectSync();

    for (const path of [
      "/Hello Seahorse/.tutorial.json",
      "/Hello Seahorse/.workspace/tutorial-storage.json",
      "/Hello Seahorse/.workspace/program-info.json",
    ]) {
      PgCommon.createAndDispatchCustomEvent(
        PgFs.events.ON_DID_WRITE_FILE,
        path
      );
    }
    jest.advanceTimersByTime(3000);

    expect(push).toHaveBeenCalledTimes(1);
  });

  it("ignores a direct write of anything that is not synced", () => {
    // `saveMeta` rewrites the tab state constantly, and the snapshot filters
    // it out on purpose -- scheduling for it would be pure churn
    effect = projectSync();

    PgCommon.createAndDispatchCustomEvent(
      PgFs.events.ON_DID_WRITE_FILE,
      "/Hello Seahorse/.workspace/metadata.json"
    );
    jest.advanceTimersByTime(3000);

    expect(push).not.toHaveBeenCalled();
  });

  it("records an edit before attempting to upload it", () => {
    // Written first, so a tab closed or crashed between the keystroke and the
    // request still reads as having unsaved work on the next load
    effect = projectSync();

    dispatch(PgExplorer.events.ON_DID_SAVE_FILE);

    expect(PgSyncMark.markDirty).toHaveBeenCalledWith("p1");
    expect(push).not.toHaveBeenCalled();
  });
});

describe("a tab that is not in front", () => {
  let push: jest.SpyInstance;
  let effect: Disposable | null;

  beforeEach(() => {
    jest.useFakeTimers();
    effect = null;
    push = jest
      .spyOn(PgProjectSync, "pushCurrent")
      .mockResolvedValue("ok" as never);
    jest.spyOn(PgSyncMark, "markDirty").mockResolvedValue(undefined);
    jest.spyOn(PgSyncMark, "projectIds").mockResolvedValue([]);
    jest
      .spyOn(PgExplorer, "currentWorkspaceId", "get")
      .mockReturnValue("p1" as never);
    Object.defineProperty(document, "visibilityState", {
      value: "visible",
      configurable: true,
    });
  });

  afterEach(() => {
    effect?.dispose();
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  it("records the edit but does not upload it", () => {
    effect = projectSync();
    setVisibility("hidden");

    dispatch(PgExplorer.events.ON_DID_SAVE_FILE);
    jest.advanceTimersByTime(10000);

    expect(PgSyncMark.markDirty).toHaveBeenCalledWith("p1");
    expect(push).not.toHaveBeenCalled();
  });

  it("flushes what it had pending as it goes to the background", () => {
    // The document is still alive at this point, so an ordinary fetch
    // completes -- unlike the `beforeunload` flush this replaces, which
    // browsers cancel along with the page
    effect = projectSync();

    dispatch(PgExplorer.events.ON_DID_SAVE_FILE);
    setVisibility("hidden");

    expect(push).toHaveBeenCalledTimes(1);
  });

  it("reconciles before it is allowed to push again", async () => {
    const order: string[] = [];
    jest
      .spyOn(PgProjectSync, "holdPushes")
      .mockImplementation(() => order.push("hold"));
    jest
      .spyOn(PgProjectSync, "releasePushes")
      .mockImplementation(() => order.push("release"));
    jest.spyOn(restore, "reconcile").mockImplementation(async () => {
      order.push("reconcile");
      return {
        imported: [],
        replaced: [],
        removed: [],
        pushed: [],
        conflicts: [],
        latest: null,
      };
    });

    effect = projectSync();
    setVisibility("hidden");
    setVisibility("visible");
    await Promise.resolve();
    await Promise.resolve();

    expect(order).toEqual(["hold", "reconcile", "release"]);
  });
});

describe("opening a project", () => {
  let effect: Disposable | null;

  beforeEach(() => {
    effect = null;
    jest.spyOn(PgProjectSync, "pushCurrent").mockResolvedValue("ok" as never);
    jest.spyOn(PgSyncMark, "markDirty").mockResolvedValue(undefined);
    jest.spyOn(PgSyncMark, "projectIds").mockResolvedValue([]);
    Object.defineProperty(document, "visibilityState", {
      value: "visible",
      configurable: true,
    });
  });

  afterEach(() => {
    effect?.dispose();
    jest.restoreAllMocks();
  });

  it("reconciles it, so the project is pulled and not just its conversation", async () => {
    // Opening a project is the moment its files matter, and this effect was
    // subscribed to file changes alone -- so a project only ever reached the
    // server by being typed in, and one another device had moved on kept
    // showing its stale local copy until a reload or a tab refocus. The
    // conversation was the only half being pulled here.
    //
    // A reconcile rather than a push, because which direction the project
    // needs to move is exactly the question, and only the marks can answer it.
    const order: string[] = [];
    jest
      .spyOn(PgProjectSync, "holdPushes")
      .mockImplementation(() => order.push("hold"));
    jest
      .spyOn(PgProjectSync, "releasePushes")
      .mockImplementation(() => order.push("release"));
    jest.spyOn(restore, "reconcile").mockImplementation(async () => {
      order.push("reconcile");
      return {
        imported: [],
        replaced: [],
        removed: [],
        pushed: [],
        conflicts: [],
        latest: null,
      };
    });

    effect = projectSync();
    dispatch(PgExplorer.events.ON_DID_SWITCH_WORKSPACE);
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(order).toEqual(["hold", "reconcile", "release"]);
  });

  it("does not re-enter when the reconcile itself re-opens the workspace", async () => {
    // Taking another device's copy re-opens the workspace whose files it just
    // replaced, and re-opening dispatches a switch. Unguarded, that switch
    // starts another reconcile, which adopts, which re-opens -- the two bounce
    // off each other for as long as the tab is open, and the project is
    // uploaded dozens of times a second.
    let reconciles = 0;
    jest.spyOn(PgProjectSync, "holdPushes").mockImplementation(() => {});
    jest.spyOn(PgProjectSync, "releasePushes").mockImplementation(() => {});
    jest.spyOn(restore, "reconcile").mockImplementation(async () => {
      reconciles++;
      // What `adopt` does to the current workspace
      dispatch(PgExplorer.events.ON_DID_SWITCH_WORKSPACE);
      return {
        imported: [],
        replaced: ["alpha"],
        removed: [],
        pushed: [],
        conflicts: [],
        latest: "alpha",
      };
    });

    effect = projectSync();
    dispatch(PgExplorer.events.ON_DID_SWITCH_WORKSPACE);
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(reconciles).toBe(1);
  });
});

describe("deleting a workspace here", () => {
  let effect: Disposable | null;

  beforeEach(() => {
    effect = null;
    jest.spyOn(PgProjectSync, "pushCurrent").mockResolvedValue("ok" as never);
    Object.defineProperty(document, "visibilityState", {
      value: "visible",
      configurable: true,
    });
  });

  afterEach(() => {
    effect?.dispose();
    jest.restoreAllMocks();
  });

  it("tombstones it on the server and drops its conversation", async () => {
    // `onDidDeleteWorkspace` carries no id, so the deleted project is found by
    // elimination: a mark whose id no longer resolves to a workspace
    jest
      .spyOn(PgSyncMark, "projectIds")
      .mockResolvedValue(["tut:hello", "still-here"]);
    jest.spyOn(PgSyncMark, "remove").mockResolvedValue(undefined);
    jest
      .spyOn(PgExplorer, "workspaceNameOf")
      .mockImplementation((id: string) =>
        id === "still-here" ? "Still Here" : undefined
      );
    const remove = jest
      .spyOn(PgProjectSync, "remove")
      .mockResolvedValue(true as never);
    const forget = jest
      .spyOn(PgChatStorage, "remove")
      .mockResolvedValue(undefined);

    effect = projectSync();
    dispatch(PgExplorer.events.ON_DID_DELETE_WORKSPACE);
    // A macrotask, not a handful of microtasks: the subscriber awaits the
    // mark listing and then three calls per orphaned project
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(remove).toHaveBeenCalledWith("tut:hello");
    expect(remove).not.toHaveBeenCalledWith("still-here");
    // A tutorial's id is derived from its name, so restarting one reuses the
    // id -- and without this the previous run's conversation comes back with it
    expect(forget).toHaveBeenCalledWith("tut:hello");
  });
});
