import { tabSync } from "./tab-sync";
import { reloadCurrentFromDisk } from "../../features/persistence/model/tab-reload";
import { PgCommon } from "../../utils/common";
import { PgExplorer } from "../../utils/explorer/explorer";
import { PgFs } from "../../utils/explorer/fs";
import { PgWorkspace } from "../../utils/explorer/workspace";

jest.mock("../../features/persistence/model/tab-reload", () => ({
  reloadCurrentFromDisk: jest.fn(async () => "unchanged"),
}));

/** Every channel opened in this test, so one can talk to another */
const opened: FakeChannel[] = [];
class FakeChannel {
  posted: unknown[] = [];
  onmessage: ((ev: { data: unknown }) => void) | null = null;
  constructor(public name: string) {
    opened.push(this);
  }
  postMessage(data: unknown) {
    this.posted.push(data);
  }
  close() {}
}

/**
 * Advance fake time in steps, letting each reload's promise settle between
 * them -- the next one is armed only once the last has answered
 */
const elapse = async (ms: number, step = 100) => {
  for (let t = 0; t < ms; t += step) {
    jest.advanceTimersByTime(step);
    for (let i = 0; i < 10; i++) await Promise.resolve();
  }
};

const deliver = (data: unknown) =>
  opened.forEach((channel) => channel.onmessage?.({ data }));

beforeEach(() => {
  jest.useFakeTimers();
  opened.length = 0;
  Object.defineProperty(globalThis, "BroadcastChannel", {
    value: FakeChannel,
    configurable: true,
  });
  jest.spyOn(PgExplorer, "allWorkspaceNames", "get").mockReturnValue(["alpha"]);
  jest.spyOn(PgExplorer, "workspaceIdOf").mockReturnValue("p1");
  jest.spyOn(PgExplorer, "currentWorkspaceId", "get").mockReturnValue("p1");
  // `resetMocks` in the CRA jest preset wipes the factory implementation
  // above before every test, so without this the mock resolves `undefined`
  // and the effect's `.catch` on a non-promise would throw.
  (reloadCurrentFromDisk as jest.Mock).mockResolvedValue("unchanged");
});

afterEach(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
});

