// The webfonts arrive through an `@import` that a browser honours only ahead of every other rule
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import test from "node:test";

const CSS = path.join(import.meta.dirname, "..", "build", "static", "css");

/** The families `--font-headline` and `--font-text` name, at the weights the design system loads */
const FAMILIES = [
  "Stack+Sans+Headline:wght@400..700",
  "Stack+Sans+Text:wght@300..700",
];

/** The `@import` statements a browser applies: those before the first other rule */
const leadingImports = (css) => {
  const imports = [];
  let rest = css.replace(/^@charset "[^"]*";/, "");
  for (;;) {
    rest = rest.replace(/^(\s|\/\*[\s\S]*?\*\/)+/, "");
    const match = /^@import\s+[^;]+;/.exec(rest);
    if (!match) return imports;
    imports.push(match[0]);
    rest = rest.slice(match[0].length);
  }
};

test("the main stylesheet imports the Stack Sans webfonts first", async () => {
  const names = (await fs.readdir(CSS)).filter((name) =>
    /^main\..*\.css$/.test(name)
  );
  assert.equal(
    names.length,
    1,
    `expected one main.*.css under ${CSS}, found ${names.length}`
  );

  const imports = leadingImports(
    await fs.readFile(path.join(CSS, names[0]), "utf8")
  ).join("\n");
  for (const family of FAMILIES) {
    assert.ok(
      imports.includes(`family=${family}`),
      `${
        names[0]
      } does not import ${family} ahead of its rules, so the page renders in the fallback font (src/index.css). Leading imports:\n${
        imports || "(none)"
      }`
    );
  }
});
