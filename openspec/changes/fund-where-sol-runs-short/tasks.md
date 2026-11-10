# Tasks

## 1. Send from your wallet where SOL runs short

- [x] 1.1 Add `openFundDialog(from)` and `FundDialogHost` to `features/fund-wallet`, mount the host beside `ToastHost` in `views/flow/Flow.tsx`, and widen `fund_dialog_opened.from` to `deploy-card | tutorial-card | faucet-toast`; verify with `yarn test-unit src/features/fund-wallet` asserting the event through the memory provider (HOO-2785) — plan: [plans/1-fund-where-short.md](plans/1-fund-where-short.md)
- [x] 1.2 Give `BaseNotEnoughSol` an `onFund` button "Send from your wallet" for every reason and wire it in `views/flow/stages/Deploy.tsx` with `deploy-card`; verify with `yarn test-unit src/features/deploy src/views/flow/stages` (HOO-2785; depends on 1.1)
- [x] 1.3 Give the tutorial's deploy and run/call "Not enough devnet SOL" cards an `onFund` button after "Open the web faucet", wired through `TurnView` with `tutorial-card`; verify with `yarn test-unit src/widgets/tutorial-conversation` (HOO-2785; depends on 1.1)
- [x] 1.4 Add "Send from your wallet" to `FaucetRefusedToast` with `faucet-toast`; verify with a `FaucetRefusedToast` unit test (HOO-2785; depends on 1.1)
