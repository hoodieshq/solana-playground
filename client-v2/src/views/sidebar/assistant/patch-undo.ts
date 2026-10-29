import { realBridge } from "./bridge/playground-bridge";
import type { PlaygroundBridge } from "./bridge/playground-bridge";
import { report } from "@/features/persistence";
import { createLogger } from "@/shared/lib/logger";
import { PgAssistant } from "./store";
import type { ChatItem, PatchApproval } from "./store";

type ApprovalItem = Extract<ChatItem, { kind: "approval" }>;

const log = createLogger("assistant:patch-undo");

/**
 * What a press of Undo patch did: put the file back, found it edited since
 * Apply and wrote nothing, or had nothing it could take back
 */
export type UndoResult = "undone" | "moved-on" | "not-undoable";

/**
 * Patches this tab wrote. Only their cards still hold the whole file before
 * and after: a stored card keeps just the region it shows (`trimPatch`), so
 * one restored from history has nothing to put back.
 */
const written = new Set<string>();

/**
 * Cards whose Undo threw and left the file holding neither the patch nor
 * the original, or a file that could not be read back. The card says so and
 * offers the original to copy (`PgPatchUndo.original`); in memory, like
 * `written`, since only this tab holds the whole original.
 */
const stranded = new Set<string>();

const DECLARE_ID = /declare_id!\("[^"]*"\)/;

/**
 * Whether the file still holds what the patch wrote. A build writes the
 * program's real id into `declare_id!`, which is the build's doing, not an
 * edit, so the comparison leaves it out.
 */
const holdsPatch = (now: string | null, after: string) =>
  now !== null && now.replace(DECLARE_ID, "") === after.replace(DECLARE_ID, "");

/** `content` with the id the file holds now, so Undo keeps the real one */
const keepId = (content: string, now: string | null) => {
  const id = now?.match(DECLARE_ID)?.[0];
  return id ? content.replace(DECLARE_ID, id) : content;
};

/** The card's outcome when Undo could neither finish nor be offered again */
export const undoStrandedOutcome = (
  path: string,
  why: string,
  created: boolean
) =>
  created
    ? `Undo did not finish: ${path} ${why}. It did not exist before the patch.`
    : `Undo did not finish: ${path} ${why}. Copy the original below.`;

/** Never a silent card with no Undo: say why on it, keep the original */
const strand = (item: ApprovalItem, request: PatchApproval, why: string) => {
  stranded.add(item.id);
  PgAssistant.setApprovalOutcome(
    item.id,
    undoStrandedOutcome(request.path, why, request.before === null)
  );
};

/**
 * After a write that threw: what the file holds now decides the card, and a
 * file that cannot be read strands it too. Never throws, so the caller
 * rethrows the write's own error.
 */
const settleFailedUndo = (
  item: ApprovalItem,
  request: PatchApproval,
  /** What the file held before the write: the patch, with its current id */
  held: string | null,
  bridge: PlaygroundBridge
) => {
  let now: string | null;
  try {
    now = bridge.readFile(request.path);
  } catch (readError) {
    report("read a file back after a failed undo", readError);
    strand(item, request, "could not be read back");
    return;
  }
  if (holdsPatch(now, request.after)) {
    written.add(item.id);
    return;
  }
  const restored =
    request.before === null
      ? now === null
      : now === keepId(request.before, held);
  if (!restored) {
    report(
      "undo a patch",
      new Error(`${request.path} changed while Undo wrote it`)
    );
    strand(item, request, "changed while Undo wrote it");
    return;
  }
  if (!PgAssistant.markUndone(item.id, undoneOutcome(request.path))) {
    log.warn("undid a patch whose card is gone", {
      report: true,
      context: { path: request.path },
    });
  }
};

/** The card's outcome once its patch is taken back */
export const undoneOutcome = (path: string) =>
  `undone, ${path} is back as it was`;

/** Said when Undo patch would drop an edit made after Apply */
export const editedAfterApply = (path: string) =>
  `You edited ${path} after applying. Use undo in the editor.`;

/**
 * Undo an applied patch in one step, from its card.
 *
 * Undo puts the file back as it was before Apply, and only while the file
 * still holds what the patch wrote, so it never drops an edit made after it;
 * past that, or after a reload, the editor's own undo is the way back.
 */
export class PgPatchUndo {
  /** Call once a patch from an approval card is written */
  static wrote(approvalId: string) {
    written.add(approvalId);
  }

  /**
   * The file's content before the patch, for a card whose Undo could not
   * finish; `null` for any other card, or a patch that created its file
   */
  static original(item: ApprovalItem) {
    const { request } = item;
    if (!stranded.has(item.id) || request.type !== "patch") return null;
    return request.before;
  }

  /** Whether the card's patch can still be taken back with one press */
  static can(item: ApprovalItem, bridge: PlaygroundBridge = realBridge) {
    const { request } = item;
    return (
      request.type === "patch" &&
      item.status === "allowed" &&
      !item.undone &&
      written.has(item.id) &&
      holdsPatch(bridge.readFile(request.path), request.after)
    );
  }

  static async undo(
    item: ApprovalItem,
    bridge: PlaygroundBridge = realBridge
  ): Promise<UndoResult> {
    const { request } = item;
    if (
      request.type !== "patch" ||
      item.status !== "allowed" ||
      item.undone ||
      !written.has(item.id)
    ) {
      return "not-undoable";
    }
    const now = bridge.readFile(request.path);
    if (!holdsPatch(now, request.after)) {
      PgAssistant.addNotice(editedAfterApply(request.path));
      return "moved-on";
    }

    // Before the write, so a second press while it runs takes nothing back
    written.delete(item.id);
    try {
      if (request.before === null) await bridge.deleteFile(request.path);
      else
        await bridge.applyPatch({
          path: request.path,
          content: keepId(request.before, now),
        });
    } catch (error) {
      // A write can land before what follows it fails (the editor's model
      // sync), so the file says what happened: still the patch, and Undo is
      // offered again; back as it was, and the card says so; anything else,
      // or a file that cannot be read, and the card says Undo did not finish
      // and offers the original to copy
      settleFailedUndo(item, request, now, bridge);
      throw error;
    }
    if (!PgAssistant.markUndone(item.id, undoneOutcome(request.path))) {
      // The file is back, but the thread moved on during the write (a
      // workspace switch, a sign-out), so no card says so
      log.warn("undid a patch whose card is gone", {
        report: true,
        context: { path: request.path },
      });
    }
    return "undone";
  }
}
