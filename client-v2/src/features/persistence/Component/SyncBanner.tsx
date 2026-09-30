import { useCallback, useEffect, useState } from "react";
import styled, { css } from "styled-components";

import Button from "../../../components/Button";
import { PgProjectSync } from "../model/project-sync";
import { PgExplorer } from "../../../utils/explorer/explorer";
import type { Conflict, Resolution } from "../model/project-sync";

/** `src/lib.rs`, or `src/lib.rs and 2 other files` */
const describePaths = (paths: string[]) =>
  paths.length === 1
    ? paths[0]
    : `${paths[0]} and ${paths.length - 1} other file${
        paths.length > 2 ? "s" : ""
      }`;

/** What the user is shown, and what each answer does */
const PROMPTS: Record<
  Conflict["kind"],
  {
    message: (conflict: Conflict) => string;
    actions: { label: string; resolution: Resolution }[];
  }
> = {
  divergent: {
    // Everything else has already been merged by the time this shows, so it
    // names what is left rather than offering to replace the whole project
    message: ({ paths }) =>
      paths?.length
        ? `${describePaths(
            paths
          )} changed on another device and on this one, in the same place. Everything else was merged.`
        : "This project changed on another device, and this one has unsaved changes.",
    actions: [
      { label: "Keep this version", resolution: "keep-local" },
      { label: "Take the other version", resolution: "take-server" },
    ],
  },
  "deleted-elsewhere": {
    message: () =>
      "This project was deleted on another device, but you have unsaved changes here.",
    actions: [
      { label: "Keep as a new project", resolution: "keep-as-new" },
      { label: "Delete anyway", resolution: "delete-local" },
    ],
  },
  // The two below are refusals rather than questions, so they name the thing
  // the user has to go and change and then offer the one answer there is. The
  // retry is not a convenience: a project with a question outstanding is not
  // pushed again, so without something to press, renaming the project or
  // deleting the file that made it too big would fix the cause and leave it
  // stuck anyway.
  "name-taken": {
    message: () =>
      "Another project in your account already uses this name, so this one cannot be uploaded. Rename it, then try again.",
    actions: [{ label: "Try again", resolution: "retry" }],
  },
  "too-large": {
    message: () =>
      "This project is too large to sync. Remove or shrink its largest files, then try again.",
    actions: [{ label: "Try again", resolution: "retry" }],
  },
};

/**
 * Say why a project has stopped syncing, and offer the way out.
 *
 * Mostly that means asking which copy to keep, because the failure this
 * prevents is "I opened the project on my phone and lost an afternoon on my
 * laptop". Asked only about what a merge could not settle -- lines both
 * devices changed. Anything that overlaps, or merely touches, is a question
 * rather than a guess, because a bad merge is worse than a question.
 *
 * It is the *only* place the user is asked anything. Every other outcome --
 * taking the server's copy, pushing this device's, finishing a delete -- is
 * decided by `reconcile` without involving them, because in those cases only
 * one side has work in it.
 *
 * The refusals (`name-taken`, `too-large`) are here for a different reason:
 * not because there is a choice to make, but because a project that has
 * stopped uploading is otherwise indistinguishable from one that is up to
 * date. Silence is the wrong answer to "your work is no longer being saved".
 *
 * Shown for the current workspace only, and re-read on every change to the
 * outstanding set. It used to subscribe to a raise-only event and so stayed on
 * screen for the rest of the session once triggered, including over unrelated
 * projects.
 */
const SyncBanner = () => {
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
  const message = prompt.message(conflict);

  // The first path is the one the message names, so it is set in code style
  const named = conflict.paths?.[0];
  const at = named ? message.indexOf(named) : -1;

  return (
    <Wrapper role="alert">
      <Icon viewBox="0 0 24 24" width="18" height="18" aria-hidden>
        <path
          d="M12 3.5L2.5 20h19L12 3.5zM12 10v4.5M12 17.25v.01"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </Icon>
      <Body>
        <Message>
          {named && at >= 0 ? (
            <>
              {message.slice(0, at)}
              <Path>{named}</Path>
              {message.slice(at + named.length)}
            </>
          ) : (
            message
          )}
        </Message>
        <Actions>
          {prompt.actions.map((action, i) => (
            <Button
              key={action.resolution}
              kind={i === 0 ? "primary" : "outline"}
              size="small"
              disabled={busy}
              onClick={() => void answer(action.resolution)}
            >
              {action.label}
            </Button>
          ))}
        </Actions>
      </Body>
    </Wrapper>
  );
};

/** A floating card, like the project menu it hangs from */
const Wrapper = styled.div`
  ${({ theme }) => css`
    display: flex;
    align-items: flex-start;
    gap: 0.75rem;
    width: 26rem;
    max-width: calc(100vw - 2rem);
    margin-top: 0.375rem;
    padding: 0.75rem 1rem;
    border: 1px solid ${theme.colors.default.border};
    border-left: 3px solid ${theme.colors.state.warning.color};
    border-radius: ${theme.default.borderRadius};
    background: ${theme.colors.default.bgSecondary};
    box-shadow: ${theme.default.boxShadow};
    color: ${theme.colors.default.textPrimary};
    font-family: ${theme.font.other.family};
    font-size: ${theme.font.other.size.small};
    line-height: 1.4;
    white-space: normal;
  `}
`;

const Icon = styled.svg`
  flex-shrink: 0;
  margin-top: 0.125rem;
  color: ${({ theme }) => theme.colors.state.warning.color};
`;

const Body = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  min-width: 0;
`;

const Message = styled.p`
  margin: 0;
  overflow-wrap: anywhere;
`;

const Path = styled.code`
  ${({ theme }) => css`
    padding: 0.0625rem 0.375rem;
    border-radius: 6px;
    background: ${theme.colors.default.bgPrimary};
    font-family: ${theme.font.code.family};
    font-size: ${theme.font.code.size.small};
  `}
`;

const Actions = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
`;

export default SyncBanner;
