## Context

HOO-2824. `airdrop-native-rpc` sends every airdrop to the cluster's native RPC, and devnet's answers 410 since 3 Nov.
web3.js reports the HTTP status as `410 Gone: <body>` (`410 : <body>` over HTTP/2) and a JSON-RPC error carried by a
200 as `failed to request airdrop of …: <message>`.

## Goals / Non-Goals

**Goals:** one plain line with the web faucet wherever a closed faucet refuses; no repeat request from the automatic
airdrop or a deploy's top-up in the same session.

**Non-Goals:** a faucet of our own; persisting the answer across reloads; changing localnet or a custom endpoint.

## Decisions

- **Recognised from the message, in `shared/lib/faucet`.** The status prefix, the JSON-RPC code, or the words
  "faucet is closed"; beside `faucetUrlFor`, which builds the link the line carries.
- **Remembered per airdrop RPC, not per cluster name.** The RPC that answered 410 is the one closed; a custom
  endpoint on devnet without a native RPC configured airdrops through itself and keeps asking it.
- **The explicit command still asks.** A person who types `airdrop` asks on purpose, and the faucet may reopen; an
  airdrop that lands forgets the closed answer.
- **The automatic airdrop prints the line once and turns itself off for the cluster**, as it does after any failure.

## Risks / Trade-offs

- [Matching on words] A faucet that changes its message keeps the 410 status, which the helper reads first.
