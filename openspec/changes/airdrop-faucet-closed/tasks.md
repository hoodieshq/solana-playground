## 1. Closed faucet (HOO-2824)

- [x] 1.1 `isFaucetClosed` and `faucetClosedLineFor` in `shared/lib/faucet`, tested on devnet's real 410 body
- [x] 1.2 The `airdrop` command ends with the faucet line on a closed faucet and remembers it per airdrop RPC
- [x] 1.3 The automatic airdrop and a deploy's top-up skip a known-closed RPC and point to the web faucet
- [x] 1.4 The tutorial's funding logs a closed faucet as a warning; its "Not enough devnet SOL" cards say the faucet is
      closed
