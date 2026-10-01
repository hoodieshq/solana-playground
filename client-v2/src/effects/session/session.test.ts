import { session } from "./session";
import { PgSession } from "../../features/auth";
import { PgChatStorage } from "../../features/persistence/model/chat-storage";
import { PgChatSync } from "../../features/persistence/model/chat-sync";
import { PgProjectSync } from "../../features/persistence/model/project-sync";
import * as restore from "../../features/persistence/model/project-restore";
import { PgSyncClient } from "../../features/persistence/model/sync-client";
import { PgThreadIndex } from "../../features/persistence/model/thread-index";
import { PgAssistant } from "../../views/sidebar/assistant/store";
import { PgExplorer } from "../../utils/explorer/explorer";
import { PgFs } from "../../utils/explorer/fs";
import type { SyncResult } from "../../features/persistence/model/project-restore";
import type { ChatItem } from "../../views/sidebar/assistant/store";

/**
 * The order these run in is the whole of the behaviour.
 *
 * Reconciling before pushing is what stops a device that has not caught up
 * announcing itself with a write the server refuses; waiting for the explorer
 * is what stops the whole pass failing into a diagnostics line; and closing the
 * thread after the hand-over is what stops the previous user's transcript being
 * uploaded into the next account.
 */

const user = { id: "u1", name: null, image: null, login: null };

const settle = () => new Promise((r) => setTimeout(r, 0));

const result = (over: Partial<SyncResult> = {}): SyncResult => ({
  imported: [],
  replaced: [],
  removed: [],
  pushed: [],
  conflicts: [],
  latest: null,
  ...over,
});

