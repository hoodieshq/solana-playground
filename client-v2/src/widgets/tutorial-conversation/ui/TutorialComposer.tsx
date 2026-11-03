import { PgConversation } from "@/features/tutorial-conversation";
import BaseTutorialComposer from "./BaseTutorialComposer";
import { useConversationState } from "./TutorialConversation";

/**
 * The live assistant's turn as the composer needs it: the one `useTurn`
 * (`widgets/assistant`) that `TutorialChat` in `views/flow/Flow.tsx` mounts
 * while the frame shows, described here by shape, since a widget does not
 * import another. Its `send` clears `input` itself, and only once the
 * message is in, so a send it refuses leaves the text in the box.
 */
export interface ComposerTurn {
  /** Send a prompt; with nothing connected, it opens Connect a model and puts the text back */
  send: (text: string) => Promise<void>;
  stop: () => void;
  busy: boolean;
  input: string;
  setInput: (value: string) => void;
}

export interface TutorialComposerProps {
  turn: ComposerTurn;
}

/**
 * The composer under the feed. A live action's word runs that action and a
 * word the open question refuses gets the lesson's refusal
 * (`PgConversation.say`); anything else goes to the live assistant, counted
 * as asked. A finish chip posts its answer with no model call. The box holds
 * the turn's own input, so a message the assistant could not send yet (no
 * model connected) comes back here.
 */
export const TutorialComposer = ({ turn }: TutorialComposerProps) => {
  const state = useConversationState();
  const view = PgConversation.view();
  const context = state.context;
  if (!context || !view) return null;

  const finished = state.engine.progress.cursor.kind === "finished";
  const send = (text: string) => {
    if (PgConversation.say(text) === "lesson") {
      turn.setInput("");
      return;
    }
    // TODO(tutorial-flow-v2 3.6 follow-up): counted before `useTurn` says
    // whether the message went out (with no model it opens Connect a model
    // and keeps the text); counting only a started send needs `send` to
    // report it
    PgConversation.asked();
    // With no model, `send` opens Connect a model and keeps the text here,
    // with no note, as the panel's composer does for a typed message (its
    // "waiting" note is for prompts the product asked for)
    void turn.send(text);
  };
  return (
    <BaseTutorialComposer
      value={turn.input}
      onChange={turn.setInput}
      placeholder={view.placeholder}
      busy={turn.busy}
      onSend={send}
      onStop={turn.stop}
      chips={
        finished ? context.definition.finish.chips.map((c) => c.label) : null
      }
      onChip={(i) => PgConversation.chip(i)}
    />
  );
};
