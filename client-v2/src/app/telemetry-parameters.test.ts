import { existsSync, readdirSync, readFileSync } from "fs";
import { dirname, join, relative } from "path";
import ts from "typescript";
import { beforeAll, describe, expect, it } from "vitest";

const SRC = join(__dirname, "..");
const DOC = join(SRC, "..", "docs", "telemetry-parameters.md");

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

/**
 * Every `.ts` and `.tsx` file under `src` that calls `createTracker<`, so a
 * tracker in a legacy root cannot escape. `shared/lib/telemetry` is left out on
 * purpose: `tracker.ts` and its tests hold in-source maps that are not events.
 */
const trackerFiles = (): string[] =>
  filesUnder(SRC).filter(
    (file) =>
      /\.tsx?$/.test(file) &&
      !/\.test\./.test(file) &&
      !relative(SRC, file).startsWith(join("shared", "lib", "telemetry")) &&
      /createTracker</.test(readFileSync(file, "utf8"))
  );

const FILES = trackerFiles();

/** The compiler's view of the app, so a parameter typed by an imported alias resolves */
const createProgram = (files: string[]) => {
  const configPath = join(SRC, "..", "tsconfig.json");
  const config = ts.readConfigFile(configPath, ts.sys.readFile);
  const parsed = ts.parseJsonConfigFileContent(
    config.config,
    ts.sys,
    dirname(configPath)
  );
  // The ambient declarations (`FrameworkName` and the like) are imported by nobody
  const ambient = parsed.fileNames.filter((file) => file.endsWith(".d.ts"));
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
  throw new Error(`type flags ${String(type.flags)} are not a primitive`);
};

/**
 * Every parameter name under the trackers: name -> one usage per event that
 * sends it, with the type that event declares. An event whose parameters are a
 * union sends the parameters of every branch.
 */
const collectUsages = (files: string[]): Map<string, Usage[]> => {
  const program = createProgram(files);
  const checker = program.getTypeChecker();
  const found = new Map<string, Usage[]>();
  for (const file of files) {
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
          const branches = params.isUnion() ? params.types : [params];
          // `NoParams` has no properties
          const kinds = new Map<string, Set<Kind>>();
          for (const param of branches.flatMap((branch) =>
            branch.getProperties()
          )) {
            let spelled: Kind[];
            try {
              spelled = kindsOf(checker.getTypeOfSymbol(param));
            } catch (error) {
              throw new Error(
                `${event.name}.${param.name} in ${relative(
                  SRC,
                  file
                )}: ${String(error)}; did its alias resolve?`
              );
            }
            const seen = kinds.get(param.name) ?? new Set<Kind>();
            spelled.forEach((kind) => seen.add(kind));
            kinds.set(param.name, seen);
          }
          kinds.forEach((seen, name) => {
            const usage: Usage = {
              event: event.name,
              type: Array.from(seen).sort().join("|"),
            };
            found.set(name, (found.get(name) ?? []).concat(usage));
          });
        }
      }
      ts.forEachChild(node, visit);
    };
    visit(source);
  }
  return found;
};

/** The kinds a name is declared with across its usages, sorted; callers join them with `/` */
const kindsOfName = (usages: Usage[]) =>
  Array.from(new Set(usages.flatMap(({ type }) => type.split("|")))).sort();

/**
 * Numeric parameters that are categories, not quantities: they register as
 * dimensions, because GA4 sums or averages a metric. The tutorial step index
 * joins when `step` is renamed (HOO-2752).
 */
const NUMERIC_CATEGORIES = ["status"];

/** What GA4 registers a name as, from its usages */
const kindOfName = (name: string, usages: Usage[]) => {
  const kinds = kindsOfName(usages);
  if (kinds.length > 1) return "conflict";
  if (kinds[0] === "number" && !NUMERIC_CATEGORIES.includes(name)) {
    return "metric";
  }
  return "dimension";
};

type Row = { type: string; kind: string; events: string[] };

/**
 * The rows of the document's `| Parameter |` table: name -> its type, kind and
 * events (sorted). A name listed twice fails.
 */
