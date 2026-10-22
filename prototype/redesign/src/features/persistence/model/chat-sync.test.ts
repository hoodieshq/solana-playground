import { PgChatStorage } from "./chat-storage";
import { PgChatSync } from "./chat-sync";
import { PgSyncClient } from "./sync-client";
import { PgSession } from "../../auth";
import { PgFs } from "../../../utils/explorer/fs";
import type { ChatItem } from "../../../views/sidebar/assistant/store";

const item = (n: number): ChatItem => ({
  kind: "user",
  id: `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`,
  createdAt: new Date(n * 1000).toISOString(),
  text: `m${n}`,
});

/** Only `id` matters to sync; the rest of the session user is display */
const signedIn = () =>
  PgSession.refreshWith({ id: "u1", name: null, image: null, login: null });

/** `/api/sync` says yes; everything else is the caller's to describe */
const respondingWith = (rest: (url: string) => unknown) =>
  jest.fn().mockImplementation((url: string) =>
    url === "/api/sync"
      ? Promise.resolve({
          ok: true,
          json: async () => ({ enabled: true, db: "ok" }),
        })
      : rest(url)
  ) as unknown as typeof fetch;

describe("PgChatSync", () => {
  beforeEach(async () => {
    await PgChatStorage.clear();
    PgSession.reset();
    PgSyncClient.reset();
  });

  it("does nothing when signed out", async () => {
    global.fetch = jest.fn() as unknown as typeof fetch;
    await PgChatStorage.write("t1", [item(1)]);

    await PgChatSync.push("t1");

    expect(global.fetch).not.toHaveBeenCalled();
  });

  it("posts the local thread when signed in", async () => {
    global.fetch = respondingWith(() =>
      Promise.resolve({ ok: true, json: async () => ({ written: 1 }) })
    );
    await signedIn();
    await PgChatStorage.write("t1", [item(1)]);

    await PgChatSync.push("t1");

    expect(global.fetch).toHaveBeenCalledWith(
      "/api/conversations",
      expect.objectContaining({ method: "POST" })
    );
  });

  it("keeps the local thread when the push fails, so nothing is lost", async () => {
    global.fetch = respondingWith(() => Promise.reject(new Error("offline")));
    await signedIn();
    await PgChatStorage.write("t1", [item(1)]);

    const handed = await PgChatSync.pushAll();

    expect(handed).toEqual({ pushed: [], complete: false });
    expect(await PgChatStorage.read("t1")).toHaveLength(1);
  });

  it("merges the server thread with local items on pull, without duplicates", async () => {
    global.fetch = respondingWith(() =>
      Promise.resolve({
        ok: true,
        json: async () => ({ items: [item(1), item(2)] }),
      })
    );
    await signedIn();
    await PgChatStorage.write("t1", [item(2), item(3)]);

    const merged = await PgChatSync.pull("t1");

    expect(merged!.map((i) => (i as { text: string }).text)).toEqual([
      "m1",
      "m2",
      "m3",
    ]);
  });

  it("leaves the local thread alone when the server cannot be reached", async () => {
    global.fetch = respondingWith(() => Promise.reject(new Error("offline")));
    await signedIn();
    await PgChatStorage.write("t1", [item(1)]);

    expect(await PgChatSync.pull("t1")).toBeNull();
    expect(await PgChatStorage.read("t1")).toHaveLength(1);
  });

  it("stays local when the deployment has no database", async () => {
    global.fetch = jest.fn().mockImplementation((url: string) =>
      url === "/api/sync"
        ? Promise.resolve({
            ok: true,
            json: async () => ({ enabled: false, db: "unconfigured" }),
          })
        : Promise.reject(new Error("should not be called"))
    ) as unknown as typeof fetch;
    await signedIn();
    await PgChatStorage.write("t1", [item(1)]);

    expect(await PgChatSync.push("t1")).toBe(false);
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });
});

