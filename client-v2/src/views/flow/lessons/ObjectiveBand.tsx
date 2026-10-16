import type { FC } from "react";

import { BaseObjectiveBand } from "./BaseObjectiveBand";
import type { BandAction } from "./BaseObjectiveBand";
import {
  assistantLabel,
  describeFinish,
  describeStep,
  positionLabel,
  primaryLabel,
  readLabel,
} from "./band-copy";
import {
  attempted,
  foldRecord,
  nextLegal,
  positionNumber,
  prevLegal,
  rung,
} from "./ledger";
import { readiness, readinessLine } from "./readiness";
import { remedy } from "./readiness-remedy";
import { PgLesson } from "./store";
import type { LessonState } from "./store";
import { verifyingStage } from "./verify";
import { PgAssistant } from "../../sidebar/assistant/store";
import type { FlowState } from "../state/stage";
import { PgSession } from "../../../features/auth";
import {
  useBalance,
  useProgramInfo,
  useRenderOnChange,
  useWallet,
} from "../../../hooks";
import { PgCommand, PgConnection, PgProgramInfo } from "../../../utils";

interface ObjectiveBandProps {
  state: LessonState;
  flow: FlowState;
  onRead: () => void;
  onOpenGallery: () => void;
  /** The phone's one-row band */
  compact?: boolean;
  onOpenSteps?: () => void;
}

/**
 * One ask, above the editor, always visible.
 *
 * The primary action is the criterion: the control is labelled by what
 * proves the step and dispatches the same command the stage bar's
 * stepper does. The assistant sits beside it as a secondary -- the unaided
 * first attempt, bought by layout rather than by a disabled button.
 * The page comes first among the actions, and until it has been opened
 * it is the band's signpost (D34).
 */
const ObjectiveBand: FC<React.PropsWithChildren<ObjectiveBandProps>> = ({
  state,
  flow,
  onRead,
  onOpenGallery,
  compact = false,
  onOpenSteps,
}) => {
  // What the proving action needs, from the same sources the navigation's
  // session footer reads. Subscribed here, before the early return below, so the
  // hooks run on every render.
  const wallet = useWallet();
  const balance = useBalance();
  const cluster = useRenderOnChange(PgConnection.onDidChangeCluster);
  // A built program survives a reload while `PgFlow` does not, so the
  // explainer has to watch it or it will ask for a build that already
  // happened -- and contradict the rail above it
  useProgramInfo();
  useRenderOnChange(PgSession.onDidChange);

  if (!state.path) return null;
  const view = foldRecord(state.path, state.record);
  const canGoBack = prevLegal(state.path, view) !== null;
  const canGoForward = nextLegal(state.path, view) !== null;

  const back = {
    enabled: canGoBack,
    onClick: () => PgLesson.moveBack(),
  };
  const next = {
    enabled: canGoForward,
    onClick: () => PgLesson.moveForward(),
  };
  const confirmed = state.path.steps.filter((s) => {
    const mark = view.marks.get(s.id);
    return mark === "proved" || mark === "attested";
  }).length;
  const progress = confirmed / state.path.steps.length;

  // No step under the cursor means the path is finished: say so, and say
  // where to go. The rail's rows are still legal positions, so the back
  // arrow still works.
  const shown = describeStep(state);
  if (!shown) {
    const finished = describeFinish(state);
    if (!finished) return null;
    return (
      <BaseObjectiveBand
        position={{
          label: finished.number,
          short: positionLabel(state.path, view),
          progress,
        }}
        objective={finished.objective}
        criterion={finished.verifiedBy}
        back={back}
        next={next}
        read={null}
        stuck={null}
        prove={null}
        gallery={{ label: "Browse gallery", onClick: onOpenGallery }}
        readiness={null}
        compact={compact}
        onOpenSteps={onOpenSteps}
      />
    );
  }

  const { step } = shown;
  const spent = rung(view, step.id);
  // Wherever the proving action is offered -- which includes a step the
  // learner skipped and came back to. That is the repair edge the skip
  // valve promised, and the one place they have already said they were
  // stuck, so it is the last place to withhold the explanation.
  const explainer = shown.offersPrimary
    ? readinessLine(
        step.verify,
        readiness(step.verify, {
          build: flow.build,
          // The same expression `checkProgram` uses in the deploy
          // command, so the explainer asks what the command asks
          built:
            !!PgProgramInfo.uuid ||
            !!PgProgramInfo.importedProgram?.bytes.length,
          lastBuildFailed: !!PgProgramInfo.lastBuildFailed,
          wallet: !!wallet,
          balance: typeof balance === "number" ? balance : null,
          cluster: cluster ?? null,
          signedIn: !!PgSession.get(),
        })
      )
    : null;
  const tried = attempted(state.path, view, step.id);

  const askForHelp = () => {
    const prompt = PgLesson.requestHint();
    if (prompt) PgAssistant.requestPrompt(prompt);
  };

  const prove = () => {
    const stage = verifyingStage(step.verify);
    if (stage) PgCommand[stage].execute();
    else PgLesson.attest();
  };

  // Only where the proving action is offered: behind the frontier there is
  // nothing to be ready for
  const readinessProp = explainer
    ? {
        lead: explainer.lead,
        items: explainer.items.map((item) => ({
          key: item.blocker.kind,
          text: item.text,
          onClick: item.actionable ? remedy(item.blocker) : null,
        })),
      }
    : null;

  // First among the actions on purpose: reading comes before proving, and
  // until the page has been opened this is the one control that says "read
  // first"
  const read = step.readPage
    ? {
        label: readLabel(shown.position, shown.opened),
        unread: !shown.opened,
        onClick: onRead,
      }
    : null;
  const primary: BandAction | null = shown.offersPrimary
    ? { label: primaryLabel(step.verify), onClick: prove }
    : null;

  return (
    <BaseObjectiveBand
      position={{
        label: shown.number,
        short: `${positionNumber(state.path, view)}/${state.path.steps.length}`,
        progress,
      }}
      objective={shown.objective}
      criterion={shown.verifiedBy}
      back={back}
      next={next}
      read={read}
      stuck={{ label: assistantLabel(spent, tried), onClick: askForHelp }}
      prove={primary}
      gallery={null}
      readiness={readinessProp}
      compact={compact}
      onOpenSteps={onOpenSteps}
    />
  );
};

export default ObjectiveBand;
