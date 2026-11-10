# Design

## Context

`PgWallet.state === "sol"` makes the extension named by `standardName` the current wallet, and
`commands/deploy/deploy.ts` already splits a deploy when the current wallet is not a Playground one:
`standardWallet` sends `required + 0.1 SOL` to the first Playground account, which creates and writes
the buffer and hands its authority to the extension; the extension signs the final deploy or upgrade.
`connect <wallet>` in `commands/connect/connect.ts` is the only way to get there.

## Decisions

**1. The chip connects through the same state change as `connect`.** `PgWallet.update({ state: "sol",
standardName })` after the wallet's own `connect()`; disconnect calls the wallet's `disconnect()` and goes
back to `state: "pg"`. One code path for the terminal and the chip (`connectStandard` /
`disconnectStandard` in `commands/connect`), so a reload reconnects the same way.

**2. The leftover is "what the Playground wallet holds over its balance before the run".** The balance is
read before the extension's transfer. Whatever the outcome, once the buffer is settled, the Playground
wallet sends `now - before - fee` to the extension when that is positive. This covers the 0.1 SOL fee
headroom, a buffer closed after a failure (its rent lands in the Playground wallet while it still holds the
buffer's authority), and a stop before the buffer existed. It never touches SOL the Playground wallet had
before. Signed by the Playground wallet, so the extension is not asked a third time.

**3. A failed return is named, never thrown.** The deploy's own result or error is what the person needs;
a failed return prints "{n} SOL stayed in your Playground wallet" and is reported to the logs.

**4. Approvals are run state.** `DeployRunState.approval: { wallet, n } | null` is set around the
extension's two signatures and read by `BaseDeployProgress`. The stage's who-pays line names the
extension (`DeployPayer.name`) and adds the two approvals before a run.

## Risks

- A deploy where the extension's transfer landed but its confirmation failed: the before-balance is read
  first, so the return still sends back what arrived.
