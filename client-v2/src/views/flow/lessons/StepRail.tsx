import type { FC } from "react";

import BaseStepRail, { railStatus } from "./BaseStepRail";
import type { RailRow } from "./BaseStepRail";
import { primaryLabel } from "./band-copy";
import { foldRecord, legal } from "./ledger";
import { PgLesson } from "./store";
import type { LessonState } from "./store";

interface StepRailProps {
  state: LessonState;
}

/**
 * The lesson's steps, marked with what actually confirmed them.
 *
 * An honest map: rows at legal positions navigate (clicking one is
 * pure navigation, and the model proves it), rows beyond the frontier
 * do not and say why. Nothing is "locked" -- some things are unproved.
 */
const StepRail: FC<React.PropsWithChildren<StepRailProps>> = ({ state }) => {
  const { path } = state;
  if (!path) return null;

  const view = foldRecord(path, state.record);

  const rows: RailRow[] = path.steps.map((step, i) => {
    const mark = view.marks.get(step.id) ?? "open";
    const isCurrent = view.cursor === i;
    const atFrontier = view.frontier === i;

    let meta = "not reached";
    if (mark === "proved") meta = step.verifiedBy;
    else if (mark === "attested")
      meta = "you marked this read — not machine-checked";
    else if (mark === "passed") meta = "skipped — not verified";
    else if (atFrontier) meta = primaryLabel(step.verify).toLowerCase();

    return {
      id: step.id,
      objective: step.objective,
      meta,
      status: railStatus(mark, isCurrent),
      canGo: !isCurrent && legal(path, view, i),
    };
  });

  return <BaseStepRail rows={rows} onGo={(id) => PgLesson.move(id)} />;
};

export default StepRail;
