# Tasks

## 1. Rename

- [ ] 1.1 `agentEnv` reads `PG_AI_*` with the deprecated `AGENT_*` fallback,
      `check-agent-env` accepts either key, and `.env.example`, the docs, code
      comments, tests and the open change `default-backend-cost-gate` use the
      new names, per the `assistant-server-env` spec. Verify with
      `yarn test-api` (the spec's scenarios) and `yarn run check`
      (HOO-1744; no dependencies). Plan: [plans/1.1-rename.md](plans/1.1-rename.md)
