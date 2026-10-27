import Ajv from "ajv";
import type { ErrorObject, ValidateFunction } from "ajv";

// Relative on purpose: `yarn tutorial:check` runs this module through tsx,
// with no `@/` alias, and the schema sits beside the definitions it checks
import schema from "../../../../tutorials/tutorial.schema.json";
import type {
  Beat,
  DefinitionError,
  Files,
  Step,
  TutorialDefinition,
} from "./types";

let compiled: ValidateFunction | undefined;

/** The schema's validator, compiled on first use rather than on import */
const validator = () => {
  compiled ??= new Ajv({
    allErrors: true,
    discriminator: true,
    allowUnionTypes: true,
    // Errors carry the value and the schema they failed, for the message
    verbose: true,
  }).compile(schema);
  return compiled;
};

/**
 * Every problem in a parsed `tutorial.json`; empty when it is a definition.
 * The schema runs first; the rules a schema cannot express (a right index in
 * range, a reason per wrong option and none for the right one, blocks found
 * in their target, instructions some step's target defines, a `next` in
 * `known`, ids used once, patterns that compile) run only on a definition the
 * schema accepts, since they read its shape. The folder-name error leads,
 * then the rules' errors in step order.
 *
 * @param known every tutorial slug `finish.next` may name
 * @param slug the folder the definition sits in, which its name must give:
 * routes and saved workspaces are named from the name
 */
export const checkDefinition = (
  json: unknown,
  known: ReadonlySet<string>,
  slug?: string
): DefinitionError[] => {
  const validate = validator();
  if (!validate(json)) {
    const errors = schemaErrors(validate.errors ?? []);
    // Never pass a definition the schema refused because every one of its
    // errors was folded away as a branch of another
    return errors.length > 0
      ? errors
      : [
          {
            path: ROOT,
            message: "a definition the schema accepts, found one it refuses",
          },
        ];
  }
  const d = json as TutorialDefinition;
  const errors = ruleErrors(d, known);
  if (slug !== undefined && slugOf(d.name) !== slug) {
    errors.unshift({
      path: "name",
      message: `a name whose slug is the folder's, ${JSON.stringify(
        slug
      )}, found ${JSON.stringify(d.name)}`,
    });
  }
  return errors;
};

/** A tutorial's slug from its name, as `PgCommon.toKebabFromTitle` makes it */
export const slugOf = (name: string) =>
  name
    .split(" ")
    .map((w) => w.toLowerCase())
    .join("-")
    .replace(/[^\w-]/g, "")
    .replaceAll("--", "-")
    .replace(/^-/, "")
    .replace(/-$/, "");

/** One error as the check prints it */
export const formatError = (e: DefinitionError) => `${e.path}: ${e.message}`;

/** A found value in a few words */
const found = (value: unknown): string => {
  if (value === undefined) return "none";
  if (Array.isArray(value)) return `a list of ${value.length}`;
  if (value !== null && typeof value === "object") return "an object";
  const text = JSON.stringify(value);
  return text.length > 60 ? `${text.slice(0, 57)}..."` : text;
};

const IDENTIFIER = /^[A-Za-z_$][\w$]*$/;

/** A JSON pointer (`/steps/1/why/2`) as a path (`steps[1].why[2]`) */
const pathOf = (pointer: string, extra?: string): string => {
  const segments = pointer
    .split("/")
    .slice(1)
    .map((s) => s.replace(/~1/g, "/").replace(/~0/g, "~"));
  if (extra !== undefined) segments.push(extra);
  return segments.reduce((path, s) => {
    if (/^\d+$/.test(s)) return `${path}[${s}]`;
    if (IDENTIFIER.test(s)) return path ? `${path}.${s}` : s;
    return `${path}[${JSON.stringify(s)}]`;
  }, "");
};

const ROOT = "(root)";

const quoted = (values: unknown[]) =>
  values.map((v) => JSON.stringify(v)).join(", ");

