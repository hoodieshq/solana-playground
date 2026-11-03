import { ArrowUp } from "lucide-react";

import type { Placeholder } from "@/features/tutorial-conversation";
import { cn } from "@/shared/lib/utils";
import { Button } from "@/shared/ui/button";
import {
  Composer,
  ComposerInput,
  ComposerSend,
  ComposerToolbar,
} from "@/shared/ui/composer";

export interface BaseTutorialComposerProps {
  value: string;
  onChange: (value: string) => void;
  placeholder: Placeholder;
  /**
   * The live assistant answers: Send becomes Stop. Enter still routes the
   * message: a word runs, and a question waits in the box for the answer
   */
  busy: boolean;
  onSend: (text: string) => void;
  onStop: () => void;
  /** The finish chips' labels, after the finish; null during the lesson */
  chips: readonly string[] | null;
  /** A chip pressed, by its index */
  onChip: (index: number) => void;
  /**
   * Before Start: the box reads greyed until it takes focus, though it still
   * takes a question or "start"
   */
  waiting: boolean;
  /**
   * Given once the assistant has answered before Start: the composer
   * suggests starting, with the intro card's button
   */
  onStart?: () => void;
}

/**
 * The chat column's one composer (spec "One composer; free questions go to
 * the live assistant"): never disabled, Enter sends, Shift+Enter breaks the
 * line, and ⌘↵ does nothing here, since in the column it presses the live
 * act. After the finish, the finish chips sit above it. Before Start it
 * reads greyed until focused, and once the assistant has answered a
 * question it suggests starting, with "Start step 1"; both lift once the
 * lesson has begun (the designer's call, 3 Nov).
 */
const BaseTutorialComposer = ({
  value,
  onChange,
  placeholder,
  busy,
  onSend,
  onStop,
  chips,
  onChip,
  waiting,
  onStart,
}: BaseTutorialComposerProps) => (
  <div className="flex flex-col gap-2">
    {onStart && (
      <div className="flex flex-wrap items-center gap-2">
        <p className="text-caption text-subtle">Ready to start the lesson?</p>
        <Button size="sm" onClick={onStart}>
          Start step 1
        </Button>
      </div>
    )}
    {chips && (
      <div role="group" className="flex flex-wrap gap-2" aria-label="Ask next">
        {chips.map((label, i) => (
          <Button
            key={label}
            variant="outline"
            size="sm"
            onClick={() => onChip(i)}
          >
            {label}
          </Button>
        ))}
      </div>
    )}
    <Composer
      busy={busy}
      onStop={onStop}
      onSubmit={() => onSend(value)}
      data-waiting={waiting || undefined}
      className={cn(
        waiting && "opacity-50 transition-opacity focus-within:opacity-100"
      )}
    >
      <ComposerInput
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.currentTarget.value)}
        onKeyDown={(e) => {
          if (e.key !== "Enter" || e.shiftKey || e.nativeEvent.isComposing) {
            return;
          }
          // The composer's Enter would send on ⌘↵ too
          if (e.metaKey || e.ctrlKey) {
            e.preventDefault();
            return;
          }
          // The composer holds every send while the assistant answers; a
          // live action's word still runs then, so Enter routes it here
          if (busy) {
            e.preventDefault();
            if (value.trim()) onSend(value);
          }
        }}
      />
      <ComposerToolbar>
        <ComposerSend>
          <ArrowUp />
        </ComposerSend>
      </ComposerToolbar>
    </Composer>
  </div>
);

export default BaseTutorialComposer;