describe("the session effect", () => {
  let calls: string[];
  let sync: jest.SpyInstance;
  let switchWorkspace: jest.SpyInstance;

  beforeEach(() => {
    calls = [];
    PgSession.reset();

    jest
      .spyOn(PgChatSync, "adoptAccountThreads")
      .mockImplementation(async () => {
        calls.push("adoptChats");
      });
    jest.spyOn(PgChatSync, "pushAll").mockImplementation(async () => {
      calls.push("pushChats");
      return { pushed: [], complete: true };
    });
    sync = jest.spyOn(restore, "reconcile").mockImplementation(async () => {
      calls.push("reconcile");
      return result();
    });
    jest
      .spyOn(PgProjectSync, "holdPushes")
      .mockImplementation(() => calls.push("hold"));
    jest
      .spyOn(PgProjectSync, "releasePushes")
      .mockImplementation(() => calls.push("release"));
    switchWorkspace = jest
      .spyOn(PgExplorer, "switchWorkspace")
      .mockResolvedValue(undefined as never);
    jest
      .spyOn(PgExplorer, "allWorkspaceNames", "get")
      .mockReturnValue(["Hello Anchor", "Newest"]);
    jest
      .spyOn(PgExplorer, "currentWorkspaceName", "get")
      .mockReturnValue("Hello Anchor");
    jest.spyOn(PgExplorer, "isInitialized", "get").mockReturnValue(true);
    jest.spyOn(PgSession, "refresh").mockImplementation(async () => {
      await PgSession.refreshWith(user);
    });
  });

  afterEach(() => jest.restoreAllMocks());

  it("reconciles the account before anything else touches it", async () => {
    const effect = session();
    await settle();

    expect(calls.filter((c) => c !== "hold" && c !== "release")).toEqual([
      // Adopt first: the dump would otherwise upload a thread minted while
      // signed out as a second conversation, and the account's would be lost
      "adoptChats",
      "pushChats",
      "reconcile",
    ]);
    effect.dispose();
  });

  it("waits for the explorer before reconciling against it", async () => {
    // Effects mount concurrently with the async `PgExplorer.init()`. Running
    // first meant `workspaceNameOf` answered `undefined` for everything and
    // `importWorkspace` threw `NOT_FOUND`, which the per-project catch turned
    // into a diagnostics line -- the whole account sync failing invisibly.
    jest.spyOn(PgExplorer, "isInitialized", "get").mockReturnValue(false);
    let fireInit: () => void = () => {};
    jest.spyOn(PgExplorer, "onDidInit").mockImplementation((cb: any) => {
      fireInit = cb;
      return { dispose: () => {} };
    });

    const effect = session();
    await settle();
    expect(calls).not.toContain("reconcile");

    fireInit();
    await settle();
    expect(calls).toContain("reconcile");
    effect.dispose();
  });

  it("does not move the user off the page they loaded", async () => {
    sync.mockResolvedValue(result({ latest: "Newest" }));

    const effect = session();
    await settle();

    expect(switchWorkspace).not.toHaveBeenCalled();
    effect.dispose();
  });

  it("pulls the open thread once the session is back, even when it is unchanged", async () => {
    // On load the chat effect opens the thread before the cookie is restored,
    // so its pull stands down with no request at all. The thread id does not
    // change at sign-in -- the account already has it -- so nothing else
    // pulls, and the panel shows only what this browser had stored.
    jest.spyOn(PgExplorer, "currentWorkspaceId", "get").mockReturnValue("w1");
    jest.spyOn(PgAssistant, "threadId", "get").mockReturnValue("t1");
    jest.spyOn(PgThreadIndex, "get").mockResolvedValue("t1");
    jest.spyOn(PgAssistant, "loadThread").mockResolvedValue(undefined);
    jest.spyOn(PgAssistant, "foldIn").mockImplementation(() => {});
    const pull = jest.spyOn(PgChatSync, "fetchThread").mockResolvedValue([]);

    const effect = session();
    await settle();

    expect(pull).toHaveBeenCalledWith("t1");
    effect.dispose();
  });

  it("does not repaint a thread for a workspace the user has left", async () => {
    // The index read is a storage round trip; a switch landing inside it
    // must not have the old workspace's thread opened over the new one
    const current = jest
      .spyOn(PgExplorer, "currentWorkspaceId", "get")
      .mockReturnValue("w1");
    jest.spyOn(PgAssistant, "threadId", "get").mockReturnValue("t1");
    jest.spyOn(PgThreadIndex, "get").mockImplementation(async () => {
      current.mockReturnValue("w2");
      return "t1";
    });
    const load = jest
      .spyOn(PgAssistant, "loadThread")
      .mockResolvedValue(undefined);
    jest.spyOn(PgChatSync, "fetchThread").mockResolvedValue([]);

    const effect = session();
    await settle();

    expect(load).not.toHaveBeenCalled();
    effect.dispose();
  });

  /**
   * The restore lands several round trips after load -- the explorer, the
   * chat dump, the reconcile, which can stop for a conflict prompt -- so a
   * turn being under way by then is ordinary. Re-opening the thread used to
   * force-reload it from storage, which denied the card the user had not
   * answered yet, dropped the status to idle mid-turn, and replaced memory
   * with a copy on disk that can lag it.
   */
  describe("landing while a turn is running", () => {
    const fromServer: ChatItem = {
      kind: "assistant",
      id: "55555555-5555-4555-8555-555555555555",
      createdAt: "2026-01-01T00:00:00.000Z",
      text: "from the other device",
    };

    /** Settles the server's answer to the thread read */
    let answer: (items: ChatItem[]) => void;
    let fetchMock: jest.SpyInstance;

    const texts = () =>
      PgAssistant.items.map((i) => ("text" in i ? i.text : i.kind));

    /** Ticks until `ready` holds, or gives up and lets the asserts say why */
    const until = async (ready: () => boolean) => {
      for (let i = 0; i < 100 && !ready(); i++) await settle();
    };

    const threadRequested = () =>
      fetchMock.mock.calls.some(([url]) => String(url).includes("threadId="));

    beforeEach(async () => {
      (PgFs as unknown as { __files: Map<string, string> }).__files.clear();
      PgAssistant.closeThread();
      PgAssistant.clear();
      PgSyncClient.reset();
      await PgAssistant.loadThread("t1");

      jest.spyOn(PgExplorer, "currentWorkspaceId", "get").mockReturnValue("w1");
      jest.spyOn(PgThreadIndex, "get").mockResolvedValue("t1");
      const served = new Promise<ChatItem[]>((resolve) => (answer = resolve));
      const respond = async (url: string) => {
        if (url === "/api/sync") {
          return { ok: true, json: async () => ({ enabled: true, db: "ok" }) };
        }
        const items = await served;
        return { ok: true, json: async () => ({ items }) };
      };
      fetchMock = jest
        .spyOn(globalThis, "fetch")
        .mockImplementation(respond as never);
    });

    afterEach(() => PgAssistant.closeThread());

    it("leaves an unanswered approval waiting on the user", async () => {
      PgAssistant.addUserMessage("build it");
      const approval = PgAssistant.requestApproval({
        type: "command",
        name: "build",
        effect: "builds",
      });

      const effect = session();
      await until(threadRequested);
      answer([fromServer]);
      await until(() => texts().includes("from the other device"));

      expect(texts()).toContain("from the other device");
      expect(PgAssistant.status).toBe("awaiting");
      const card = PgAssistant.items.find((i) => i.kind === "approval");
      expect(card).toMatchObject({ status: "pending" });

      // And it still answers: the promise holding the turn open is intact
      PgAssistant.resolveApproval(card!.id, true);
      await expect(approval).resolves.toMatchObject({ allowed: true });
      effect.dispose();
    });

    it("keeps the status and what streamed in while the pull was out", async () => {
      PgAssistant.addUserMessage("explain it");
      PgAssistant.setStatus("running");
      const reply = PgAssistant.startAssistantMessage();

      const effect = session();
      await until(threadRequested);
      PgAssistant.appendToAssistantMessage(reply, "It logs");
      PgAssistant.addNotice("added during the pull");
      answer([fromServer]);
      await until(() => texts().includes("from the other device"));

      expect(PgAssistant.status).toBe("running");
      expect(texts()).toEqual(
        expect.arrayContaining([
          "explain it",
          "It logs",
          "added during the pull",
          "from the other device",
        ])
      );

      // Streaming carries on into the same item
      PgAssistant.appendToAssistantMessage(reply, " a message");
      expect(texts()).toContain("It logs a message");

      // And storage ends up holding all of it, not a copy from mid-pull
      await PgAssistant.whenPersisted();
      const stored = (await PgChatStorage.read("t1"))!.map((i) =>
        "text" in i ? i.text : i.kind
      );
      expect(stored).toEqual(
        expect.arrayContaining([
          "It logs a message",
          "added during the pull",
          "from the other device",
        ])
      );
      effect.dispose();
    });
  });

  it("opens the newest project when the user actually signs in", async () => {
    sync.mockResolvedValue(result({ latest: "Newest" }));

    const effect = session();
    await settle();
    // A second transition: the cookie has already been restored, so this is
    // the user coming back through the sign-in flow
    await PgSession.refreshWith(null);
    await PgSession.refreshWith(user);
    await settle();

    expect(switchWorkspace).toHaveBeenCalledWith("Newest");
    effect.dispose();
  });

  it("reopens the current project when the server replaced its files", async () => {
    sync.mockResolvedValue(
      result({ replaced: ["Hello Anchor"], latest: "Hello Anchor" })
    );

    const effect = session();
    await settle();

    // Not a navigation -- the editor is showing files that are no longer what
    // is on disk, and this is what makes it re-read them
    expect(switchWorkspace).toHaveBeenCalledWith("Hello Anchor");
    effect.dispose();
  });

  it("moves the user off a project that was deleted on another device", async () => {
    sync.mockResolvedValue(
      result({ removed: ["Hello Anchor"], latest: "Newest" })
    );

    const effect = session();
    await settle();

    expect(switchWorkspace).toHaveBeenCalledWith("Newest");
    effect.dispose();
  });

  it("holds pushes from load until the account has been read", async () => {
    const effect = session();
    await settle();

    // Held before anything can fire, released the moment the reconcile is
    // done -- a push that gets out first carries no token and comes back
    // refused, which the user was shown as a conflict
    expect(calls.indexOf("hold")).toBe(0);
    expect(calls.indexOf("release")).toBeGreaterThan(
      calls.indexOf("reconcile")
    );
    effect.dispose();
  });

  it("releases them when the chat hand-over fails, not just the reconcile", async () => {
    // Everything on the way to the reconcile is inside the same `try`. This
    // one sat outside it, so a thrown `pushAll` left every project on the
    // device unable to save for the rest of the session -- silently, because
    // the rejection is reported and swallowed.
    jest
      .spyOn(PgChatSync, "pushAll")
      .mockRejectedValue(new Error("indexeddb is having a day"));

    const effect = session();
    await settle();

    expect(calls).toContain("release");
    effect.dispose();
  });

  it("releases them even when the reconcile fails", async () => {
    sync.mockRejectedValue(new Error("offline"));

    const effect = session();
    await settle();

    // A reconcile that failed is a reason to let this device save its work,
    // not to hold it forever
    expect(calls).toContain("release");
    effect.dispose();
  });

  it("gives up its hold once, however many ways it gets there", async () => {
    // The gate is counted, so a second release would give up somebody else's
    // hold -- a merge's -- and let the editor upload mid-rewrite. The reconcile
    // finishing, a later sign-in and the effect going away all release.
    const effect = session();
    await settle();
    await PgSession.refreshWith(null);
    await PgSession.refreshWith(user);
    await settle();
    effect.dispose();

    expect(calls.filter((c) => c === "hold")).toHaveLength(1);
    expect(calls.filter((c) => c === "release")).toHaveLength(1);
  });

  it("releases them when nobody is signed in", async () => {
    jest.spyOn(PgSession, "refresh").mockImplementation(async () => {
      await PgSession.refreshWith(null);
    });

    const effect = session();
    await settle();

    expect(calls).toContain("release");
    expect(calls).not.toContain("reconcile");
    effect.dispose();
  });
});

