import { projectSync } from "./project-sync";
import { PgChatStorage } from "../../features/persistence/model/chat-storage";
import { PgProjectSync } from "../../features/persistence/model/project-sync";
import * as restore from "../../features/persistence/model/project-restore";
import { PgSyncMark } from "../../features/persistence/model/sync-mark";
import { PgCommon } from "../../utils/common";
import { PgExplorer } from "../../utils/explorer/explorer";
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

  it("uploads when the user opens a project, not only when they type in one", () => {
    effect = projectSync();

    dispatch(PgExplorer.events.ON_DID_SWITCH_WORKSPACE);
    jest.advanceTimersByTime(3000);

    expect(push).toHaveBeenCalled();
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

  it("flushes the project being left before following the user to the next one", () => {
    // `pushCurrent` reads whichever workspace is current when it runs, so a
    // switch mid-debounce used to upload the *incoming* project under the
    // outgoing one's pending timer -- and the outgoing one's edits were lost
    effect = projectSync();

    dispatch(PgExplorer.events.ON_DID_SAVE_FILE);
    dispatch(PgExplorer.events.ON_DID_SWITCH_WORKSPACE);

    expect(push).toHaveBeenCalledTimes(1);

    jest.advanceTimersByTime(3000);
    expect(push).toHaveBeenCalledTimes(2);
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
