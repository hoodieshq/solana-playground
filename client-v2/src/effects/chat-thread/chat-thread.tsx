import { PgChatSync } from "../../features/persistence/model/chat-sync";
import { report } from "../../features/persistence/model/diagnostics";
import { PgAssistant } from "../../views/sidebar/assistant/store";
// Deep import rather than the `utils` barrel, which reaches `settings.ts` and
// a webpack-defined global jest has no answer for. Same workaround as the
// other effects; here it is what makes this file testable at all.
import { PgExplorer } from "../../utils/explorer/explorer";
import type { Disposable } from "../../utils/types";

/**
 * Keep the open conversation pointed at the current workspace, and get it to
 * the server before the tab goes away.
 *
 * An app-level effect rather than something the assistant panel does, because
 * the panel is not always mounted -- it can be collapsed, or showing the
 * backend picker -- and which conversation is open must not depend on whether
 * anyone is looking at it. Otherwise a message sent right after a project
 * switch lands in the previous project's thread, or in none at all.
 *
 * Keyed by the workspace *id*, not its name: the id survives a rename, which
 * is why workspaces have one.
 *
 * Opening is two-stage on purpose. The local copy paints first so the panel is
 * never blank waiting on a network round trip, and the server's copy is folded
 * in behind it. On a deployment without sync, or signed out, the second stage
 * is a no-op and this behaves exactly as it did before.
 */
export const chatThread = (): Disposable => {
  const open = async () => {
    const id = PgExplorer.currentWorkspaceId;
    // No workspace means nowhere to persist to. Closing rather than leaving
    // the last thread open stops it collecting messages that belong nowhere.
    if (!id) return PgAssistant.closeThread();

    await PgAssistant.loadThread(id);

    const merged = await PgChatSync.pull(id);
    // `pull` rewrote storage underneath, so the open thread has to be re-read
    // past `loadThread`'s unchanged-id guard -- but only if the user has not
    // switched away while the request was in flight.
    if (merged && PgAssistant.threadId === id) {
      await PgAssistant.loadThread(id, true);
    }
  };

  /**
   * Whether anything has happened in the thread since it last reached the
   * server.
   *
   * The whole thread is uploaded each time, and the server discards ids it
   * already has, so a redundant push is harmless -- but it is a request per
   * tab-switch for every user, so it is worth not making.
   */
  let pending = false;
  const onChange = () => {
    pending = true;
  };

  /**
   * Hand the open thread over while the document is still alive.
   *
   * Project code has a debounced push *and* a reconcile that catches anything
   * the push missed. Conversations have neither: the only push outside the
   * sign-in and sign-out dumps is at the end of a turn, fire-and-forget, with
   * the result discarded. A turn that ended while the network was down, or
   * with the tab about to close, simply never reached the account -- and if
   * the user next signs out on a different device, never does.
   *
   * `visibilitychange` rather than `beforeunload`, for the same reason the
   * project flush uses it: the document is still alive here, so an ordinary
   * fetch completes, and it is the only one of the two that fires reliably on
   * mobile.
   */
  const flush = () => {
    const id = PgAssistant.threadId;
    if (!pending || !id) return;

    pending = false;
    void PgChatSync.push(id)
      .then((ok) => {
        // Put it back rather than swallowing it: the next hide tries again,
        // which is the only retry conversations have
        if (!ok) pending = true;
      })
      .catch((e) => {
        pending = true;
        report("flush thread", e);
      });
  };

  const onVisibilityChange = () => {
    if (document.visibilityState === "hidden") flush();
  };

  void open();

  const subscriptions = [
    PgExplorer.onDidSwitchWorkspace(() => {
      // The outgoing thread's, not the incoming one's
      flush();
      void open();
    }),
    PgAssistant.onDidChange(onChange),
  ];

  document.addEventListener("visibilitychange", onVisibilityChange);
  window.addEventListener("pagehide", flush);

  return {
    dispose: () => {
      for (const sub of subscriptions) sub.dispose();
      document.removeEventListener("visibilitychange", onVisibilityChange);
      window.removeEventListener("pagehide", flush);
    },
  };
};
