# Tasks

Groups 1 to 4 touch separate files and may run at the same time; inside group 1, 1.4 to 1.6 follow 1.1 to 1.3.

## 1. Buffer writes and reads (`client-v2-deploy`)

- [x] 1.1 Pace buffer writes in `BpfLoaderUpgradeable.loadBuffer` and cap them by
  `REACT_APP_*_SEND_TX_PER_SECOND` per cluster; verify with `yarn test-unit src/commands/deploy` (HOO-2362)
- [x] 1.2 Fail a load after `MAX_STALLED_ROUNDS` rounds that land no chunk, and offer the terminal deploy's reclaim
  question; verify with `yarn test-unit src/commands/deploy` (HOO-2362)
- [x] 1.3 Read buffer accounts through `PgConnection.getReadBufferConnection` on all three deploy paths, from
  `REACT_APP_*_READ_BUFFER_RPC_URL`; verify with `yarn test-unit src/utils/connection.read-buffer.test.ts` (HOO-2362)
- [ ] 1.4 Close the buffer without a terminal question when the Deploy stage started the deploy
  (`PgDeployRun.answers`); verify with a `deploy.test.ts` case that asserts no `waitForInput` and a closed buffer
  (HOO-2362)
- [ ] 1.5 Bound the read-buffer read in `loadUntilWritten`, log its first failure with the endpoint, and fail with an
  error that names the read-buffer RPC; verify with a `bpf-loader-upgradeable.test.ts` case on an RPC that never
  answers (ticket to file)
- [ ] 1.6 Guard the read-buffer wiring with a distinct buffer connection per deploy path and a wiring test for
  `realDeployPort().writeBuffer`; verify that reverting one `getAccountInfo` to the selected connection fails a test
  (ticket to file)

## 2. Stop and the console strip (`client-v2-command-stop`)

- [ ] 2.1 Show Stop for a build and hide it for a deploy in `BaseConsoleDrawer`, with Clear turned off beside Stop;
  verify by taking the three `client-v2-command-stop` build scenarios out of `e2e/known-skips.txt` and running
  `yarn test-e2e e2e/client-v2-command-stop.e2e.spec.ts` (HOO-2362)
- [ ] 2.2 Single-quote the read-buffer URL in `closeBuffersCommandFor`; verify with `yarn test-unit
  src/commands/deploy/stopped.test.ts` (HOO-2362)
- [x] 2.3 Draw the strip's progress bar from `PgView.setMainSecondaryProgress`; verify with `yarn test-unit
  src/views/flow/console` (HOO-2362)

## 3. Custom RPCs (`client-v2-custom-rpcs`)

- [ ] 3.1 List a public devnet or mainnet endpoint as a custom chip, named by its host and checked, while the chip
  offers a platform RPC (`toStoredEndpoints`, `PgCustomRpcs`); reword the `buildEndpointOptions` JSDoc; verify with
  `BaseNetworkChoice.platform.test.tsx` expecting a checked `api.devnet.solana.com` chip (HOO-2362)

## 4. Faucet links and the tutorial's write count (`tutorial-runs`, `client-run`)

- [x] 4.1 Fill the wallet address into the tutorial's and the docs link's faucet links, with 5 SOL on the tutorial
  deploy's card; verify with `yarn test-unit src/shared/lib/faucet.ts` and the `client-run: A new wallet` e2e test
  (HOO-2362)
- [x] 4.2 Report each landed write as the "Writing buffer" stage's "N of M transactions"; verify with `yarn test-unit
  src/features/tutorial-conversation/model/runners/deploy.ts` (HOO-2362)
