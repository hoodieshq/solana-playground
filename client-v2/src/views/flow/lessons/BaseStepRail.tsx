import type { FC } from "react";

import {
  StepRail as StepRailList,
  StepRailIndicator,
  StepRailItem,
  StepRailMeta,
  StepRailTitle,
} from "@/shared/ui/step-rail";
import type { LessonMark } from "./events";

export interface RailRow {
  id: string;
  objective: string;
  meta: string;
  status: "done" | "skipped" | "current" | "locked";
  /** Whether the row is a legal place to walk to; navigation only. */
  canGo: boolean;
}

/**
 * The design system's status for a step's mark. The cursor wins: a skipped
 * step walked back onto is where the reader is, not a skipped step.
 */
export const railStatus = (
  mark: LessonMark,
  isCurrent: boolean
): RailRow["status"] => {
  if (isCurrent) return "current";
  if (mark === "proved" || mark === "attested") return "done";
  if (mark === "passed") return "skipped";
  return "locked";
};

interface BaseStepRailProps {
  rows: RailRow[];
  onGo: (id: string) => void;
}

const BaseStepRail: FC<BaseStepRailProps> = ({ rows, onGo }) => (
  <StepRailList
    aria-label="Lesson steps"
    className="flex-1 overflow-y-auto p-2"
  >
    {rows.map((row) => (
      <StepRailItem key={row.id} status={row.status}>
        <StepRailIndicator />
        {row.canGo ? (
          <button
            type="button"
            className="col-start-2 row-span-2 grid min-w-0 cursor-pointer gap-y-0 rounded-sm text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            onClick={() => onGo(row.id)}
          >
            <StepRailTitle>{row.objective}</StepRailTitle>
            <StepRailMeta className="col-start-1">{row.meta}</StepRailMeta>
          </button>
        ) : (
          <>
            <StepRailTitle>{row.objective}</StepRailTitle>
            <StepRailMeta>{row.meta}</StepRailMeta>
          </>
        )}
      </StepRailItem>
    ))}
  </StepRailList>
);

export default BaseStepRail;
export { BaseStepRail };
