# Slack: open a PR taking new-face into master, mindful of PR #31 (2026-10-20)

**Source:** Slack, to Slava, 2026-10-20 (author not in the paste; presumably
Sergey Prokhorov, who owns PR #31). Raw:
`solana-playground/.claude/intake/raw/2026-10-20-slack-new-face-to-master.md`
(local). Read alongside: memory `face-done-at-new-face-merge` (Face tickets
count as delivered to the customer only once new-face lands).

**Decided**

- new-face goes to master through a PR that Slava opens. (Request.)

**Requirements changed**

- The new-face → master PR has to account for solana-foundation PR #31.

**Facts learned** (gh and git, read 2026-10-20 11:26)

- PR #31 "fix: resolve critical and high Dependabot alerts in client-v2,
  client, and design-system" (Sergey, `fix/dependabot-critical-high` →
  `master`), open, mergeable, 17 files, +2478 −2128. It is HOO-2158 in Linear
  (In Review, size S).
- PR #31 also touches the production minifier: `client-v2/scripts/
  esbuild-minify.mjs`, `top-level-declaration.mjs` and its test,
  `chunk-scope.build-test.mjs`, `craco.config.js`. That is the ground of
  HOO-2117 "esbuild helpers leak as globals across chunks" (In Review, ours).
- 11 of its files are also changed on new-face: `client-v2.yml`,
  `CLAUDE.md`, `craco.config.js`, `deploy-client-vercel.md`,
  `client-v2/package.json`, `vercel-install.sh`, `decorators/common.ts`,
  `client-v2/yarn.lock`, `client/package.json`, `design-system/package-lock.json`,
  `docs/testing.md`. The lockfiles and `package.json` will conflict.
- new-face is 75 commits ahead of and 41 behind solana-foundation `master`.
  hoodieshq `master` is 2 commits behind solana-foundation `master`.
- No PR from new-face exists yet.
- Both sides touch `CLAUDE.md`; the fork rule is that CLAUDE.md is not
  re-committed on PR branches.

**Open questions**

- Order: merge PR #31 first and bring master into new-face, or merge new-face
  first and rebase #31 on it? (Merging #31 first keeps its security fix
  independent; then new-face takes the conflicts once.)
- Which master: solana-foundation `master` (where #31 targets) — confirm the
  PR goes there, not to hoodieshq `master` or `master-2.0`.
- Is new-face ready to ship as a whole? 10 PRs into it are open on
  hoodieshq: #92 Home, #100 Lesson, #102 chat thread overwrite (HOO-2109),
  #103 ResizeObserver notice (HOO-2125), #104 failed-click message
  (HOO-2100), #105 Files column state (HOO-2124), #108 Get set up checklist
  (HOO-2075), #109 assistant thread (HOO-1794), #111 sx review rule, #84
  local e2e queue. Do they land first, or go in a later PR?

**Actions** (to Lead on Slava's word, 2026-10-20 17:40; the open questions go
with them)

1. Open a work session for the new-face → master PR (ticket, branch, merge
   master into new-face resolving against #31, CI green, sx review, PR with
   reviewers). — lead 2026-10-20-new-face-to-master-pr
2. Agree the order with Sergey: #31 first, then master into new-face.
   — lead 2026-10-20-new-face-to-master-pr
3. Tell the HOO-2117 session (production minifier globals) that #31 touches
   the same scripts. — lead: done, HOO-2117 session told
