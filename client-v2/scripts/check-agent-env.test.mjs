import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

const script = fileURLToPath(new URL("./check-agent-env.mjs", import.meta.url));

/** Exit code of the check under exactly `env`, nothing inherited */
const exitCode = (env) =>
  spawnSync(process.execPath, [script], { env, encoding: "utf8" }).status;

/** The agent key with every sign-in variable present, empty as a pulled Secret arrives */
const keyWithSignIn = (key) => ({
  AGENT_API_KEY: key,
  DATABASE_URL: "",
  GITHUB_CLIENT_ID: "",
  GITHUB_CLIENT_SECRET: "",
  AUTH_SECRET: "",
});

for (const [label, env, expected] of [
  ["fails when the key is absent", {}, 1],
  ["passes an empty key, as a pulled Secret arrives", keyWithSignIn(""), 0],
  ["passes a key with sign-in", keyWithSignIn("k"), 0],
  [
    "fails a production key without one of sign-in's variables",
    {
      VERCEL_ENV: "production",
      AGENT_API_KEY: "k",
      DATABASE_URL: "",
      GITHUB_CLIENT_ID: "",
      GITHUB_CLIENT_SECRET: "",
    },
    1,
  ],
  // A preview may run without sign-in; GET /api/agent then reports no backend
  [
    "passes a preview key without sign-in",
    { VERCEL_ENV: "preview", AGENT_API_KEY: "k" },
    0,
  ],
]) {
  test(`check-agent-env ${label}`, () => {
    assert.equal(exitCode(env), expected);
  });
}
