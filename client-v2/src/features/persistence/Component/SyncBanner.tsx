import { useCallback, useEffect, useState } from "react";
import styled from "styled-components";

import { PgProjectSync } from "../model/project-sync";
import { PgExplorer } from "../../../utils/explorer/explorer";
import type { Conflict, Resolution } from "../model/project-sync";

/** What the user is shown, and what each answer does */
const PROMPTS: Record<
  Conflict["kind"],
  { message: string; actions: { label: string; resolution: Resolution }[] }
> = {
  divergent: {
    message:
      "This project changed on another device, and this one has unsaved changes.",
    actions: [
      { label: "Keep this version", resolution: "keep-local" },
      { label: "Take the other version", resolution: "take-server" },
    ],
  },
  "deleted-elsewhere": {
    message:
      "This project was deleted on another device, but you have unsaved changes here.",
    actions: [
      { label: "Keep as a new project", resolution: "keep-as-new" },
      { label: "Delete anyway", resolution: "delete-local" },
    ],
  },
};

/**
 * Ask which copy of a project to keep.
 *
 * Deliberately a prompt rather than a merge or a silent overwrite: the failure
 * this prevents is "I opened the project on my phone and lost an afternoon on
 * my laptop". Two copies of a program are not something an automatic merge can
 * reconcile, and a bad merge is worse than a question.
 *
 * It is also the *only* place the user is asked anything. Every other outcome
 * -- taking the server's copy, pushing this device's, finishing a delete -- is
 * decided by `reconcile` without involving them, because in those cases only
 * one side has work in it.
 *
 * Shown for the current workspace only, and re-read on every change to the
 * outstanding set. It used to subscribe to a raise-only event and so stayed on
 * screen for the rest of the session once triggered, including over unrelated
 * projects.
 */
export const SyncBanner = () => {
  const [conflict, setConflict] = useState<Conflict | null>(null);
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(() => {
    setConflict(PgProjectSync.conflictFor(PgExplorer.currentWorkspaceId));
  }, []);

  useEffect(() => {
    refresh();
    const subscriptions = [
      PgProjectSync.onDidChangeConflicts(refresh),
      // A conflict belongs to a project, so switching away from it has to take
      // the banner with it
      PgExplorer.onDidSwitchWorkspace(refresh),
    ];
    return () => {
      for (const sub of subscriptions) sub.dispose();
    };
  }, [refresh]);

  const answer = async (resolution: Resolution) => {
    if (!conflict) return;
    setBusy(true);
    try {
      // A resolution that failed -- offline, or the server refused again --
      // leaves the prompt up. Clearing it here would strand the project with
      // nothing on screen to say so.
      await PgProjectSync.resolve(conflict.projectId, resolution);
    } finally {
      setBusy(false);
      refresh();
    }
  };

  if (!conflict) return null;

  const prompt = PROMPTS[conflict.kind];

  return (
    <Wrapper role="alert">
      {prompt.message}
      {prompt.actions.map((action) => (
        <Action
          key={action.resolution}
          disabled={busy}
          onClick={() => void answer(action.resolution)}
        >
          {action.label}
        </Action>
      ))}
    </Wrapper>
  );
};

const Wrapper = styled.div`
  ${({ theme }) => `
    padding: 0.5rem 0.75rem;
    background: ${theme.colors.state.warning.bg};
    color: ${theme.colors.state.warning.color};
    font-size: ${theme.font.code.size.small};
    display: flex;
    align-items: center;
    gap: 0.75rem;
  `}
`;

const Action = styled.button`
  ${({ theme }) => `
    color: ${theme.colors.state.warning.color};
    text-decoration: underline;
    cursor: pointer;
    background: none;
    border: none;
    font-size: inherit;
    white-space: nowrap;

    &:disabled {
      cursor: progress;
      opacity: 0.6;
    }
  `}
`;
