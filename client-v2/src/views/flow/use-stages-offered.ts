import { PgExplorer, PgTutorial } from "../../utils";
import { useRenderOnChange } from "../../hooks";
import { useConversationStarted } from "@/widgets/tutorial-conversation";

/**
 * Whether the stages (Write, Build, Deploy, Interact, and their Ctrl+1..4
 * keys) are offered. Not while the tutorial in the URL is unstarted: its
 * intro, or upstream's About page, has Start as its only action (prototype
 * SPEC 9.2), and a stage reached before it worked on a project that did not
 * exist yet ("Current workspace not found"). A tutorial with a definition
 * starts at its intro card's Start, which comes after its workspace is
 * made; any other at the Start that makes its workspace.
 */
export const useStagesOffered = (): boolean => {
  useRenderOnChange(PgTutorial.onDidChangeCurrent);
  // Upstream's Start makes the workspace, and on a cold load the explorer
  // learns its workspaces after the first render
  useRenderOnChange(PgTutorial.onDidChange);
  useRenderOnChange(PgExplorer.onDidInit);
  const current = PgTutorial.current;
  const conversationStarted = useConversationStarted(current?.name ?? "");

  if (!current) return true;
  if (current.definition) return conversationStarted;
  // `isStarted` throws until the explorer knows its workspaces
  if (!PgExplorer.allWorkspaceNames) return false;
  return PgTutorial.isStarted(current.name);
};