const documentedRows = (): Map<string, Row> => {
  const lines = readFileSync(DOC, "utf8").split("\n");
  const start = lines.findIndex((line) => line.startsWith("| Parameter |"));
  if (start === -1) throw new Error("the table has no `| Parameter |` header");
  const rows = new Map<string, Row>();
  for (const line of lines.slice(start + 2)) {
    if (!line.startsWith("|")) break;
    const cells = line.split("|").slice(1, -1);
    const name = cells[0].trim().replace(/`/g, "");
    if (rows.has(name)) throw new Error(`${name} is listed twice`);
    rows.set(name, {
      type: cells[1].trim(),
      kind: cells[2].trim().replace(/ \(.*\)$/, ""),
      events: Array.from(cells[4].matchAll(/`([^`]+)`/g))
        .map((event) => event[1])
        .sort(),
    });
  }
  return rows;
};

/**
 * Names that carry two types today, each with why it stays. GA4 registers a
 * name once, so each is a defect awaiting its fix, and an entry leaves this
 * list in the change that fixes it: the test fails on an entry that no longer
 * conflicts. Every event of each conflict, both halves, is on `master`
 * already, so renaming one cuts its GA4 history. HOO-2752 asks for the
 * renames; this change defers them for that reason, and the ticket's rename
 * item stays open.
 */
const KNOWN_CONFLICTS: Record<string, string> = {
  from: "`tutorial_step_jumped` sends the step number; 14 events send the trigger",
  rating: "`feedback_sent` sends a star count, or the text `none`",
  step: "the `tutorial_*` events send the step number; `deploy_failed` and `cli_command_copied` send a step name",
};

// The trigger synonyms `via`, `from` and `source` are not checked against each
// other: which one stays is HOO-2752's open product decision. (`from` is also a
// known conflict above, for its own two types.)
describe("telemetry parameters", () => {
  let parameters = new Map<string, Usage[]>();

  // Building the program takes seconds, so a failure reports once, not per test
  beforeAll(() => {
    parameters = collectUsages(FILES);
  }, 120_000);

  // These floors guard a scan that finds nothing without failing when the scan
  // breaks or a tracker's type stops resolving: today 34 files and 80 names.
  it("finds the parameters of every tracker", () => {
    expect(FILES.length).toBeGreaterThan(25);
    expect(parameters.size).toBeGreaterThan(50);
  });

  it("gives every parameter name one type, except the listed conflicts", () => {
    const conflicts = Array.from(parameters)
      .filter(([, usages]) => kindsOfName(usages).length > 1)
      .map(
        ([name, usages]) =>
          `${name}: ${usages
            .map(({ event, type }) => `${event}=${type}`)
            .join(", ")}`
      );
    const known = Object.keys(KNOWN_CONFLICTS);
    expect(
      conflicts.filter((line) => !known.includes(line.split(":")[0]))
    ).toEqual([]);
    expect(
      known.filter(
        (name) => !conflicts.some((line) => line.startsWith(`${name}:`))
      )
    ).toEqual([]);
  });

  it("writes every parameter name in snake_case", () => {
    const misspelled = Array.from(parameters.keys()).filter(
      (name) => !/^[a-z][a-z0-9]*(_[a-z0-9]+)*$/.test(name)
    );
    expect(misspelled).toEqual([]);
  });

  it("lists every parameter name in docs/telemetry-parameters.md and no other", () => {
    expect(Array.from(documentedRows().keys()).sort()).toEqual(
      Array.from(parameters.keys()).sort()
    );
  });

  it("states each parameter's type and kind in docs/telemetry-parameters.md", () => {
    const documented = documentedRows();
    const wrong = Array.from(parameters)
      .map(([name, usages]) => ({
        name,
        type: kindsOfName(usages).join("/"),
        kind: kindOfName(name, usages),
      }))
      .filter(
        ({ name, type, kind }) =>
          documented.get(name)?.type !== type ||
          documented.get(name)?.kind !== kind
      )
      .map(({ name, type, kind }) => `${name}: ${type}, ${kind}`);
    expect(wrong).toEqual([]);
  });

  it("lists in docs/telemetry-parameters.md the events that send each parameter", () => {
    const documented = documentedRows();
    const wrong = Array.from(parameters)
      .filter(
        ([name, usages]) =>
          documented.get(name)?.events.join(",") !==
          usages
            .map(({ event }) => event)
            .sort()
            .join(",")
      )
      .map(([name]) => name);
    expect(wrong).toEqual([]);
  });
});
