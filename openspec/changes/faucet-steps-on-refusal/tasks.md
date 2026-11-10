# Tasks

## 1. Every refusal points to the web faucet (HOO-2788)

- [x] 1.1 `AirdropRefusedError`, `isAirdropRefused` and `refusedNote` in `commands/airdrop/report.ts`; `airdrop.ts`
      throws the refusal and prints the note for any refusal; verify with `yarn test-unit src/commands/airdrop`
      ([plan](plans/1-every-refusal.md))
- [x] 1.2 Wallet chip and wallet menu show the refused state / toast for any refusal, headline by cause (depends
      on 1.1); verify with `yarn test-unit src/features/fund-wallet`
- [x] 1.3 The tutorial run/call card's cause line follows the airdrop's message; verify with
      `yarn test-unit src/widgets/tutorial-conversation`
- [x] 1.4 "Getting SOL" in `docs/assistant-context.md`, then `yarn sync-assistant-context`
