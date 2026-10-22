import { chatThread } from "./chat-thread";
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
    jest.spyOn(PgChatSync, "pull").mockResolvedValue(null);
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

    expect(push).toHaveBeenCalledWith("p1");
  });

  it("does not push when nothing has happened since the last one", async () => {
    // The whole thread goes up each time and the server discards ids it
    // already has, so this is about not making a request per tab-switch for
    // every user rather than about correctness
    effect = chatThread();
    await settle();
    push.mockClear();

    setVisibility("hidden");

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

    expect(push).toHaveBeenCalledWith("p1");
  });

  it("stops listening once disposed", async () => {
    const disposable = chatThread();
    await settle();
    // Any change to the thread; `clear` emits without writing back
    PgAssistant.clear();
    disposable.dispose();
    push.mockClear();

    setVisibility("hidden");

    expect(push).not.toHaveBeenCalled();
  });
});
