import { tabSync } from "./tab-sync";
import { reloadCurrentFromDisk } from "../../features/persistence/model/tab-reload";
import { PgExplorer } from "../../utils/explorer/explorer";
import { PgFs } from "../../utils/explorer/fs";

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

  it("is inert where the browser has no BroadcastChannel", () => {
    Object.defineProperty(globalThis, "BroadcastChannel", {
      value: undefined,
      configurable: true,
    });
    expect(() => tabSync().dispose()).not.toThrow();
  });
});
