# Tasks

## 1. Connect a wallet and deploy from it (HOO-2786)

- [x] 1.1 Return leftover SOL to the connected wallet after any outcome of a deploy from it; verify with
  `yarn test-unit src/commands/deploy` ([plan](plans/1-connect-wallet-deploy.md))
- [x] 1.2 Name the two approvals: `DeployRunState.approval`, `BaseDeployProgress`, the stage's who-pays line;
  verify with `yarn test-unit src/features/deploy src/views/flow/stages`
- [x] 1.3 Connect and disconnect an extension from the wallet chip; verify with
  `yarn test-unit src/features/fund-wallet src/commands/connect`
- [x] 1.4 Count the chip's connect: `fund_wallet_connect_started`, `fund_wallet_connected` (`as`),
  `fund_wallet_connect_failed`, `fund_wallet_disconnected`; verify with `yarn test-unit src/features/fund-wallet`
  (Lead, from Planner's triage of the sx suggestions, 11 Nov)
- [x] 1.5 Hold "Disconnect {wallet}" while a deploy runs; verify with `yarn test-unit src/features/fund-wallet`
- [ ] 1.6 Name the close of a buffer the wallet holds: "Approve in {wallet} to close the buffer"; verify with
  `yarn test-unit src/commands/deploy src/features/deploy`
