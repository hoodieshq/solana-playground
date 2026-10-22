import { PgAssistant } from "./store";
import type { ChatItem } from "./store";
import { realBridge } from "./bridge/playground-bridge";

type ApprovalItem = Extract<ChatItem, { kind: "approval" }>;

/**
 * Patches written in this session. Only their cards still hold the whole
 * file before and after: a stored card keeps just the region it shows, so
 * one restored from history has nothing to put back.
 */
const written = new Set<string>();

const DECLARE_ID = /declare_id!\("[^"]*"\)/;

/* A build writes the program's real id into `declare_id!`, which is the
   build's doing, not an edit: compare without it */
const same = (a: string | null, b: string) =>
  a !== null && a.replace(DECLARE_ID, "") === b.replace(DECLARE_ID, "");

/** `content` with the id the file holds now, so Undo keeps the real one */
const keepId = (content: string, now: string | null) => {
  const id = now?.match(DECLARE_ID)?.[0];
  return id ? content.replace(DECLARE_ID, id) : content;
};

/**
 * Undo an applied patch in one step, from its card.
 *
 * Reviewers of the first prototype asked to keep it: Apply is safe to press
 * when it can be taken back. Undo puts the file back as it was before the
 * patch, and only while the file still holds what the patch wrote, so it
 * never drops an edit made after it; past that, the editor's own undo is the
 * way back.
 */
export class PgPatchUndo {
  /** Call once a patch from an approval card is written */
  static wrote(approvalId: string | null) {
    if (approvalId) written.add(approvalId);
  }

  /** Whether the card's patch can still be taken back with one press */
  static can(item: ApprovalItem) {
    const { request } = item;
    return (
      request.type === "patch" &&
      item.status === "allowed" &&
      !item.undone &&
      written.has(item.id) &&
      same(realBridge.readFile(request.path), request.after)
    );
  }

  static async undo(item: ApprovalItem) {
    const { request } = item;
    if (request.type !== "patch") return;
    if (!PgPatchUndo.can(item)) {
      PgAssistant.addNotice(
        `${request.path} changed after the patch, so Undo would drop that edit. Use the editor's undo instead.`
      );
      return;
    }

    // Loaded here, not at the top: the chat's tools import this module, and
    // the explorer and the dev loop bring the whole playground with them
    const [{ PgExplorer }, { PgFlow }] = await Promise.all([
      import("../../../utils"),
      import("../../flow/state/stage"),
    ]);
    if (request.before === null) {
      await PgExplorer.deleteItem(PgExplorer.convertToFullPath(request.path));
    } else {
      await realBridge.applyPatch({
        path: request.path,
        content: keepId(request.before, realBridge.readFile(request.path)),
      });
    }
    written.delete(item.id);
    PgAssistant.markUndone(item.id, `undone, ${request.path} is back as it was`);
    // Setting the editor's text is not an edit it hears, so tell the loop:
    // what was built is the patched code, not this
    PgFlow.sourceChanged();
    // With no model connected the tutorial's own assistant is the one
    // talking, and it says where that leaves the step, so the way on is
    // offered again under its reply
    if (!PgAssistant.isConnected) {
      const id = PgAssistant.startAssistantMessage();
      PgAssistant.appendToAssistantMessage(
        id,
        `Undone, ${request.path} is back as it was. Write it yourself, or ask me again.`
      );
    }
  }
}
