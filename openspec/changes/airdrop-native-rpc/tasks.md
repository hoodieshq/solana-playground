## 1. Airdrop routing (HOO-2798)

- [x] 1.1 Request and confirm every airdrop through `PgConnection.getAirdropConnection`, read the `airdrop` command's
  balances there, keep the tutorial's funding check on the selected RPC, and name the env URL the cluster's native
  RPC; verify with `yarn test-unit src/commands/airdrop/airdrop-run.test.ts
  src/features/tutorial-conversation/model/runners/real-deploy.test.ts src/utils/connection.read-buffer.test.ts`