/** What a failed keyword expected, in words */
const expected = (e: ErrorObject): string => {
  const p = e.params as Record<string, unknown>;
  switch (e.keyword) {
    case "type":
      return `a ${String(p.type).split(",").join(" or ")}`;
    case "const":
      return JSON.stringify(p.allowedValue);
    case "enum":
      return `one of ${quoted(p.allowedValues as unknown[])}`;
    case "minItems":
      return `at least ${p.limit} items`;
    case "maxItems":
      return `at most ${p.limit} items`;
    case "minLength":
      return p.limit === 1
        ? "a non-empty string"
        : `at least ${p.limit} characters`;
    case "minimum":
      return `at least ${p.limit}`;
    case "pattern":
      return `text matching /${p.pattern}/`;
    case "uniqueItems":
      return `no item twice (items ${p.j} and ${p.i} are equal)`;
    case "anyOf":
      return e.schemaPath.includes("/text/")
        ? "a string, or { text, phone }"
        : "one of the shapes the schema allows";
    default:
      return e.message ?? e.keyword;
  }
};

/** Ajv's errors as paths, one line per field */
const schemaErrors = (raw: ErrorObject[]): DefinitionError[] => {
  // An anyOf reports each branch's failure, then its own: keep only its own
  const unions = raw.filter((e) => e.keyword === "anyOf");
  const inUnion = (e: ErrorObject) =>
    unions.some(
      (u) =>
        u !== e &&
        e.schemaPath.startsWith(u.schemaPath.replace(/anyOf$/, "")) &&
        (e.instancePath === u.instancePath ||
          e.instancePath.startsWith(`${u.instancePath}/`))
    );
  const errors: DefinitionError[] = [];
  for (const e of raw) {
    // `if` only says its `then` failed, which has its own error
    if (e.keyword === "if" || inUnion(e)) continue;
    // The act's `else`: a `call` on an act that does not call
    if (e.keyword === "not" && e.schemaPath.endsWith("/else/not")) {
      errors.push({
        path: pathOf(e.instancePath, "call"),
        message: "no call on an act other than `call`, found one",
      });
      continue;
    }
    // A property name's own error is reported by `propertyNames`
    if (e.propertyName !== undefined) continue;
    const p = e.params as Record<string, unknown>;
    const at = pathOf(e.instancePath);
    if (e.keyword === "required" || e.keyword === "dependencies") {
      errors.push({
        path: at || ROOT,
        message: `needs ${JSON.stringify(p.missingProperty)}, found none`,
      });
    } else if (e.keyword === "additionalProperties") {
      const name = String(p.additionalProperty);
      errors.push({
        path: pathOf(e.instancePath, name),
        message: `no such field, found ${found(
          (e.data as Record<string, unknown>)[name]
        )}`,
      });
    } else if (e.keyword === "propertyNames") {
      errors.push({
        path: at || ROOT,
        message: `a relative file path, found ${JSON.stringify(
          p.propertyName
        )}`,
      });
    } else if (e.keyword === "discriminator") {
      errors.push({
        path: pathOf(e.instancePath, String(p.tag)),
        message: `one of ${quoted(kindsAt(e))}, found ${found(p.tagValue)}`,
      });
    } else {
      errors.push({
        path: at || ROOT,
        message: `${expected(e)}, found ${found(e.data)}`,
      });
    }
  }
  return errors;
};

/** The `kind`s a discriminated union allows, read from its branches */
const kindsAt = (e: ErrorObject): string[] =>
  ((e.parentSchema as { oneOf: { $ref: string }[] }).oneOf ?? []).map(
    (branch) => {
      const name = branch.$ref?.split("/").pop() ?? "";
      const definitions = schema.definitions as Record<
        string,
        { properties?: { kind?: { const?: string } } }
      >;
      return definitions[name]?.properties?.kind?.const ?? name;
    }
  );

/** A step's beats with their paths, the planned failure's too */
const beatsOf = (step: Step, i: number): [Beat, string][] => [
  ...step.beats.map((b, j): [Beat, string] => [b, `steps[${i}].beats[${j}]`]),
  ...(step.onFail ?? []).map((b, j): [Beat, string] => [
    b,
    `steps[${i}].onFail[${j}]`,
  ]),
];

/** Code lines as a block is compared: trimmed, blank lines dropped */
const codeLines = (code: string) =>
  code
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

/** Whether `file` holds `block`'s lines in a row, indentation and blank lines aside */
const holds = (file: string, block: string) => {
  const want = codeLines(block);
  const have = codeLines(file);
  if (want.length === 0) return false;
  for (let i = 0; i + want.length <= have.length; i++) {
    if (want.every((line, k) => have[i + k] === line)) return true;
  }
  return false;
};

