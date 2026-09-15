/**
 * The lesson's persisted record: an append-only series of events.
 *
 * Nothing else is stored. The per-step marks and the learner's position
 * are folds over this series (see `ledger.ts`), so the record can never
 * disagree with itself the way v1's three fields could. See the spec,
 * `docs/superpowers/specs/2026-08-28-lesson-state-machine-design.md`
 * (D25/D26) on `context-archive`.
 */

/**
 * Who an event came from. `unknown` exists only on events synthesized
 * by the v1 migration, so the record never claims provenance it does
 * not have.
 */
export type LessonActor = "learner" | "toolchain" | "unknown";

/** What the toolchain knows about a step. `proved` and `attested` are
 * terminal; only `graded` -- the toolchain's own event -- reaches
 * `proved`. */
export type LessonMark = "open" | "proved" | "attested" | "passed";

interface LessonEventBase {
  /** Monotonic within one record, starting at 1 */
  seq: number;
  /** Wall clock; `null` only on migrated events, which must not claim
   * a time nobody recorded */
  at: number | null;
  actor: LessonActor;
  /** Present when a learner approved an agent proposal -- the learner
   * still moved, the agent only proposed */
  via?: "agent";
}

/**
 * Steps are referenced by id, never by index: ids are the stable
 * storage key, so editing a path cannot shift what an old log means.
 *
 * There is no `checked` with a positive verdict -- an on-demand grader
 * that says yes emits `graded`, so `checked` only records a negative.
 * `attempt` carries the flow's own `buildStartedAt` as its identity,
 * which is what keeps one build from being recorded once per store
 * notification.
 */
export type LessonRecordEvent = LessonEventBase &
  (
    | { type: "enter" }
    | { type: "graded"; stepIds: string[] }
    | { type: "checked"; stepId: string; output?: string }
    | { type: "pass"; stepId: string }
    | { type: "attest"; stepId: string }
    | { type: "move"; to: string | "end" }
    | { type: "attempt"; startedAt: number }
    | { type: "hint"; stepId: string; rung: number }
  );

/**
 * What a trim leaves behind for the events it drops: the fold at the
 * cut -- every mark plus the cursor -- so the kept tail replays over it
 * exactly as it replayed over the dropped prefix. Only the step-local
 * `attempt`/`hint` history ages out, which is why the tail is bounded
 * rather than empty.
 */
export interface LessonSnapshot {
  marks: Array<[string, LessonMark]>;
  /** Step id under the cursor at the cut, or `end` */
  cursor: string | "end";
}

export interface StoredLesson {
  v: 2;
  /** Absent until the first trim */
  snapshot?: LessonSnapshot;
  events: LessonRecordEvent[];
}

export const EMPTY_STORED: StoredLesson = { v: 2, events: [] };

/**
 * @returns the seq the next appended event should carry. A trimmed
 * record always keeps a non-empty tail, so an empty `events` means a
 * genuinely fresh record.
 */
export const nextSeq = (r: StoredLesson): number =>
  r.events.length ? r.events[r.events.length - 1].seq + 1 : 1;
