// The design system's registry must install from the repo alone: the shadcn
// CLI resolves a bare dependency name (`button`) against ui.shadcn.com, and
// an undeclared import lands a file that imports a file that never landed.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const DS = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../design-system"
);
const registry = JSON.parse(
  readFileSync(path.join(DS, "registry.json"), "utf8")
);
const NAMESPACE = "@playground/";
const names = new Set(registry.items.map((item) => item.name));

test("every registry dependency is in the playground namespace", () => {
  const bare = registry.items.flatMap((item) =>
    (item.registryDependencies ?? [])
      .filter((dep) => !dep.startsWith(NAMESPACE))
      .map((dep) => `${item.name} -> ${dep}`)
  );
  assert.deepEqual(bare, []);
});

test("every playground dependency names an item", () => {
  const missing = registry.items.flatMap((item) =>
    (item.registryDependencies ?? [])
      .filter((dep) => dep.startsWith(NAMESPACE))
      .filter((dep) => !names.has(dep.slice(NAMESPACE.length)))
      .map((dep) => `${item.name} -> ${dep}`)
  );
  assert.deepEqual(missing, []);
});

test("every component an item imports is declared", () => {
  const undeclared = registry.items.flatMap((item) => {
    const deps = new Set(item.registryDependencies ?? []);
    return (item.files ?? []).flatMap((file) => {
      const source = readFileSync(path.join(DS, file.path), "utf8");
      const imported = Array.from(
        source.matchAll(/from "@\/(?:components\/ui|hooks)\/([a-z0-9-]+)"/g),
        (match) => match[1]
      );
      return imported
        .filter((name) => !deps.has(`${NAMESPACE}${name}`))
        .map((name) => `${item.name} -> ${name}`);
    });
  });
  assert.deepEqual(undeclared, []);
});
