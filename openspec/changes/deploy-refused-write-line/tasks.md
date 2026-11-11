# Tasks

## 1. The refused-write line (`client-v2-deploy`)

- [x] 1.1 Report the first refused write of each round, other than a rate limit, through a `loadBuffer` `onRefusal`
  option with the cluster's message (`transactionMessage`, else the error's first line); verify with the
  `onRefusal` cases in `yarn test-unit src/commands/deploy/bpf-loader-upgradeable.pacing.test.ts` (HOO-2797)
- [x] 1.2 Print the line from `refused-write.ts` in the terminal for the terminal and stage deploy (`deploy.ts`) and the
  tutorial deploy (`real-deploy.ts`); depends on 1.1; verify with `yarn test-unit src/commands/deploy/deploy.test.ts`
  and `real-deploy.write-buffer.test.ts` (HOO-2797)
