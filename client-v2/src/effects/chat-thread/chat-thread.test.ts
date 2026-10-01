import { chatThread } from "./chat-thread";
import { openThread } from "./open-thread";
import { PgChatSync } from "../../features/persistence/model/chat-sync";
import { PgAssistant } from "../../views/sidebar/assistant/store";
import { PgExplorer } from "../../utils/explorer/explorer";
import type { Disposable } from "../../utils/types";

/**
 * Conversations have none of the machinery that keeps project code safe.
 *
 * There is no dirty flag, no debounce and no reconcile: the only push outside
 * the sign-in and sign-out dumps is at the end of a turn, fire-and-forget,
 * with the result discarded. So the tab going away is the last chance to get
 * a turn to the account, and nothing was taking it.
 */

const setVisibility = (state: "visible" | "hidden") => {
  Object.defineProperty(document, "visibilityState", {
    value: state,
    configurable: true,
  });
  document.dispatchEvent(new Event("visibilitychange"));
};

/** Let the effect's own `open()` settle before asserting on anything else */
const settle = () => new Promise((resolve) => setTimeout(resolve, 0));

describe("the chat-thread effect", () => {
  let push: jest.SpyInstance;
  let effect: Disposable | null;

  beforeEach(() => {
    effect = null;
    push = jest.spyOn(PgChatSync, "push").mockResolvedValue(true);
    jest.spyOn(PgChatSync, "fetchThread").mockResolvedValue(null);
    jest.spyOn(PgChatSync, "adoptAccountThread").mockResolvedValue(null);
    jest.spyOn(PgAssistant, "loadThread").mockResolvedValue(undefined);
    jest.spyOn(PgAssistant, "threadId", "get").mockReturnValue("p1");
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
    jest.restoreAllMocks();
  });

  it("hands the open thread over as the tab goes to the background", async () => {
    effect = chatThread();
    await settle();
    push.mockClear();

    // Any change to the thread; `clear` emits without writing back
    PgAssistant.clear();
    setVisibility("hidden");
    await settle();

    expect(push).toHaveBeenCalledWith("p1");
  });

  it("waits for the last write to land before pushing", async () => {
    // `push` reads the thread from storage, and the store's writes are fired
    // and forgotten: pushing straight away could upload the copy from one
    // write earlier, missing the last thing that happened
    let landed: () => void = () => {};
    jest
      .spyOn(PgAssistant, "whenPersisted")
      .mockReturnValue(new Promise<void>((resolve) => (landed = resolve)));
    effect = chatThread();
    await settle();
    push.mockClear();

    PgAssistant.clear();
    setVisibility("hidden");
    await settle();
    expect(push).not.toHaveBeenCalled();

    landed();
    await settle();
    expect(push).toHaveBeenCalledWith("p1");
  });

  it("does not push when nothing has happened since the last one", async () => {
    // The whole thread goes up each time and the server writes nothing for
    // a copy it already has, so this is about not making a request per
    // tab-switch for every user rather than about correctness
    effect = chatThread();
    await settle();
    push.mockClear();

    setVisibility("hidden");
    await settle();

    expect(push).not.toHaveBeenCalled();
  });

  it("tries again on the next hide when the push failed", async () => {
    // The only retry conversations have
    push.mockResolvedValue(false);
    effect = chatThread();
    await settle();

    // Any change to the thread; `clear` emits without writing back
    PgAssistant.clear();
    setVisibility("hidden");
    await settle();
    push.mockClear();

    setVisibility("visible");
    setVisibility("hidden");
    await settle();

    expect(push).toHaveBeenCalledWith("p1");
  });

  describe("while a turn is running", () => {
    // The reply is still streaming into its item, so the thread on disk holds
    // a half-written answer. Pushing it put that fragment on the server, and
    // the other device pulled it.
    let status: jest.SpyInstance;

    beforeEach(() => {
      status = jest.spyOn(PgAssistant, "status", "get");
    });

    it("does not push as the tab goes to the background", async () => {
      effect = chatThread();
      await settle();
      push.mockClear();

      status.mockReturnValue("running");
      PgAssistant.clear();
      setVisibility("hidden");
      await settle();

      expect(push).not.toHaveBeenCalled();
    });

    it("does not push as the page goes away", async () => {
      effect = chatThread();
      await settle();
      push.mockClear();

      status.mockReturnValue("running");
      PgAssistant.clear();
      window.dispatchEvent(new Event("pagehide"));
      await settle();

      expect(push).not.toHaveBeenCalled();
    });

    it("does not push while the turn waits on an approval either", async () => {
      // Still the same turn: the reply resumes once the user answers
      effect = chatThread();
      await settle();
      push.mockClear();

      status.mockReturnValue("awaiting");
      PgAssistant.clear();
      setVisibility("hidden");
      await settle();

      expect(push).not.toHaveBeenCalled();
    });

    it("pushes on the next hide once the turn has finished", async () => {
      // The skipped flush must leave the thread owed, or the finished reply
      // would only reach the account through the end-of-turn push
      effect = chatThread();
      await settle();
      push.mockClear();

      status.mockReturnValue("running");
      PgAssistant.clear();
      setVisibility("hidden");
      setVisibility("visible");
      await settle();
      push.mockClear();

      status.mockReturnValue("idle");
      setVisibility("hidden");
      await settle();

      expect(push).toHaveBeenCalledWith("p1");
    });
  });

  it("stops listening once disposed", async () => {
    const disposable = chatThread();
    await settle();
    // Any change to the thread; `clear` emits without writing back
    PgAssistant.clear();
    disposable.dispose();
    push.mockClear();

    setVisibility("hidden");
    await settle();

    expect(push).not.toHaveBeenCalled();
  });

  it("moves to the account's thread when the server has never seen this one", async () => {
    // Sign-out clears the thread index, so the next open mints a fresh id and
    // its pull 404s -- while the account holds the conversation under another
    jest
      .spyOn(PgChatSync, "adoptAccountThread")
      .mockResolvedValue("account-thread");
    const load = PgAssistant.loadThread as unknown as jest.SpyInstance;

    await openThread("p1", "p1");

    expect(PgChatSync.adoptAccountThread).toHaveBeenCalledWith("p1");
    expect(load).toHaveBeenLastCalledWith("account-thread");
    expect(PgChatSync.fetchThread).toHaveBeenLastCalledWith("account-thread");
  });

  it("does not look elsewhere when the pull found the thread", async () => {
    jest.spyOn(PgChatSync, "fetchThread").mockResolvedValue([]);
    jest.spyOn(PgAssistant, "foldIn").mockImplementation(() => {});

    await openThread("p1", "p1");

    expect(PgChatSync.adoptAccountThread).not.toHaveBeenCalled();
  });

  it("folds the server's copy into the open thread instead of reloading it", async () => {
    // A forced reload denied a pending approval, reset the status mid-turn
    // and replaced memory with a stored copy that can lag it
    const served = [
      {
        kind: "user" as const,
        id: "77777777-7777-4777-8777-777777777777",
        createdAt: "2026-01-01T00:00:00.000Z",
        text: "from the server",
      },
    ];
    jest.spyOn(PgChatSync, "fetchThread").mockResolvedValue(served);
    const fold = jest.spyOn(PgAssistant, "foldIn").mockImplementation(() => {});
    const stored = jest.spyOn(PgChatSync, "storeMerged");
    const load = PgAssistant.loadThread as unknown as jest.SpyInstance;

    await openThread("p1", "p1");

    expect(fold).toHaveBeenCalledWith(served);
    expect(stored).not.toHaveBeenCalled();
    expect(load).not.toHaveBeenCalledWith("p1", true);
  });

  it("stores the server's copy when the user switched away mid-request", async () => {
    // Nothing in memory to fold into, and storage is then the only copy
    jest.spyOn(PgChatSync, "fetchThread").mockResolvedValue([]);
    jest.spyOn(PgAssistant, "threadId", "get").mockReturnValue("elsewhere");
    const fold = jest.spyOn(PgAssistant, "foldIn").mockImplementation(() => {});
    const stored = jest.spyOn(PgChatSync, "storeMerged").mockResolvedValue([]);

    await openThread("p1", "p1");

    expect(stored).toHaveBeenCalledWith("p1", []);
    expect(fold).not.toHaveBeenCalled();
  });
});
