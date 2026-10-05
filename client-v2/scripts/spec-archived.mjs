// Fails when an OpenSpec change has every task ticked but is still active.
// The rule (client-v2/CLAUDE.md, "Specs and changes" step 5) is that the PR
// landing the last task also runs `/opsx:archive`; this is what makes that
// rule a check rather than a reminder. Runs the pinned CLI from the repo.
import { execFileSync } from "node:child_process";

const raw = execFileSync("openspec", ["list", "--json"], {
  encoding: "utf8",
  env: { ...process.env, OPENSPEC_TELEMETRY: "0" },
});
const { changes = [] } = JSON.parse(raw);

const complete = changes.filter(
  (c) => c.totalTasks > 0 && c.completedTasks === c.totalTasks
);

if (complete.length === 0) {
  console.log(
    `spec:archived: ${changes.length} active change(s), none complete`
  );
  process.exit(0);
}

for (const c of complete) {
  console.error(
    `spec:archived: change "${c.name}" has all ${c.totalTasks} tasks ticked ` +
      `but is not archived. Run /opsx:archive ${c.name} in this PR.`
  );
}
process.exit(1);
