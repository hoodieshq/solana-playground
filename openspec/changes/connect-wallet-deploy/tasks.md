# Tasks

## 1. Connect a wallet and deploy from it (HOO-2786)

- [x] 1.1 Return leftover SOL to the connected wallet after any outcome of a deploy from it; verify with
  `yarn test-unit src/commands/deploy` ([plan](plans/1-connect-wallet-deploy.md))
- [x] 1.2 Name the two approvals: `DeployRunState.approval`, `BaseDeployProgress`, the stage's who-pays line;
  verify with `yarn test-unit src/features/deploy src/views/flow/stages`
- [ ] 1.3 Connect and disconnect an extension from the wallet chip; verify with
  `yarn test-unit src/features/fund-wallet src/commands/connect`
