import { PgChatSync } from "../../features/persistence/model/chat-sync";
import { PgAssistant } from "../../views/sidebar/assistant/store";

/**
 * Upload a thread once the store's last write to it has landed.
 *
 * `push` reads the thread from storage, and the store's writes are fired and
 * forgotten, so the one the final streamed delta queued may still be in
 * flight. Pushing straight away uploaded the reply short of it. Ordinarily the
 * write has long landed and the wait costs a microtask.
 *
 * Shared by the end-of-turn push in `Chat` and the chat effect's flush. Its
 * own file, outside the `index.ts` barrel: every export there is mounted as an
 * effect.
 *
 * @returns whether the thread is now on the server
 */
export const pushThread = async (threadId: string) => {
  await PgAssistant.whenPersisted();
  return await PgChatSync.push(threadId);
};
