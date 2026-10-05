/**
 * Which OpenSpec scenarios have neither a browser test nor a `(manual)` mark.
 *
 * The convention (client-v2/CLAUDE.md, "Scenarios are the test plan"): every
 * `#### Scenario: <name>` in a spec is either a Playwright test in `e2e/`
 * titled `<capability>: <name>`, where `<capability>` is the folder the
 * `spec.md` sits in, or a scenario checked by hand and marked `(manual)` at
 * the end of its heading. This prints every scenario that is neither.
 *
 * Specs are read from `openspec/specs/` (the code as it is) and from every
 * active change under `openspec/changes/` (`archive/` holds changes already
 * merged into `specs/`, so it is skipped). Test titles are read from the
 * source of `e2e/**` by a regex over `test(...)` and its `.only`/`.skip`/
 * `.fixme` forms with a plain string first argument -- not by loading
 * Playwright, which keeps this instant. A title built from a template
 * literal is not seen; the convention is a literal string, so that is the
 * rule, not a gap.
 *
 *   yarn spec:coverage            # report, exit 0
 *   yarn spec:coverage --strict   # exit 1 when a scenario is uncovered
 */
import fs from "fs/promises";
import path from "path";
import { fileURLToPath, pathToFileURL } from "url";

const MANUAL = /\s*\(manual\)\s*$/i;
const SCENARIO = /^####\s+Scenario:\s*(.+?)\s*$/;
const TEST_TITLE =
  /\btest(?:\.(?:only|skip|fixme))?\(\s*(?:"((?:[^"\\]|\\.)*)"|'((?:[^'\\]|\\.)*)')/g;

/** `#### Scenario:` headings of one spec file, with the `(manual)` mark read off */
export const extractScenarios = (markdown, capability, file = "") => {
  const out = [];
  markdown.split("\n").forEach((line, i) => {
    const m = SCENARIO.exec(line);
    if (!m) return;
    const manual = MANUAL.test(m[1]);
    out.push({
      capability,
      name: m[1].replace(MANUAL, ""),
      manual,
      file,
      line: i + 1,
    });
  });
  return out;
};

/** First-argument titles of every `test(` call in a Playwright source file */
export const extractTestTitles = (source) => {
  const titles = [];
  for (const m of source.matchAll(TEST_TITLE)) titles.push(m[1] ?? m[2]);
  return titles;
};

/** Scenarios that are neither tested under their `<capability>: <name>` title nor manual */
export const uncovered = (scenarios, titles) => {
  const have = new Set(titles);
  return scenarios.filter(
    (s) => !s.manual && !have.has(`${s.capability}: ${s.name}`)
  );
};

const walk = async (dir, pick, skip = () => false) => {
  const found = [];
  let entries;
  try {
    entries = await fs.readdir(dir, { withFileTypes: true });
  } catch (e) {
    if (e.code === "ENOENT") return found;
    throw e;
  }
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (!skip(full)) found.push(...(await walk(full, pick, skip)));
    } else if (pick(full)) {
      found.push(full);
    }
  }
  return found;
};

/** Every `spec.md` under `openspec/specs` and the active changes, keyed by capability */
export const readScenarios = async (openspecDir) => {
  const specFiles = [
    ...(await walk(path.join(openspecDir, "specs"), (f) =>
      f.endsWith("spec.md")
    )),
    ...(await walk(
      path.join(openspecDir, "changes"),
      (f) => f.endsWith("spec.md"),
      (d) => path.basename(d) === "archive"
    )),
  ];
  const scenarios = [];
  for (const file of specFiles) {
    const capability = path.basename(path.dirname(file));
    const markdown = await fs.readFile(file, "utf8");
    scenarios.push(
      ...extractScenarios(
        markdown,
        capability,
        path.relative(openspecDir, file)
      )
    );
  }
  return scenarios;
};

export const readTestTitles = async (e2eDir) => {
  const files = await walk(e2eDir, (f) => /\.(spec|e2e)\.ts$/.test(f));
  const titles = [];
  for (const file of files) {
    titles.push(...extractTestTitles(await fs.readFile(file, "utf8")));
  }
  return titles;
};

export const report = (scenarios, titles) => {
  const missing = uncovered(scenarios, titles);
  const manual = scenarios.filter((s) => s.manual).length;
  const tested = scenarios.length - manual - missing.length;
  const lines = [];
  for (const s of missing) {
    lines.push(`  ${s.capability}: ${s.name}    (${s.file}:${s.line})`);
  }
  lines.push(
    `${scenarios.length} scenarios: ${tested} tested, ${manual} manual, ${missing.length} uncovered`
  );
  return { missing, text: lines.join("\n") };
};

const main = async () => {
  const clientDir = path.resolve(fileURLToPath(import.meta.url), "..", "..");
  const openspecDir = path.join(clientDir, "..", "openspec");
  const scenarios = await readScenarios(openspecDir);
  const titles = await readTestTitles(path.join(clientDir, "e2e"));
  const { missing, text } = report(scenarios, titles);
  if (missing.length)
    console.log("Scenarios with neither a test nor a (manual) mark:");
  console.log(text);
  if (missing.length && process.argv.includes("--strict")) process.exit(1);
};

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  await main();
}
