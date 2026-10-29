# Tasks

All tasks belong to [HOO-2385](https://linear.app/solana-fndn/issue/HOO-2385)
and land in one PR (Slava, 29 Oct).

## 1. History and Explorer links

- [x] 1.1 Block explorers take a cluster (design D3); verify with a failing-first test that a devnet record's Explorer URL carries `cluster=devnet` while testnet is picked
- [x] 1.2 The deploy command returns `{ signature, cost, upgraded }` and `PgDeployHistory` stores signature and cost, still reading old records (D2); verify with in-source tests in `deploy-history.ts`
- [x] 1.3 History rows and result card links use the record's cluster and name it ("Explorer (devnet)"); verify with `BaseDeploy` tests and the e2e scenario "client-v2-deploy: A devnet record viewed on testnet" (depends on 1.1, 1.2)
- [x] 1.4 Reword the "Build & Deploy" tab string in `commands/deploy/deploy.ts`; verify by grep

## 2. Run state and panel answers

- [x] 2.1 `PgDeployRun` reports steps and write percent, and takes panel answers (D1); verify with tests of the command's step order and of the failed-build answer skipping `waitForInput`
- [x] 2.2 Panel runs fund without asking and raise `DeployFundingError` on no faucet, signed out or a refused airdrop; verify with tests over a stubbed airdrop (depends on 2.1)
- [x] 2.3 The stage connects or creates the Playground wallet before a panel deploy; verify with a `Deploy` test that no terminal question is asked (depends on 2.1)

## 3. Deploy slice and stage UI

- [x] 3.1 Create `features/deploy` with its prefix, telemetry and public API (D4); verify `slice-structure.test.ts` and `yarn lint` pass
- [x] 3.2 `BaseDeployProgress`, `BaseNotEnoughSol`, `BaseStaleBuildDialog`, `BaseBackupLine` with their tests, ids and labels from the spec (depends on 3.1)
- [x] 3.3 `BaseDeploy` shows the who-pays line, the progress region, the funding card, the result card ("Deployed to" / "Upgraded", cost, short id, Explorer with network) and the backup line; `Deploy` connects them and emits the events; verify with `BaseDeploy`/`Deploy` tests asserting events through the memory provider (depends on 2.x, 3.2)
- [x] 3.4 Backup choice kept per wallet address (D6); verify with an in-source test

## 4. Assistant approvals

- [x] 4.1 `estimateDeployCost()` (D5); verify with tests for first deploy, upgrade and a failed fetch returning `null`
- [x] 4.2 Approval cards carry a question title: "Deploy {program} to {network}? It costs about {cost} SOL." and "Build {program}?"; verify with `BaseApprovalCard` and tools tests (depends on 4.1)

## 5. Integration

- [x] 5.1 `yarn run check` green; before/after screenshots of the Deploy stage and an approval card, desktop and phone, in the PR