describe("tabSync", () => {
  it("announces a write once per burst, naming the project", async () => {
    const effect = tabSync();
    await PgFs.writeFile("/alpha/src/lib.rs", "a");
    await PgFs.writeFile("/alpha/src/lib.rs", "ab");
    jest.advanceTimersByTime(300);

    expect(opened[0].posted).toEqual([
      expect.objectContaining({ type: "files-written", projectId: "p1" }),
    ]);
    effect.dispose();
  });

  it("does not announce the tabs-and-cursors file", async () => {
    const effect = tabSync();
    await PgFs.writeFile("/alpha/.workspace/metadata.json", "[]");
    jest.advanceTimersByTime(300);

    expect(opened[0].posted).toEqual([]);
    effect.dispose();
  });

  it("announces a delete or rename under the project it happened in", () => {
    // Not the current one: by the time the event is heard, the user may be
    // looking at another project
    jest
      .spyOn(PgExplorer, "allWorkspaceNames", "get")
      .mockReturnValue(["alpha", "beta"]);
    jest
      .spyOn(PgExplorer, "workspaceIdOf")
      .mockImplementation((name: string) => (name === "beta" ? "p2" : "p1"));
    const effect = tabSync();
    PgCommon.createAndDispatchCustomEvent(
      PgExplorer.events.ON_DID_DELETE_ITEM,
      "/beta/src/old.rs"
    );
    PgCommon.createAndDispatchCustomEvent(
      PgExplorer.events.ON_DID_RENAME_ITEM,
      "/beta/src/other.rs"
    );
    jest.advanceTimersByTime(300);

    expect(opened[0].posted).toEqual([
      expect.objectContaining({ type: "files-written", projectId: "p2" }),
    ]);
    effect.dispose();
  });

  it("reloads when a neighbour wrote the open project", () => {
    const effect = tabSync();
    deliver({ type: "files-written", projectId: "p1", from: "other" });
    deliver({ type: "files-written", projectId: "p1", from: "other" });
    jest.advanceTimersByTime(400);

    expect(reloadCurrentFromDisk).toHaveBeenCalledTimes(1);
    effect.dispose();
  });

  it("ignores a neighbour's write to another project", () => {
    const effect = tabSync();
    deliver({ type: "files-written", projectId: "p2", from: "other" });
    jest.advanceTimersByTime(400);

    expect(reloadCurrentFromDisk).not.toHaveBeenCalled();
    effect.dispose();
  });

  it("ignores its own announcements", async () => {
    const effect = tabSync();
    await PgFs.writeFile("/alpha/src/lib.rs", "a");
    jest.advanceTimersByTime(300);
    deliver(opened[0].posted[0]);
    jest.advanceTimersByTime(400);

    expect(reloadCurrentFromDisk).not.toHaveBeenCalled();
    effect.dispose();
  });

  it("reloads with nobody signed in", () => {
    // Nothing here asks the session: the on-disk overwrite this prevents
    // needs no account at all
    const effect = tabSync();
    deliver({ type: "files-written", projectId: "p1", from: "other" });
    jest.advanceTimersByTime(400);

    expect(reloadCurrentFromDisk).toHaveBeenCalledTimes(1);
    effect.dispose();
  });

  it("announces a write of the list of workspaces", async () => {
    // Every create, delete, rename and switch saves it. A neighbour holding
    // the old list would save that back over the change on its next switch.
    const effect = tabSync();
    await PgFs.writeFile(PgWorkspace.WORKSPACES_CONFIG_PATH, "{}");
    jest.advanceTimersByTime(300);

    expect(opened[0].posted).toEqual([
      expect.objectContaining({ type: "workspaces-written" }),
    ]);
    effect.dispose();
  });

  it("reloads when a neighbour wrote the list", () => {
    // The reload re-reads the list itself, inside its own queue
    const effect = tabSync();
    deliver({ type: "workspaces-written", from: "other" });
    jest.advanceTimersByTime(400);

    expect(reloadCurrentFromDisk).toHaveBeenCalledTimes(1);
    effect.dispose();
  });

  it("makes one reload of a delete's files and list together", () => {
    const effect = tabSync();
    deliver({ type: "files-written", projectId: "p1", from: "other" });
    deliver({ type: "workspaces-written", from: "other" });
    jest.advanceTimersByTime(400);

    expect(reloadCurrentFromDisk).toHaveBeenCalledTimes(1);
    effect.dispose();
  });

  it("ignores its own write of the list", async () => {
    const effect = tabSync();
    await PgFs.writeFile(PgWorkspace.WORKSPACES_CONFIG_PATH, "{}");
    jest.advanceTimersByTime(300);
    deliver(opened[0].posted[0]);
    jest.advanceTimersByTime(400);

    expect(reloadCurrentFromDisk).not.toHaveBeenCalled();
    effect.dispose();
  });

  it("asks again when a reload is deferred", async () => {
    // Deferred is a reload still owed: the neighbour's write is on disk, and
    // nothing else would bring this tab level with it
    (reloadCurrentFromDisk as jest.Mock)
      .mockResolvedValueOnce("deferred")
      .mockResolvedValueOnce("reopened");
    const effect = tabSync();
    deliver({ type: "files-written", projectId: "p1", from: "other" });
    await elapse(400);
    expect(reloadCurrentFromDisk).toHaveBeenCalledTimes(1);

    await elapse(1000);
    expect(reloadCurrentFromDisk).toHaveBeenCalledTimes(2);

    // Done once it went through
    await elapse(5000);
    expect(reloadCurrentFromDisk).toHaveBeenCalledTimes(2);
    effect.dispose();
  });

  it("stops asking after a bounded number of deferrals", async () => {
    (reloadCurrentFromDisk as jest.Mock).mockResolvedValue("deferred");
    const effect = tabSync();
    deliver({ type: "files-written", projectId: "p1", from: "other" });
    await elapse(400 + 60_000);

    // The first reload, and thirty more
    expect(reloadCurrentFromDisk).toHaveBeenCalledTimes(31);
    effect.dispose();
  });

  it("stops asking once disposed", async () => {
    (reloadCurrentFromDisk as jest.Mock).mockResolvedValue("deferred");
    const effect = tabSync();
    deliver({ type: "files-written", projectId: "p1", from: "other" });
    await elapse(400);
    effect.dispose();
    await elapse(5000);

    expect(reloadCurrentFromDisk).toHaveBeenCalledTimes(1);
  });

  it("is inert where the browser has no BroadcastChannel", () => {
    Object.defineProperty(globalThis, "BroadcastChannel", {
      value: undefined,
      configurable: true,
    });
    expect(() => tabSync().dispose()).not.toThrow();
  });
});
