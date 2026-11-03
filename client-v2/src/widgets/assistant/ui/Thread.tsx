import { useRenderOnChange } from "../../../hooks/useRenderOnChange";
import {
  PgAssistant,
  turnProducedApproval,
} from "../../../views/sidebar/assistant/store";
import { assistantTelemetry } from "../model/telemetry";
import type { Turn } from "../model/use-turn";
import { BaseThread } from "./BaseThread";
import type { ApprovalAnswer } from "./BaseApprovalCard";
import type { ReplyActions } from "./BaseThreadItem";

/** The empty thread's first questions, about the open project */
const SUGGESTIONS = [
  "What does this program do?",
  "Why did my build fail?",
  "How do I deploy this?",
] as const;

/**
 * Sent by "Make this change": models often describe an edit in prose instead of
 * calling `write_file`. This asks for the same edit as a patch, which lands in
 * the usual approval card.
 *
 * It leaves the assistant a line to say afterwards, so the turn does not end
 * on a silence the panel has to explain.
 */
const MAKE_CHANGE =
  "Write this change for me, using write_file with the complete new content " +
  "of the file — the change you just described, or the one my question needs " +
  "if you have not described one yet. If it touches more than one file, do " +
  "them one at a time. Skip the explanation you would usually give first and " +
  "summarise it in one line afterwards.";

/**
 * The conversation, connected: the store's items and the turn's `send`, which the composer below shares.
 */
export const Thread = ({
  turn,
  project,
}: {
  turn: Turn;
  project: string | null;
}) => {
  useRenderOnChange(PgAssistant.onDidChange);

  const items = PgAssistant.items;
  const status = PgAssistant.status;
  const { busy } = turn;

  // `useTurn`'s send settles on its own: a failed turn lands in the thread,
  // and a send that fails before its turn starts goes to `reportButtonFailure`
  const send = (text: string) => void turn.send(text);

  // Offer "Make this change" on the reply the assistant just finished, and
  // only there: an older message describes code that has since moved on, and a
  // turn ending in an approval card has already produced its patch.
  const lastItem = items[items.length - 1];
  const changeableId =
    !busy &&
    lastItem?.kind === "assistant" &&
    lastItem.text &&
    !turnProducedApproval(items)
      ? lastItem.id
      : null;

  const actionsFor = (id: string): ReplyActions | undefined =>
    id === changeableId
      ? {
          makeChange: {
            onClick: () => {
              assistantTelemetry.track("assistant_make_change_requested", {});
              send(MAKE_CHANGE);
            },
          },
        }
      : undefined;

  // Read from the store, not from what was rendered: a second tap lands
  // before the re-render, and only a card still pending is an answer
  const onAnswer = (id: string, answer: ApprovalAnswer) => {
    const card = PgAssistant.items.find((item) => item.id === id);
    if (card?.kind !== "approval" || card.status !== "pending") return;
    assistantTelemetry.track("assistant_approval_answered", {
      kind: card.request.type,
      answer,
    });
    PgAssistant.resolveApproval(id, answer === "allow");
  };

  // Cover the silent gaps: before the first token and while tools run.
  // Once text streams into the last assistant item the marker comes down.
  const working =
    status === "running" && (lastItem?.kind !== "assistant" || !lastItem.text);

  return (
    <BaseThread
      items={items}
      working={working}
      // From state, not a stored item: it must survive a render reset
      // (`clear`) and must never be saved or synced with the thread
      unsaved={PgAssistant.unsaved}
      project={project}
      suggestions={SUGGESTIONS}
      onSuggestion={(text) => {
        assistantTelemetry.track("assistant_suggestion_picked", {});
        send(text);
      }}
      actionsFor={actionsFor}
      onAnswer={onAnswer}
    />
  );
};
