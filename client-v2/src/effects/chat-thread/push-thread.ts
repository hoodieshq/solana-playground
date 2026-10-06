import { PgChatSync } from "../../features/persistence/model/chat-sync";
import { report } from "../../features/persistence/model/diagnostics";
import { PgThreadIndex } from "../../features/persistence/model/thread-index";
import { PgAssistant } from "../../views/sidebar/assistant/store";
import { PgExplorer } from "../../utils/explorer/explorer";
import { openThread } from "./open-thread";

/**
 * Upload a thread once the store's last write to it has landed.
 *
 * `push` reads the thread from storage, and the store's writes are fired and
 * forgotten, so the one the final streamed delta queued may still be in
 * flight. Pushing straight away uploaded the reply short of it. Ordinarily the
 * write has long landed and the wait costs a microtask.
 *
 * Shared by the end-of-turn push in `Chat` and the chat effect's flush. Its
 * own file, outside the `index.ts` barrel: every export there is mounted as
 * an effect.
 *
 * A thread the server has deleted is settled here, once, instead of being
 * pushed and refused again on every turn:
 *
 * - deleted under a live project -- a tutorial started again on another
 *   device -- it is forgotten and, if the panel has it open, replaced by a
 *   fresh thread for the workspace, which then adopts the account's;
 * - deleted with its project, it is left alone. The user is about to be
 *   asked about the project (`SyncBanner`), and the answer settles the chat
 *   too: "keep as new" carries it, "delete" drops it. Forgetting it here
 *   would lose the conversation before that question is on screen.
 *
 * @returns whether the thread is settled: on the server, or closed by it.
 * `false` means it is still owed and the caller should try again.
 */
export const pushThread = async (threadId: string) => {
  await PgAssistant.whenPersisted();
  const outcome = await PgChatSync.push(threadId);
  if (outcome === "thread-deleted") await replaceDeleted(threadId);
  return outcome !== "failed";
};

/** Forget a thread the server has closed, and open a new one in its place */
const replaceDeleted = async (threadId: string) => {
  const workspaceId = await PgThreadIndex.workspaceOf(threadId);
  if (!workspaceId) return;
  await PgThreadIndex.forget(workspaceId);

  // Only when the panel is still showing the dead thread on the workspace
  // it belongs to. Switched away, the next open mints a fresh one anyway.
  if (
    PgAssistant.threadId !== threadId ||
    PgExplorer.currentWorkspaceId !== workspaceId
  ) {
    return;
  }
  try {
    await openThread(workspaceId, await PgThreadIndex.ensure(workspaceId));
  } catch (e) {
    report(`reopen ${workspaceId} after its thread was deleted`, e);
  }
};
