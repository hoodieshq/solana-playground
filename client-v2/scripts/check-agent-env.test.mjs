import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

const script = fileURLToPath(new URL("./check-agent-env.mjs", import.meta.url));

/** Exit code of the check under exactly `env`, nothing inherited */
const exitCode = (env) =>
  spawnSync(process.execPath, [script], { env, encoding: "utf8" }).status;

for (const [label, env, expected] of [
  ["fails when the key is absent", {}, 1],
  ["passes an empty key, as a pulled Secret arrives", { AGENT_API_KEY: "" }, 0],
  ["passes a key", { AGENT_API_KEY: "k" }, 0],
]) {
  test(`check-agent-env ${label}`, () => {
    assert.equal(exitCode(env), expected);
  });
}
