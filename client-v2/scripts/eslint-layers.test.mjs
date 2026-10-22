import assert from "node:assert/strict";
import path from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

import { ESLint } from "eslint";

const cwd = path.dirname(path.dirname(fileURLToPath(import.meta.url)));

/**
 * The layer rule's messages for `code` linted with `package.json`
 * `eslintConfig`, which `yarn lint` and `yarn lint:layers` both read, as if
 * it lived at `file`. The file does not exist, but it sits in a real slice,
 * so its imports resolve to real files the way they would in the code; an
 * import that resolves to nothing is not checked, so a broken resolver shows
 * here as violations that pass.
 */
const layerErrors = async (file, code) => {
  const eslint = new ESLint({ cwd });
  const [result] = await eslint.lintText(code, { filePath: file });
  return result.messages.filter((m) => m.ruleId === "boundaries/dependencies");
};

const VIOLATIONS = [
  {
    name: "a widget importing a widget by a relative path",
    file: "src/widgets/assistant/ui/Probe.tsx",
    code: 'import { ModalHost } from "../../overlays";\nModalHost;\n',
    message: /widgets\/overlays is not allowed here/,
  },
  {
    name: "a feature importing a feature",
    file: "src/features/agent/model/probe.ts",
    code: 'import * as feedback from "@/features/feedback";\nfeedback;\n',
    message: /features\/feedback is not allowed here/,
  },
  {
    name: "shared importing a feature",
    file: "src/shared/lib/probe.ts",
    code: 'import * as feedback from "@/features/feedback";\nfeedback;\n',
    message: /shared may import only the layers below it/,
  },
  {
    name: "a deep import past a slice's public entry",
    file: "src/widgets/home/ui/Probe.tsx",
    code: 'import * as context from "@/features/feedback/model/context";\ncontext;\n',
    message: /through its public entry/,
  },
];

const ALLOWED = [
  {
    name: "the recorded exception, auth importing persistence",
    file: "src/features/auth/model/probe.ts",
    code: 'import * as persistence from "../../persistence";\npersistence;\n',
  },
  {
    name: "the recorded exception, persistence importing auth",
    file: "src/features/persistence/model/probe.ts",
    code: 'import * as auth from "../../auth";\nauth;\n',
  },
  {
    name: "a widget importing a feature and shared through their entries",
    file: "src/widgets/home/ui/Probe.tsx",
    code: 'import * as feedback from "@/features/feedback";\nimport { uuid } from "@/shared/lib/ids";\nfeedback;\nuuid;\n',
  },
  {
    name: "a slice importing a path inside itself",
    file: "src/widgets/home/ui/Probe.tsx",
    code: 'import * as telemetry from "../model/telemetry";\ntelemetry;\n',
  },
  {
    name: "a legacy root importing a path inside a slice",
    file: "src/components/Probe.tsx",
    code: 'import * as context from "@/features/feedback/model/context";\ncontext;\n',
  },
];

describe("eslint-layers.js", () => {
  for (const { name, file, code, message } of VIOLATIONS) {
    it(`fails ${name}`, async () => {
      const errors = await layerErrors(file, code);
      assert.equal(errors.length, 1, JSON.stringify(errors));
      assert.equal(errors[0].severity, 2);
      assert.match(errors[0].message, message);
    });
  }

  for (const { name, file, code } of ALLOWED) {
    it(`allows ${name}`, async () => {
      assert.deepEqual(await layerErrors(file, code), []);
    });
  }
});
