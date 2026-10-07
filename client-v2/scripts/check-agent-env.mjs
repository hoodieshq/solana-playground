// Fails a Vercel build that has no AGENT_API_KEY, so a deployment cannot ship
// with the assistant's default backend off. Only vercel.json's buildCommand
// runs it: local, CI and e2e builds have no key and need none.
const key = process.env.AGENT_API_KEY;

if (key === undefined) {
  console.error(
    "check-agent-env: AGENT_API_KEY is unset. Set it in the Vercel project " +
      "environment, or the assistant backend ships disabled."
  );
  process.exit(1);
}

// A local `vercel build` pulls a Secret variable as an empty value; the
// deployment still receives the real one at runtime
if (!key) {
  console.log(
    "check-agent-env: AGENT_API_KEY is set but empty here, as a pulled " +
      "Secret is; the deployment reads its value at runtime."
  );
}