const escapeRegExp = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** Whether any of the files defines `fn <name>` */
const defines = (files: string[], name: string) => {
  const fn = new RegExp(`\\bfn\\s+${escapeRegExp(name)}\\s*[(<]`);
  return files.some((f) => fn.test(f));
};

const compiles = (pattern: string) => {
  try {
    new RegExp(pattern, "i");
    return true;
  } catch {
    // The caller reports it as the definition's error
    return false;
  }
};

/** The rules a schema cannot express, over a definition the schema accepted */
const ruleErrors = (
  d: TutorialDefinition,
  known: ReadonlySet<string>
): DefinitionError[] => {
  const errors: DefinitionError[] = [];
  const targets = d.steps.flatMap((s) => Object.values(s.target));
  const beatIds = new Map<string, string>();
  const stepIds = new Map<string, string>();

  const once = (
    ids: Map<string, string>,
    id: string,
    path: string,
    what: string
  ) => {
    const first = ids.get(id);
    if (first === undefined) {
      ids.set(id, path);
      return;
    }
    errors.push({
      path,
      message: `an id no other ${what} has, found ${JSON.stringify(
        id
      )}, also at ${first}`,
    });
  };

  const pattern = (value: string | undefined, path: string) => {
    if (value !== undefined && !compiles(value)) {
      errors.push({
        path,
        message: `a regular expression, found ${JSON.stringify(value)}`,
      });
    }
  };

  const block = (
    target: Files,
    writes: { file: string; block: string },
    at: string
  ) => {
    const file = target[writes.file];
    if (file === undefined) {
      errors.push({
        path: `${at}.file`,
        message: `a file in the step's target, found ${JSON.stringify(
          writes.file
        )}`,
      });
    } else if (!holds(file, writes.block)) {
      errors.push({
        path: `${at}.block`,
        message: `a block in the step's target ${writes.file}, found ${found(
          codeLines(writes.block)[0] ?? ""
        )}`,
      });
    }
  };

  d.steps.forEach((step, i) => {
    once(stepIds, step.id, `steps[${i}].id`, "step");
    for (const [beat, at] of beatsOf(step, i)) {
      once(beatIds, beat.id, `${at}.id`, "beat");
      if (beat.kind === "write") {
        if ("create" in beat.writes) {
          if (step.target[beat.writes.create] === undefined) {
            errors.push({
              path: `${at}.writes.create`,
              message: `a file in the step's target, found ${JSON.stringify(
                beat.writes.create
              )}`,
            });
          }
        } else {
          block(step.target, beat.writes, `${at}.writes`);
        }
      }
      if (beat.kind === "ask") {
        if (![0, 1, 2].includes(beat.answer)) {
          errors.push({
            path: `${at}.answer`,
            message: `the right option is 0, 1 or 2, found ${found(
              beat.answer
            )}`,
          });
        } else {
          beat.why.forEach((why, k) => {
            if (k !== beat.answer && !why) {
              errors.push({
                path: `${at}.why[${k}]`,
                message: `a wrong option needs a reason, found ${found(why)}`,
              });
            } else if (k === beat.answer && why !== null) {
              errors.push({
                path: `${at}.why[${k}]`,
                message: `null at the right option, found ${found(why)}`,
              });
            }
          });
        }
        if (beat.writes) block(step.target, beat.writes, `${at}.writes`);
      }
    }

    const goal = step.goal;
    const instruction = (name: string, path: string) => {
      if (!defines(targets, name)) {
        errors.push({
          path,
          message: `an instruction a step's target defines, found ${JSON.stringify(
            name
          )}`,
        });
      }
    };
    if (goal.kind === "build") {
      goal.instructions?.forEach((name, k) =>
        instruction(name, `steps[${i}].goal.instructions[${k}]`)
      );
    } else if (goal.kind === "call") {
      instruction(goal.instruction, `steps[${i}].goal.instruction`);
      pattern(goal.log, `steps[${i}].goal.log`);
    }

    step.chips.forEach((c, k) =>
      pattern(c.pattern, `steps[${i}].chips[${k}].pattern`)
    );
    step.errorChips?.forEach((c, k) =>
      pattern(c.pattern, `steps[${i}].errorChips[${k}].pattern`)
    );
    step.matches?.forEach((m, k) =>
      pattern(m.pattern, `steps[${i}].matches[${k}].pattern`)
    );
  });
  d.finish.chips.forEach((c, k) =>
    pattern(c.pattern, `finish.chips[${k}].pattern`)
  );

  if (d.finish.next !== null && !known.has(d.finish.next)) {
    errors.push({
      path: "finish.next",
      message: `the slug of a tutorial, found ${JSON.stringify(d.finish.next)}`,
    });
  }
  return errors;
};

