import { EMPTY_STORED, nextSeq } from "./events";
import type { LessonRecordEvent, StoredLesson } from "./events";

const attempt = (seq: number): LessonRecordEvent => ({
  seq,
  at: seq * 1000,
  actor: "learner",
  type: "attempt",
  startedAt: seq,
});

const record = (events: LessonRecordEvent[]): StoredLesson => ({
  v: 2,
  events,
});

describe("nextSeq", () => {
  it("starts a fresh record at 1", () => {
    expect(nextSeq(EMPTY_STORED)).toBe(1);
  });

  it("continues from the last event", () => {
    expect(nextSeq(record([attempt(1), attempt(2)]))).toBe(3);
  });
});