describe("handing conversations over at sign-out", () => {
  const mockFiles = (PgFs as unknown as { __files: Map<string, string> })
    .__files;

  const accepted = () =>
    respondingWith(() =>
      Promise.resolve({ ok: true, json: async () => ({ written: 1 }) })
    );

  beforeEach(async () => {
    await PgChatStorage.clear();
    PgSession.reset();
    PgSyncClient.reset();
  });

  afterEach(() => jest.restoreAllMocks());

  it("clears local threads once the server has them", async () => {
    global.fetch = accepted();
    await signedIn();
    await PgChatStorage.write("t1", [item(1)]);

    await PgChatSync.handOver();

    expect(await PgChatStorage.threadIds()).toEqual([]);
  });

  it("keeps them when a push failed", async () => {
    global.fetch = respondingWith(() =>
      Promise.resolve({ ok: false, status: 500, json: async () => ({}) })
    );
    await signedIn();
    await PgChatStorage.write("t1", [item(1)]);

    await PgChatSync.handOver();

    expect(await PgChatStorage.read("t1")).toHaveLength(1);
  });

  it("drops the threads the server took and keeps only the one that failed", async () => {
    // This used to be all-or-nothing. One thread failing to upload kept every
    // other thread on the device as well -- including ones the account
    // demonstrably already held -- so a single flaky request handed the next
    // user of this browser the whole transcript, and nothing was gained for
    // it: the failed thread is kept either way.
    global.fetch = jest.fn().mockImplementation((url: string, init?: any) => {
      if (url === "/api/sync") {
        return Promise.resolve({
          ok: true,
          json: async () => ({ enabled: true, db: "ok" }),
        });
      }
      const { projectId } = JSON.parse(init.body);
      return Promise.resolve(
        projectId === "t2"
          ? { ok: false, status: 500, json: async () => ({}) }
          : { ok: true, json: async () => ({ written: 1 }) }
      );
    }) as unknown as typeof fetch;
    await signedIn();
    await PgChatStorage.write("t1", [item(1)]);
    await PgChatStorage.write("t2", [item(2)]);
    await PgChatStorage.write("t3", [item(3)]);

    await PgChatSync.handOver();

    expect((await PgChatStorage.threadIds())?.sort()).toEqual(["t2"]);
    expect(await PgChatStorage.read("t2")).toHaveLength(1);
  });

  it("keeps them when the threads could not even be listed", async () => {
    // `[].every(Boolean)` is `true`. An enumeration that failed used to answer
    // the same as an account with no conversations, and sign-out deleted every
    // thread on the device having uploaded none of them.
    global.fetch = accepted();
    await signedIn();
    await PgChatStorage.write("t1", [item(1)]);
    jest.spyOn(PgFs, "readDir").mockRejectedValue(new Error("quota"));

    expect(await PgChatSync.pushAll()).toBeNull();

    jest.restoreAllMocks();
    expect(await PgChatStorage.read("t1")).toHaveLength(1);
  });

  it("does not report a thread it could not read as uploaded", async () => {
    // Same shape one level down: an unreadable thread read as an empty one,
    // and `push` reported success for a thread the server never saw -- which
    // is what then let `handOver` delete the one file worth recovering
    global.fetch = accepted();
    await signedIn();
    await PgChatStorage.write("t1", [item(1)]);
    mockFiles.set("/.config/chats/t1.json", "{ not json");

    expect(await PgChatSync.push("t1")).toBe(false);
    expect(global.fetch).not.toHaveBeenCalledWith(
      "/api/conversations",
      expect.anything()
    );
  });

  it("still reports an genuinely empty thread as handed over", async () => {
    global.fetch = accepted();
    await signedIn();

    expect(await PgChatSync.push("never-written")).toBe(true);
  });
});

describe("pulling a thread that cannot be read locally", () => {
  const mockFiles = (PgFs as unknown as { __files: Map<string, string> })
    .__files;

  beforeEach(async () => {
    await PgChatStorage.clear();
    PgSession.reset();
    PgSyncClient.reset();
  });

  it("does not overwrite the local file with the server's half", async () => {
    // `pull` merges local into server and writes the result back. With the
    // local read answering `[]` for a file it could not parse, that write
    // replaces a recoverable file with the server's copy alone -- destroying
    // exactly the messages that had not been uploaded.
    global.fetch = respondingWith(() =>
      Promise.resolve({
        ok: true,
        json: async () => ({ items: [] }),
      })
    );
    await signedIn();
    await PgChatStorage.write("t1", [item(1)]);
    const corrupt = "{ not json";
    mockFiles.set("/.config/chats/t1.json", corrupt);

    await PgChatSync.pull("t1");

    expect(mockFiles.get("/.config/chats/t1.json")).toBe(corrupt);
  });
});