if (import.meta.vitest) {
  const { describe, it, expect } = import.meta.vitest;
  type TutorialDefinition = import("./types").TutorialDefinition;
  type Ask = import("./types").Ask;
  type WriteBeat = import("./types").WriteBeat;
  type Beat = import("./types").Beat;

  describe("entities/tutorial/model/definition/check", () => {
    const LIB =
      "use anchor_lang::prelude::*;\n\npub fn hello(name: String) {\n    msg!(name);\n}\n";

    const ask = (id: string): Ask => ({
      kind: "ask",
      id,
      kicker: "Question",
      question: "Which line?",
      options: ["a", "b", "c"],
      code: true,
      answer: 0,
      right: "Yes.",
      why: [null, "Not b.", "Not c."],
      hint: "Think.",
    });

    /** A two-step definition that passes: the second step's beats[3] is a question */
    const minimal = (): TutorialDefinition => ({
      version: 1,
      name: "Minimal",
      description: "The smallest tutorial.",
      authors: [{ name: "Fleet" }],
      level: "Beginner",
      framework: "Anchor",
      languages: ["Rust"],
      thumbnail: "thumbnail.jpg",
      minutes: 5,
      intro: {
        lead: "You write hello.",
        prints: "Program log: hi",
        files: { "src/lib.rs": LIB },
      },
      steps: [
        {
          id: "program",
          title: "Program",
          short: "Program",
          objective: "Write hello",
          learned: "Instructions",
          file: "src/lib.rs",
          start: { "src/lib.rs": "" },
          target: { "src/lib.rs": LIB },
          beats: [
            {
              kind: "write",
              id: "s1.boil",
              text: "The import.",
              writes: {
                file: "src/lib.rs",
                block: "use anchor_lang::prelude::*;",
              },
            },
            {
              kind: "act",
              id: "s1.build",
              act: "build",
              title: "Build",
              context: "Compiles lib.rs",
              button: "Build",
            },
          ],
          goal: { kind: "build", instructions: ["hello"] },
          win: {
            id: "s1.win",
            headline: "Built.",
            line: "One instruction.",
            stats: [],
          },
          explain: "This step writes hello.",
          chips: [],
        },
        {
          id: "call",
          title: "Call",
          short: "Call",
          objective: "Call hello",
          learned: "Calls",
          file: "src/lib.rs",
          start: { "src/lib.rs": LIB },
          target: { "src/lib.rs": LIB },
          beats: [
            { kind: "say", id: "s2.a", text: "One." },
            { kind: "say", id: "s2.b", text: "Two." },
            { kind: "say", id: "s2.c", text: "Three." },
            ask("s2.q"),
          ],
          goal: {
            kind: "call",
            instruction: "hello",
            args: ["name"],
            log: "hi",
          },
          win: {
            id: "s2.win",
            headline: "Called.",
            line: "It said hi.",
            stats: [],
          },
          explain: "This step calls hello.",
          chips: [],
        },
      ],
      finish: {
        headline: "Done.",
        line: "You called hello.",
        learned: ["Instructions", "Calls"],
        chips: [],
        next: "counter-pda-tutorial",
      },
    });

    const KNOWN = new Set(["minimal", "counter-pda-tutorial"]);
    const lines = (d: unknown) => checkDefinition(d, KNOWN).map(formatError);
    const askAt = (d: TutorialDefinition, step: number, beat: number) =>
      d.steps[step].beats[beat] as Ask;

    it("passes a well-formed definition", () => {
      expect(lines(minimal())).toEqual([]);
    });

    it("names a wrong option with no reason by its path", () => {
      const d = minimal();
      askAt(d, 1, 3).why[2] = null;
      expect(lines(d)).toEqual([
        "steps[1].beats[3].why[2]: a wrong option needs a reason, found null",
      ]);
    });

    it("rejects a right index outside 0 to 2", () => {
      const d = minimal();
      (askAt(d, 1, 3) as { answer: number }).answer = 3;
      expect(lines(d)).toEqual([
        "steps[1].beats[3].answer: the right option is 0, 1 or 2, found 3",
      ]);
    });

    it("names the beat and the file of a block the target does not hold", () => {
      const d = minimal();
      const q = askAt(d, 1, 3);
      q.writes = { file: "src/lib.rs", block: "pub fn goodbye() {}" };
      expect(lines(d)).toEqual([
        'steps[1].beats[3].writes.block: a block in the step\'s target src/lib.rs, found "pub fn goodbye() {}"',
      ]);
    });

    it("reads a block line by line, indentation aside", () => {
      const d = minimal();
      const q = askAt(d, 1, 3);
      q.writes = {
        file: "src/lib.rs",
        block: "pub fn hello(name: String) {\nmsg!(name);",
      };
      expect(lines(d)).toEqual([]);
    });

    it("names a write into a file the target lacks", () => {
      const d = minimal();
      (d.steps[0].beats[0] as WriteBeat).writes = {
        file: "src/other.rs",
        block: "x",
      };
      expect(lines(d)).toEqual([
        'steps[0].beats[0].writes.file: a file in the step\'s target, found "src/other.rs"',
      ]);
    });

    it("rejects a goal naming an instruction no target defines", () => {
      const d = minimal();
      d.steps[1].goal = { kind: "call", instruction: "goodbye" };
      expect(lines(d)).toEqual([
        'steps[1].goal.instruction: an instruction a step\'s target defines, found "goodbye"',
      ]);
    });

    it("rejects a next slug that names no tutorial", () => {
      const d = minimal();
      d.finish.next = "nowhere";
      expect(lines(d)).toEqual([
        'finish.next: the slug of a tutorial, found "nowhere"',
      ]);
    });

    it("names both places of a beat id used twice", () => {
      const d = minimal();
      d.steps[1].beats[0].id = "s1.boil";
      expect(lines(d)).toEqual([
        'steps[1].beats[0].id: an id no other beat has, found "s1.boil", also at steps[0].beats[0].id',
      ]);
    });

    it("rejects a pattern that is not a regular expression", () => {
      const d = minimal();
      d.steps[1].goal = { kind: "call", instruction: "hello", log: "(" };
      expect(lines(d)).toEqual([
        'steps[1].goal.log: a regular expression, found "("',
      ]);
    });

    it("names a missing field", () => {
      const d = minimal() as unknown as { steps: Record<string, unknown>[] };
      delete d.steps[0].title;
      expect(lines(d)).toEqual(['steps[0]: needs "title", found none']);
    });

    it("gives a text of the wrong shape one line", () => {
      const d = minimal() as unknown as { steps: { explain: unknown }[] };
      d.steps[0].explain = 3;
      expect(lines(d)).toEqual([
        "steps[0].explain: a string, or { text, phone }, found 3",
      ]);
    });

    it("names an unknown beat kind on its kind", () => {
      const d = minimal() as unknown as {
        steps: { beats: { kind: string }[] }[];
      };
      d.steps[1].beats[0].kind = "shout";
      expect(lines(d)).toEqual([
        'steps[1].beats[0].kind: one of "say", "write", "ask", "act", found "shout"',
      ]);
    });

    it("names an unknown field", () => {
      const d = minimal() as unknown as Record<string, unknown>;
      d.colour = "red";
      expect(lines(d)).toEqual(['colour: no such field, found "red"']);
    });

    it("writes a file path key in brackets", () => {
      const d = minimal() as unknown as {
        intro: { files: Record<string, unknown> };
      };
      d.intro.files["src/lib.rs"] = 1;
      expect(lines(d)).toEqual([
        'intro.files["src/lib.rs"]: a string, found 1',
      ]);
    });

    it("needs a call for a call act", () => {
      const d = minimal();
      d.steps[0].beats[1] = {
        kind: "act",
        id: "s1.build",
        act: "call",
        title: "Call",
        context: "Sends hello",
        button: "Call",
      } as unknown as Beat;
      expect(lines(d)).toEqual(['steps[0].beats[1]: needs "call", found none']);
    });

    it("needs the name to give the folder's slug", () => {
      expect(checkDefinition(minimal(), KNOWN, "minimal")).toEqual([]);
      expect(
        checkDefinition(minimal(), KNOWN, "other").map(formatError)
      ).toEqual([
        'name: a name whose slug is the folder\'s, "other", found "Minimal"',
      ]);
    });

    it("rejects a call on an act that does not call", () => {
      const d = minimal();
      Object.assign(d.steps[0].beats[1], { call: { instruction: "hello" } });
      expect(lines(d)).toEqual([
        "steps[0].beats[1].call: no call on an act other than `call`, found one",
      ]);
    });

    it("rejects a reason at the right option", () => {
      const d = minimal();
      askAt(d, 1, 3).why[0] = "Right, but why?";
      expect(lines(d)).toEqual([
        'steps[1].beats[3].why[0]: null at the right option, found "Right, but why?"',
      ]);
    });

    /** Step 1 with a planned failure whose beats are given */
    const withPlannedFailure = (d: TutorialDefinition, onFail: Beat[]) => {
      Object.assign(d.steps[0], { planned: "On purpose.", onFail });
      return d;
    };

    it("checks the planned failure's beats like the step's own", () => {
      const fix = ask("f1.fix");
      fix.why[1] = null;
      const d = withPlannedFailure(minimal(), [fix]);
      expect(lines(d)).toEqual([
        "steps[0].onFail[0].why[1]: a wrong option needs a reason, found null",
      ]);
    });

    it("counts an id used in the planned failure and a step's beats", () => {
      const d = withPlannedFailure(minimal(), [ask("s2.q")]);
      expect(lines(d)).toEqual([
        'steps[1].beats[3].id: an id no other beat has, found "s2.q", also at steps[0].onFail[0].id',
      ]);
    });

    it("needs a planned failure's line with its beats", () => {
      const d = minimal();
      Object.assign(d.steps[0], { onFail: [ask("f1.fix")] });
      expect(lines(d)).toEqual(['steps[0]: needs "planned", found none']);
    });

    it("rejects a build goal naming an instruction no target defines", () => {
      const d = minimal();
      d.steps[0].goal = { kind: "build", instructions: ["hello", "goodbye"] };
      expect(lines(d)).toEqual([
        'steps[0].goal.instructions[1]: an instruction a step\'s target defines, found "goodbye"',
      ]);
    });

    it("finds an instruction by its whole name", () => {
      const d = minimal();
      d.steps[1].goal = { kind: "call", instruction: "hell" };
      expect(lines(d)).toEqual([
        'steps[1].goal.instruction: an instruction a step\'s target defines, found "hell"',
      ]);
    });

    it("checks the pattern of every chip and match", () => {
      const d = minimal();
      d.steps[0].chips = [{ label: "A", answer: "a", pattern: "(" }];
      d.steps[0].errorChips = [{ label: "B", answer: "b", pattern: "[" }];
      d.steps[1].matches = [{ pattern: "*", answer: "c" }];
      d.finish.chips = [{ label: "D", answer: "d", pattern: "(?<" }];
      expect(lines(d)).toEqual([
        'steps[0].chips[0].pattern: a regular expression, found "("',
        'steps[0].errorChips[0].pattern: a regular expression, found "["',
        'steps[1].matches[0].pattern: a regular expression, found "*"',
        'finish.chips[0].pattern: a regular expression, found "(?<"',
      ]);
    });

    it("names both places of a step id used twice", () => {
      const d = minimal();
      d.steps[1].id = "program";
      expect(lines(d)).toEqual([
        'steps[1].id: an id no other step has, found "program", also at steps[0].id',
      ]);
    });

    it("names a created file the target lacks", () => {
      const d = minimal();
      (d.steps[0].beats[0] as WriteBeat).writes = {
        create: "client/client.ts",
      };
      expect(lines(d)).toEqual([
        'steps[0].beats[0].writes.create: a file in the step\'s target, found "client/client.ts"',
      ]);
    });

    it("needs a block's lines in a row", () => {
      const d = minimal();
      askAt(d, 1, 3).writes = {
        file: "src/lib.rs",
        block: "use anchor_lang::prelude::*;\nmsg!(name);",
      };
      expect(lines(d)).toEqual([
        'steps[1].beats[3].writes.block: a block in the step\'s target src/lib.rs, found "use anchor_lang::prelude::*;"',
      ]);
    });

    it("counts each schema error", () => {
      const d = minimal() as unknown as Record<string, unknown>;
      d.minutes = 0;
      d.level = "Expert";
      expect(lines(d)).toEqual([
        'level: one of "Beginner", "Intermediate", "Advanced", found "Expert"',
        "minutes: at least 1, found 0",
      ]);
    });
  });
}
