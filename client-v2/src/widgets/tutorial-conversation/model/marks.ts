import type { TutorialDefinition } from "@/entities/tutorial";
import { landingFor, stepOfBeat } from "@/features/tutorial-conversation";
import type {
  ConversationView,
  Landing,
} from "@/features/tutorial-conversation";

/**
 * What the feed lights in a file of the editor (`tutorial-workspace`'s
 * `LineMarks`, less the failed build's line, which the workspace reads
 * itself): the lines the assistant last wrote there, and where the open
 * question's answer lands.
 */
export interface FeedMarks {
  written: number[];
  /** The write was posted since the page loaded: its lines flash in once */
  arriving: boolean;
  landing: Landing | null;
}

const NONE: FeedMarks = { written: [], arriving: false, landing: null };

/**
 * The marks for each file, read off the feed's view. Written lines are the
 * last wrote card's in this file on the live step; a write from an earlier
 * step is history, not "what the assistant just did". The landing is the
 * live question's dry run (`landingFor`), as the write would place it now.
 */
export const marksOf =
  (
    definition: TutorialDefinition,
    view: ConversationView,
    read: (file: string) => string | null
  ) =>
  (file: string): FeedMarks => {
    const live = view.live;
    const step = live?.step ?? null;
    const wrote = [...view.turns]
      .reverse()
      .find(
        (t) =>
          t.kind === "wrote" &&
          t.step === step &&
          t.wrote !== null &&
          t.wrote.file === file
      );
    const written =
      wrote?.kind === "wrote" && wrote.wrote ? [...wrote.wrote.lines] : [];

    let landing: Landing | null = null;
    if (live?.kind === "ask" && live.open && live.ask.writes?.file === file) {
      const at = stepOfBeat(definition, live.beatId);
      landing = landingFor(
        read(file) ?? "",
        live.ask.writes.block,
        at?.target[file],
        at?.start[file] ?? ""
      );
    }

    if (!written.length && !landing) return NONE;
    return {
      written,
      arriving: written.length > 0 && wrote !== undefined && !wrote.whole,
      landing,
    };
  };
