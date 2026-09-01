import {
  EMPTY_STORED,
  nextSeq,
  TRIM_CAP,
  TRIM_KEEP,
  trimRecord,
} from "./events";
import type { LessonMark, LessonRecordEvent, StoredLesson } from "./events";

const attempt = (seq: number): LessonRecordEvent => ({
  seq,
  at: seq * 1000,
  actor: "learner",
  type: "attempt",
  startedAt: seq,
});

const move = (seq: number, to: string | "end"): LessonRecordEvent => ({
  seq,
  at: seq * 1000,
  actor: "learner",
  type: "move",
  to,
});

const record = (events: LessonRecordEvent[]): StoredLesson => ({
  v: 2,
  events,
});

const MARKS: Array<[string, LessonMark]> = [
  ["write", "proved"],
  ["deploy", "open"],
];
const foldMarks = () => MARKS;

describe("nextSeq", () => {
  it("starts a fresh record at 1", () => {
    expect(nextSeq(EMPTY_STORED)).toBe(1);
  });

  it("continues from the last event", () => {
    expect(nextSeq(record([attempt(1), attempt(2)]))).toBe(3);
  });

  it("continues from the tail after a trim, not from 1", () => {
    const long = record(
      Array.from({ length: TRIM_CAP + 1 }, (_, i) => attempt(i + 1))
    );
    const trimmed = trimRecord(long, foldMarks);
    expect(nextSeq(trimmed)).toBe(TRIM_CAP + 2);
  });
});

describe("trimRecord", () => {
  it("returns the same object while under the cap", () => {
    const r = record([attempt(1)]);
    expect(trimRecord(r, foldMarks)).toBe(r);
    const atCap = record(
      Array.from({ length: TRIM_CAP }, (_, i) => attempt(i + 1))
    );
    expect(trimRecord(atCap, foldMarks)).toBe(atCap);
  });

  it("keeps the last TRIM_KEEP events once past the cap", () => {
    const long = record(
      Array.from({ length: TRIM_CAP + 1 }, (_, i) => attempt(i + 1))
    );
    const trimmed = trimRecord(long, foldMarks);
    expect(trimmed.events).toHaveLength(TRIM_KEEP);
    expect(trimmed.events[0].seq).toBe(TRIM_CAP + 1 - TRIM_KEEP + 1);
    expect(trimmed.events[trimmed.events.length - 1].seq).toBe(TRIM_CAP + 1);
  });

  it("folds every mark into the snapshot so none can be forgotten", () => {
    const long = record(
      Array.from({ length: TRIM_CAP + 1 }, (_, i) => attempt(i + 1))
    );
    expect(trimRecord(long, foldMarks).snapshot?.marks).toEqual(MARKS);
  });

  it("carries the dropped prefix's last move target", () => {
    const events = Array.from({ length: TRIM_CAP + 1 }, (_, i) =>
      i === 2 ? move(i + 1, "deploy") : attempt(i + 1)
    );
    const trimmed = trimRecord(record(events), foldMarks);
    expect(trimmed.snapshot?.moveTarget).toBe("deploy");
  });

  it("keeps a prior snapshot's move target when the prefix has none", () => {
    const prior: StoredLesson = {
      v: 2,
      snapshot: { marks: [], moveTarget: "end" },
      events: Array.from({ length: TRIM_CAP + 1 }, (_, i) => attempt(i + 1)),
    };
    expect(trimRecord(prior, foldMarks).snapshot?.moveTarget).toBe("end");
  });
});
