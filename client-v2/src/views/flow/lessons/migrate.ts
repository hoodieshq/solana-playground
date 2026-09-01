import { admits, foldRecord } from "./ledger";
import { nextSeq } from "./events";
import type { LessonRecordEvent, StoredLesson } from "./events";
import { graderClass } from "./verify";
import type { LessonPath } from "./types";

/** The record shape #19 shipped: three fields, no provenance */
export interface LessonProgressV1 {
  completedStepIds: string[];
  skippedStepIds?: string[];
  currentStepId: string | null;
}

export const isV1 = (raw: unknown): raw is LessonProgressV1 => {
  if (typeof raw !== "object" || raw === null) return false;
  const r = raw as Record<string, unknown>;
  return (
    Array.isArray(r.completedStepIds) &&
    (r.currentStepId === null || typeof r.currentStepId === "string")
  );
};

export const isV2 = (raw: unknown): raw is StoredLesson => {
  if (typeof raw !== "object" || raw === null) return false;
  const r = raw as Record<string, unknown>;
  return r.v === 2 && Array.isArray(r.events);
};

/**
 * Replay a v1 record into events, once.
 *
 * The mapping is per kind, not per field, because v1's
 * `completedStepIds` is exactly the field that conflated the two: an
 * id there whose step is an attestation kind was necessarily put there
 * by a click, so it migrates to `attested`; every other id migrates to
 * `proved`; skips migrate to `passed`. Every synthesized event carries
 * `at: null` and `actor: "unknown"`, so the record never claims
 * provenance it does not have.
 *
 * Events are appended through the same `admits` guard live dispatch
 * uses, which is what collapses D-b's duplicate ids on the way in: the
 * second event for a step whose mark is already terminal has no edge
 * to travel on, so it is never written.
 */
export const migrateV1 = (
  path: LessonPath,
  v1: LessonProgressV1
): StoredLesson => {
  let record: StoredLesson = { v: 2, events: [] };

  type MigratedPayload =
    | { type: "graded"; stepIds: string[] }
    | { type: "attest"; stepId: string }
    | { type: "pass"; stepId: string }
    | { type: "move"; to: string | "end" };

  const append = (ev: MigratedPayload) => {
    const candidate = {
      ...ev,
      seq: nextSeq(record),
      at: null,
      actor: "unknown",
    } as LessonRecordEvent;
    if (!admits(path, foldRecord(path, record), candidate)) return;
    record = { v: 2, events: [...record.events, candidate] };
  };

  // Walk the path in order so the frontier guards hold while replaying:
  // by the time a skipped or attested step is reached, everything
  // before it is already non-open
  for (const step of path.steps) {
    for (const id of v1.completedStepIds) {
      if (id !== step.id) continue;
      if (graderClass(step.verify) === "attestation") {
        append({ type: "attest", stepId: step.id });
      } else {
        append({ type: "graded", stepIds: [step.id] });
      }
    }
    if ((v1.skippedStepIds ?? []).includes(step.id)) {
      append({ type: "pass", stepId: step.id });
    }
  }

  if (v1.currentStepId !== null) {
    append({ type: "move", to: v1.currentStepId });
  }

  return record;
};
