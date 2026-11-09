import { existsSync, readdirSync, readFileSync } from "fs";
import { dirname, join } from "path";
import ts from "typescript";
import { describe, expect, it } from "vitest";

const SRC = join(__dirname, "..");
const DOC = join(SRC, "..", "docs", "telemetry-parameters.md");

/** Folders whose `createTracker` maps GA4 sees; `utils/explorer` sends `explorer_*` */
const ROOTS = ["features", "widgets", "entities", join("utils", "explorer")];

type Kind = "string" | "number" | "boolean";

/** `type` is the kinds a parameter spells out, joined by `|` when one member mixes them */
type Usage = { event: string; type: string };

const filesUnder = (dir: string): string[] =>
  existsSync(dir)
    ? readdirSync(dir, { withFileTypes: true }).flatMap((entry) =>
        entry.isDirectory()
          ? filesUnder(join(dir, entry.name))
          : [join(dir, entry.name)]
      )
    : [];

/** Telemetry files that declare a tracker, relative to nothing: absolute paths */
const trackerFiles = () =>
  ROOTS.flatMap((root) => filesUnder(join(SRC, root))).filter(
    (file) =>
      /\.ts$/.test(file) &&
      !/\.test\./.test(file) &&
      /createTracker</.test(readFileSync(file, "utf8"))
  );

/** The compiler's view of the app, so a parameter typed by an imported alias resolves */
const createProgram = (files: string[]) => {
  const configPath = join(SRC, "..", "tsconfig.json");
  const config = ts.readConfigFile(configPath, ts.sys.readFile);
  const parsed = ts.parseJsonConfigFileContent(
    config.config,
    ts.sys,
    dirname(configPath)
  );
  // The ambient declarations (`FrameworkName` and the like) are not imported by anyone
  const ambient = filesUnder(join(SRC, "types")).filter((file) =>
    file.endsWith(".d.ts")
  );
  return ts.createProgram(files.concat(ambient), parsed.options);
};

/** The kinds a type spells out: a union of string literals is `string` */
const kindsOf = (type: ts.Type): Kind[] => {
  if (type.isUnion()) return type.types.flatMap(kindsOf);
  if (type.flags & (ts.TypeFlags.String | ts.TypeFlags.StringLiteral)) {
    return ["string"];
  }
  if (type.flags & (ts.TypeFlags.Number | ts.TypeFlags.NumberLiteral)) {
    return ["number"];
  }
  if (type.flags & (ts.TypeFlags.Boolean | ts.TypeFlags.BooleanLiteral)) {
    return ["boolean"];
  }
  // `undefined` from an optional member is not a second type
  if (type.flags & ts.TypeFlags.Undefined) return [];
  throw new Error(
    `a parameter has a type that is not a string, number or boolean (flags ${String(
      type.flags
    )}); did its alias resolve?`
  );
};

/** The parameters of the program's `createTracker` maps: name -> one usage per event */
const collectUsages = (): Map<string, Usage[]> => {
  const program = createProgram(trackerFiles());
  const checker = program.getTypeChecker();
  const found = new Map<string, Usage[]>();
  for (const file of trackerFiles()) {
    const source = program.getSourceFile(file);
    if (!source) throw new Error(`${file} is not in the program`);
    const visit = (node: ts.Node) => {
      if (
        ts.isCallExpression(node) &&
        ts.isIdentifier(node.expression) &&
        node.expression.text === "createTracker" &&
        node.typeArguments?.[0]
      ) {
        const map = checker.getTypeFromTypeNode(node.typeArguments[0]);
        for (const event of map.getProperties()) {
          const params = checker.getTypeOfSymbol(event);
          // `NoParams` has no properties
          for (const param of params.getProperties()) {
            const type = Array.from(
              new Set(kindsOf(checker.getTypeOfSymbol(param)))
            )
              .sort()
              .join("|");
            const usage: Usage = { event: event.name, type };
            found.set(param.name, (found.get(param.name) ?? []).concat(usage));
          }
        }
      }
      ts.forEachChild(node, visit);
    };
    visit(source);
  }
  return found;
};

/** Every parameter name under the trackers: name -> the events that send it, with the type each declares */
export const collectParameters = collectUsages;

/** The kinds a name is declared with across its usages, sorted and joined by `/` */
const kindsOfName = (usages: Usage[]) =>
  Array.from(new Set(usages.flatMap(({ type }) => type.split("|")))).sort();

/** The document's table rows: name -> the type column */
const documentedTypes = (): Map<string, string> =>
  new Map(
    Array.from(
      readFileSync(DOC, "utf8").matchAll(/^\| `([^`]+)` \| ([^|]+?) \|/gm)
    ).map((match) => [match[1], match[2]])
  );

/**
 * Names that carry two types today, each with why it stays. GA4 registers a
 * name once, so each is a defect awaiting its fix, and an entry leaves this
 * list in the change that fixes it: the test fails on an entry that no longer
 * conflicts. The tutorial events (`step`, `from`) and `feedback_sent.rating`
 * are on `master` already, so renaming them forfeits their GA4 history, which
 * is HOO-2752's open decision.
 */
const KNOWN_CONFLICTS: Record<string, string> = {
  from: "`tutorial_step_jumped` sends the step number; 14 events send the trigger",
  rating: "`feedback_sent` sends a star count, or the text `none`",
  step: "the `tutorial_*` events send the step number; `deploy_failed` and `cli_command_copied` send a stage name",
};

// The trigger synonyms `via`, `from` and `source` are not checked against each
// other: HOO-2752 leaves open which one stays, and each has one meaning of its
// own type until then.
describe("telemetry parameters", () => {
  const parameters = collectParameters();

  it("finds the parameters of every tracker", () => {
    expect(trackerFiles().length).toBeGreaterThan(25);
    expect(parameters.size).toBeGreaterThan(50);
  });

  it("gives every parameter name one type, except the listed conflicts", () => {
    const conflicts = Array.from(parameters)
      .filter(([, usages]) => kindsOfName(usages).length > 1)
      .map(([name]) => name);
    expect(conflicts.sort()).toEqual(Object.keys(KNOWN_CONFLICTS).sort());
  });

  it("writes every parameter name in snake_case", () => {
    const misspelled = Array.from(parameters.keys()).filter(
      (name) => !/^[a-z][a-z0-9]*(_[a-z0-9]+)*$/.test(name)
    );
    expect(misspelled).toEqual([]);
  });

  it("lists every parameter name in docs/telemetry-parameters.md and no other", () => {
    expect(Array.from(documentedTypes().keys()).sort()).toEqual(
      Array.from(parameters.keys()).sort()
    );
  });

  it("states each parameter's type in docs/telemetry-parameters.md", () => {
    const documented = documentedTypes();
    const wrong = Array.from(parameters)
      .filter(
        ([name, usages]) =>
          documented.get(name) !== kindsOfName(usages).join("/")
      )
      .map(([name, usages]) => `${name}: ${kindsOfName(usages).join("/")}`);
    expect(wrong).toEqual([]);
  });
});
