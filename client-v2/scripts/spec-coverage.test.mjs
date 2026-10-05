import assert from "node:assert/strict";
import { describe, it } from "node:test";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import {
  extractScenarios,
  extractTestTitles,
  readScenarios,
  report,
  uncovered,
} from "./spec-coverage.mjs";

const SPEC = `# Themes

## Requirements

### Requirement: A theme survives a reload
Text.

#### Scenario: A saved Dracula theme
- WHEN the page reloads
- THEN the theme is Dracula

#### Scenario: Switching with the keyboard (manual)
- WHEN ...

#### Scenario:   Trailing spaces are trimmed   
`;

describe("extractScenarios", () => {
  it("reads the name, the (manual) mark and the line", () => {
    const got = extractScenarios(SPEC, "client-v2-themes", "x/spec.md");
    assert.deepEqual(
      got.map((s) => [s.name, s.manual, s.line]),
      [
        ["A saved Dracula theme", false, 8],
        ["Switching with the keyboard", true, 12],
        ["Trailing spaces are trimmed", false, 15],
      ]
    );
    assert.equal(got[0].capability, "client-v2-themes");
    assert.equal(got[0].file, "x/spec.md");
  });
});

describe("extractTestTitles", () => {
  it("takes the first string argument of test(), .only, .skip and .fixme", () => {
    const src = `
      test("client-v2-themes: A saved Dracula theme", async ({ page }) => {});
      test.skip('quoted "inside"', () => {});
      test.fixme("later", () => {});
      test.only("just this", () => {});
      test.describe("a group", () => {});
      const title = "not a test";
    `;
    assert.deepEqual(extractTestTitles(src), [
      "client-v2-themes: A saved Dracula theme",
      'quoted "inside"',
      "later",
      "just this",
    ]);
  });

  it("does not see a template-literal title, by design", () => {
    assert.deepEqual(extractTestTitles("test(`dynamic ${x}`, () => {});"), []);
  });
});

describe("uncovered", () => {
  it("is every non-manual scenario without a `<capability>: <name>` title", () => {
    const scenarios = extractScenarios(SPEC, "client-v2-themes");
    const got = uncovered(scenarios, [
      "client-v2-themes: A saved Dracula theme",
    ]);
    assert.deepEqual(
      got.map((s) => s.name),
      ["Trailing spaces are trimmed"]
    );
  });

  it("does not accept the name under another capability", () => {
    const scenarios = extractScenarios(SPEC, "client-v2-themes");
    const got = uncovered(scenarios, [
      "client-v2-layers: A saved Dracula theme",
    ]);
    assert.equal(got.length, 2);
  });
});

describe("readScenarios", () => {
  it("walks specs/ and active changes, and skips changes/archive", async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "spec-coverage-"));
    const write = async (rel, text) => {
      const full = path.join(root, rel);
      await fs.mkdir(path.dirname(full), { recursive: true });
      await fs.writeFile(full, text);
    };
    await write("specs/client-v2-themes/spec.md", "#### Scenario: Live\n");
    await write(
      "changes/ui-migration/specs/client-v2-layers/spec.md",
      "#### Scenario: Proposed\n"
    );
    await write(
      "changes/archive/2026-01-01-old/specs/client-v2-themes/spec.md",
      "#### Scenario: Archived\n"
    );
    await write(
      "changes/ui-migration/proposal.md",
      "#### Scenario: Not a spec\n"
    );
    const got = await readScenarios(root);
    assert.deepEqual(got.map((s) => `${s.capability}: ${s.name}`).sort(), [
      "client-v2-layers: Proposed",
      "client-v2-themes: Live",
    ]);
    assert.equal(
      got.find((s) => s.name === "Live").file,
      "specs/client-v2-themes/spec.md"
    );
  });

  it("returns nothing for an openspec dir that does not exist", async () => {
    assert.deepEqual(
      await readScenarios(path.join(os.tmpdir(), "no-such-openspec")),
      []
    );
  });
});

describe("report", () => {
  it("lists each uncovered scenario with its location and sums the rest", () => {
    const scenarios = extractScenarios(
      SPEC,
      "client-v2-themes",
      "specs/t/spec.md"
    );
    const { missing, text } = report(scenarios, [
      "client-v2-themes: A saved Dracula theme",
    ]);
    assert.equal(missing.length, 1);
    assert.match(
      text,
      /client-v2-themes: Trailing spaces are trimmed\s+\(specs\/t\/spec\.md:15\)/
    );
    assert.match(text, /3 scenarios: 1 tested, 1 manual, 1 uncovered$/);
  });
});
