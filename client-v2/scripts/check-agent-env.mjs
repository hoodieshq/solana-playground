// Fails a Vercel build that has no AGENT_API_KEY, so a deployment cannot ship
// with the assistant's default backend off, and a production build that has
// the key without sign-in, where /api/agent would refuse every turn. A preview
// may run without sign-in: GET /api/agent then reports no backend. Only
// vercel.json's buildCommand runs it: local, CI and e2e builds need no key.
// The constants file, not `server.mjs`: that one loads Better Auth and the pool
import { SIGN_IN_ENV } from "../src/features/auth/config.mjs";

const key = process.env.AGENT_API_KEY;

if (key === undefined) {
  console.error(
    "check-agent-env: AGENT_API_KEY is unset. Set it in the Vercel project " +
      "environment, or the assistant backend ships disabled."
  );
  process.exit(1);
}

// Presence only: a pulled Secret arrives empty, like the key below
const missing = SIGN_IN_ENV.filter((name) => process.env[name] === undefined);
if (missing.length) {
  const message =
    `check-agent-env: AGENT_API_KEY is set but sign-in is not: ${missing.join(
      ", "
    )} unset. /api/agent answers only signed-in users, so this deployment ` +
    "serves no default backend.";
  if (process.env.VERCEL_ENV === "production") {
    console.error(message);
    process.exit(1);
  }
  console.warn(message);
}

// A local `vercel build` pulls a Secret variable as an empty value; the
// deployment still receives the real one at runtime
if (!key) {
  console.log(
    "check-agent-env: AGENT_API_KEY is set but empty here, as a pulled " +
      "Secret is; the deployment reads its value at runtime."
  );
}
