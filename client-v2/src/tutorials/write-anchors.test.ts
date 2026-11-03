import { describe, expect, it } from "vitest";

import { checkDefinition } from "@/entities/tutorial/model/definition/check";
import type { Beat, Step, TutorialDefinition } from "@/entities/tutorial";
import {
  groundOf,
  insertBlock,
} from "@/features/tutorial-conversation/model/landing";
import hello from "./hello-anchor/tutorial.json";
import prototype from "./__tests__/write-anchors/prototype-step1.json";

/**
 * Step 1 of Lumberjack and Zero Copy, dumped from Almaz's prototype
 * (`origin/almaz/mobile-tutorial-prototype`, `tutorial-v2/lessons`): every
 * write with its own `ref` and `start`. Step 1 builds a planned failure, so
 * its writes build code the step's target does not hold as written, and the
 * lesson's text quotes that build's line numbers.
 */

interface Write {
  id: string;
  file: string;
  block: string;
  ref?: string;
  start?: string;
}

interface Lesson {
  file: string;
  start: string;
  target: string;
  writes: Write[];
}

const LESSONS = prototype as Record<"lumberjack" | "zeroCopy", Lesson>;

/** The fix question's id: the planned failure's beats start with `f1.` */
const isFix = (w: Write) => w.id.startsWith("f1.");

/** Step 1 as the definition carries it, for one file */
const stepOf = (lesson: Lesson) => ({
  start: { [lesson.file]: lesson.start },
  target: { [lesson.file]: lesson.target },
});

/** The file after each write, every write landing through `groundOf` */
const replay = (lesson: Lesson, writes: Write[]) => {
  const step = stepOf(lesson);
  let code = lesson.start;
  const appended: string[] = [];
  for (const write of writes) {
    const { reference, start } = groundOf(write, step);
    const placed = insertBlock(code, write.block, reference, start);
    if (placed.appended) appended.push(write.id);
    code = placed.code;
  }
  return { code, appended };
};

/** Hello Anchor with its first step's beats replaced by the lesson's writes */
const definitionWith = (lesson: Lesson, writes: Write[]): unknown => {
  const d = JSON.parse(JSON.stringify(hello)) as TutorialDefinition;
  const first = d.steps[0] as Step;
  first.file = lesson.file;
  first.start = stepOf(lesson).start;
  first.target = stepOf(lesson).target;
  first.beats = writes.map(
    (w): Beat => ({
      kind: "write",
      id: w.id,
      text: "Written.",
      writes: { file: w.file, block: w.block, ref: w.ref, start: w.start },
    })
  );
  delete first.planned;
  delete first.onFail;
  return JSON.parse(JSON.stringify(d));
};

/** The check's errors about the first step's beats */
const beatErrors = (definition: unknown) =>
  checkDefinition(definition, new Set([hello.finish.next ?? ""])).filter((e) =>
    e.path.startsWith("steps[0].beats")
  );

describe("tutorials/write-anchors", () => {
  describe.each(Object.entries(LESSONS))("%s step 1", (_, lesson) => {
    const build = lesson.writes.filter((w) => !isFix(w));
    const brokenBuild = build[build.length - 1].ref;

    it("builds the planned failure exactly as the prototype, nothing appended", () => {
      const { code, appended } = replay(lesson, build);
      expect(appended).toEqual([]);
      expect(code).toBe(brokenBuild?.trimEnd());
    });

    it("lands the fix in place and reaches the step's target", () => {
      const { code, appended } = replay(lesson, lesson.writes);
      expect(appended).toEqual([]);
      expect(code).toBe(lesson.target.trimEnd());
    });

    it("passes the check with every write's own ref", () => {
      expect(beatErrors(definitionWith(lesson, lesson.writes))).toEqual([]);
    });
  });

  it("builds Zero Copy's planned failure in another order without the refs", () => {
    const lesson = LESSONS.zeroCopy;
    const build = lesson.writes.filter((w) => !isFix(w));
    const own = replay(lesson, build).code;
    const targetOnly = replay(
      lesson,
      build.map((w) => ({ id: w.id, file: w.file, block: w.block }))
    ).code;
    expect(targetOnly).not.toBe(own);
  });

  describe("the check", () => {
    const lesson = LESSONS.lumberjack;
    const accounts = lesson.writes.find((w) => w.id === "s1.accounts");

    it("needs a block with a ref to appear in it", () => {
      const write: Write = {
        id: "s1.accounts",
        file: lesson.file,
        block: "pub fn goodbye() {}",
        ref: accounts?.ref,
      };
      expect(
        beatErrors(definitionWith(lesson, [write])).map((e) => e.path)
      ).toEqual(["steps[0].beats[0].writes.block"]);
    });

    it("needs a block to appear in its ref once", () => {
      const write: Write = {
        id: "s1.accounts",
        file: lesson.file,
        block: accounts?.block ?? "",
        ref: `${accounts?.ref}\n\n${accounts?.block}\n`,
      };
      expect(
        beatErrors(definitionWith(lesson, [write])).map((e) => e.path)
      ).toEqual(["steps[0].beats[0].writes.ref"]);
    });

    it("checks a ref's block there, not in the step's target", () => {
      const broken = lesson.writes.find((w) => w.id === "s1.accounts");
      const write: Write = {
        id: "s1.accounts",
        file: lesson.file,
        block: "    pub only_in_the_ref: u8,",
        ref: `${broken?.ref}\n    pub only_in_the_ref: u8,\n`,
      };
      expect(beatErrors(definitionWith(lesson, [write]))).toEqual([]);
    });
  });
});