describe("signing out", () => {
  beforeEach(() => {
    PgSession.reset();
    jest.spyOn(PgExplorer, "isInitialized", "get").mockReturnValue(true);
    jest.spyOn(PgSession, "refresh").mockResolvedValue(undefined);
  });

  afterEach(() => jest.restoreAllMocks());

  it("closes the thread after handing it over, not before", async () => {
    // Closing first would discard messages that had not been uploaded;
    // leaving it open means the panel keeps rendering the previous user's
    // transcript and writes it straight back into storage, from where the next
    // account's sign-in dump uploads it.
    const order: string[] = [];
    jest.spyOn(PgChatSync, "handOver").mockImplementation(async () => {
      order.push("handOver");
    });
    jest
      .spyOn(PgAssistant, "closeThread")
      .mockImplementation(() => order.push("closeThread") as unknown as void);

    const effect = session();
    await PgSession.signOut();

    expect(order).toEqual(["handOver", "closeThread"]);
    effect.dispose();
  });

  it("closes the thread even when the hand-over fails", async () => {
    jest.spyOn(PgChatSync, "handOver").mockRejectedValue(new Error("offline"));
    const close = jest
      .spyOn(PgAssistant, "closeThread")
      .mockImplementation(() => undefined);

    const effect = session();
    await PgSession.signOut();

    // The storage clear inside `handOver` is what did not happen, so the
    // messages are still there for the next sign-in. What must not survive is
    // the *rendered* thread, which would be re-persisted on the next change.
    expect(close).toHaveBeenCalled();
    effect.dispose();
  });

  it("drops the previous account's conflicts", async () => {
    jest.spyOn(PgChatSync, "handOver").mockResolvedValue(undefined);
    jest.spyOn(PgAssistant, "closeThread").mockImplementation(() => undefined);
    PgProjectSync.raise({ projectId: "tut:hello", kind: "divergent" });

    const effect = session();
    await PgSession.signOut();

    // A tutorial's id is identical across accounts, so a banner left over from
    // the last user is a question the next one cannot answer
    expect(PgProjectSync.conflictFor("tut:hello")).toBeNull();
    effect.dispose();
  });
});
