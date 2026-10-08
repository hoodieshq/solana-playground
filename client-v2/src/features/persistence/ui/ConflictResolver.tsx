import { useCallback, useEffect, useRef, useState } from "react";

import { BaseConflictResolver } from "./BaseConflictResolver";
import { conflictKey } from "./merge-editor/merge-file";
import { PgProjectSync } from "../model/project-sync";
import type { FileConflict } from "../model/merge";
import type { Conflict, Resolution } from "../model/project-sync";

/** The files a conflict asks about line by line, or `null` for none */
const filesOf = (conflict: Conflict | null): FileConflict[] | null =>
  conflict?.kind === "divergent" && conflict.files?.length
    ? conflict.files
    : null;

/**
 * The resolve view over a project's divergent conflict.
 *
 * Follows the conflict while open. Raised again with other copies of its
 * files -- the other device saved meanwhile, or an answer was refused
 * because it had -- it shows the new files and names the ones that moved;
 * an answer made against the old ones can only be refused (pinned hashes),
 * so nothing has to be locked while the user decides. Settled, or turned
 * into another kind of question, it closes.
 */
export const ConflictResolver = ({
  projectId,
  onClose,
}: {
  projectId: string;
  onClose: () => void;
}) => {
  const [files, setFiles] = useState(() =>
    filesOf(PgProjectSync.conflictFor(projectId))
  );
  const shown = useRef(files);
  const [changed, setChanged] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  // An answer clears the question before uploading and may raise it again,
  // so while one is out a missing conflict is not yet a reason to close
  const answering = useRef(false);

  const follow = useCallback(() => {
    const next = filesOf(PgProjectSync.conflictFor(projectId));
    if (!next) {
      if (!answering.current) onClose();
      return;
    }
    const before = new Map(
      (shown.current ?? []).map((f) => [f.path, conflictKey(f)])
    );
    const moved = next
      .filter((f) => before.get(f.path) !== conflictKey(f))
      .map((f) => f.path);
    if (!moved.length && next.length === before.size) return;
    shown.current = next;
    setFiles(next);
    setChanged(moved);
  }, [projectId, onClose]);

  useEffect(() => {
    const subscription = PgProjectSync.onDidChangeConflicts(follow);
    return () => subscription.dispose();
  }, [follow]);

  const answer = async (resolution: Resolution) => {
    answering.current = true;
    setBusy(true);
    let settled = false;
    try {
      settled = await PgProjectSync.resolve(projectId, resolution);
    } finally {
      answering.current = false;
      setBusy(false);
    }
    // Refused or failed: the question stands, perhaps about new copies
    if (settled) onClose();
    else follow();
  };

  if (!files) return null;
  return (
    <BaseConflictResolver
      files={files}
      changed={changed}
      busy={busy}
      onApply={(resolved) => void answer({ kind: "resolved", files: resolved })}
      onKeepLocal={() => void answer("keep-local")}
      onTakeServer={() => void answer("take-server")}
      onCancel={onClose}
    />
  );
};
