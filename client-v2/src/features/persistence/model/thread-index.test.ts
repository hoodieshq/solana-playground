import { PgChatStorage } from "./chat-storage";
import { PgThreadIndex } from "./thread-index";
import { PgFs } from "../../../utils/explorer/fs";
import type { ChatItem } from "../../../views/sidebar/assistant/store";

/** The mock's own store, for asserting on what is on disk */
const mockFiles = (PgFs as unknown as { __files: Map<string, string> }).__files;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const item = (n: number): ChatItem => ({
  kind: "user",
  id: `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`,
  createdAt: new Date(n * 1000).toISOString(),
  text: `m${n}`,
});

const threadFiles = () =>
  [...mockFiles.keys()].filter(
    (path) => path.startsWith("/.config/chats/") && !path.endsWith("index.json")
  );

beforeEach(() => {
  mockFiles.clear();
  PgThreadIndex.reload();
});

describe("PgThreadIndex", () => {
  it("mints a thread for a workspace that has never had one", async () => {
    const id = await PgThreadIndex.ensure("w1");

    expect(id).toMatch(UUID);
  });

  it("returns the same thread on every later call", async () => {
    const first = await PgThreadIndex.ensure("w1");

    expect(await PgThreadIndex.ensure("w1")).toBe(first);
    expect(await PgThreadIndex.get("w1")).toBe(first);
  });

  it("keeps workspaces apart", async () => {
    const one = await PgThreadIndex.ensure("w1");
    const two = await PgThreadIndex.ensure("w2");

    expect(one).not.toBe(two);
  });

  it("has nothing for a workspace it has not been asked about", async () => {
    expect(await PgThreadIndex.get("w1")).toBeNull();
  });

  it("names the workspace a thread belongs to", async () => {
    const id = await PgThreadIndex.ensure("tut:hello-anchor");

    expect(await PgThreadIndex.workspaceOf(id)).toBe("tut:hello-anchor");
  });

  it("has no workspace for a thread it does not know", async () => {
    expect(await PgThreadIndex.workspaceOf("nope")).toBeNull();
  });

  describe("migrating a thread file named after its workspace", () => {
    /** What storage looked like before threads had ids of their own */
    const legacy = async (workspaceId: string, items: ChatItem[]) => {
      await PgChatStorage.write(workspaceId, items);
      // Written straight to storage, so the index has never heard of it
      PgThreadIndex.reload();
    };

    it("gives it an id and keeps the conversation", async () => {
      await legacy("tut:hello-anchor", [item(1), item(2)]);

      const id = await PgThreadIndex.ensure("tut:hello-anchor");

      expect(id).toMatch(UUID);
      expect(await PgChatStorage.read(id)).toEqual([item(1), item(2)]);
    });

    it("leaves nothing behind under the old name", async () => {
      await legacy("w1", [item(1)]);

      await PgThreadIndex.ensure("w1");

      expect(threadFiles()).toHaveLength(1);
    });

    it("adopts nothing on the next load", async () => {
      await legacy("w1", [item(1)]);
      const id = await PgThreadIndex.ensure("w1");

      // A fresh load runs the pass again against the index it wrote; the file
      // it renamed must not be adopted a second time, under its own id
      PgThreadIndex.reload();

      expect(await PgThreadIndex.get("w1")).toBe(id);
      expect(Object.keys(await PgThreadIndex.all())).toEqual(["w1"]);
      expect(threadFiles()).toHaveLength(1);
    });

    it("migrates every workspace, not just the one being asked for", async () => {
      await PgChatStorage.write("w1", [item(1)]);
      await PgChatStorage.write("w2", [item(2)]);
      PgThreadIndex.reload();

      await PgThreadIndex.ensure("w1");

      expect(Object.keys(await PgThreadIndex.all()).sort()).toEqual([
        "w1",
        "w2",
      ]);
    });
  });

  it("survives an index a user has corrupted", async () => {
    mockFiles.set("/.config/chats/index.json", "{ not json");
    PgThreadIndex.reload();

    const id = await PgThreadIndex.ensure("w1");

    expect(id).toMatch(UUID);
  });

  it("drops an index entry that is not a thread id", async () => {
    mockFiles.set(
      "/.config/chats/index.json",
      JSON.stringify({ w1: "not-a-uuid", w2: 7 })
    );
    PgThreadIndex.reload();

    expect(await PgThreadIndex.get("w1")).toBeNull();
    expect(await PgThreadIndex.get("w2")).toBeNull();
  });

  it("is not listed as a thread of its own", async () => {
    await PgThreadIndex.ensure("w1");
    await PgChatStorage.write(await PgThreadIndex.ensure("w1"), [item(1)]);

    expect(await PgChatStorage.threadIds()).not.toContain("index");
  });
});
