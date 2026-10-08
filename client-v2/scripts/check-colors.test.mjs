import assert from "node:assert/strict";
import { test } from "node:test";

import { findColors, isAllowed } from "./check-colors.mjs";

test("finds hex, rgb() and rgba()", () => {
  const text = [
    'const a = "#9945ff";',
    "background: rgb(0 0 0 / 25%);",
    "color: rgba(1, 2, 3, 0.5);",
    "fine: var(--primary);",
  ].join("\n");

  assert.deepEqual(findColors(text), [
    { line: 1, match: "#9945ff" },
    { line: 2, match: "rgb(" },
    { line: 3, match: "rgba(" },
  ]);
});

test("ignores HTML entities", () => {
  assert.deepEqual(findColors("<>&#8592;&#10003;</>"), []);
});

test("allows only the token bridge and the language logos", () => {
  assert.equal(isAllowed("app/styles/playground-tokens.css"), true);
  assert.equal(isAllowed("app/styles/playground-theme.css"), true);
  assert.equal(isAllowed("shared/lib/css-color/css-color.ts"), true);
  assert.equal(isAllowed("shared/lib/css-color/css-color.test.ts"), true);
  assert.equal(isAllowed("languages/python.tsx"), true);
  assert.equal(isAllowed("components/Markdown/Markdown.tsx"), false);
  assert.equal(isAllowed("views/sidebar/icons/build.svg"), false);
  assert.equal(isAllowed("app/styles/other.css"), false);
});
