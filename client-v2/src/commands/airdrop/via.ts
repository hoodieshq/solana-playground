import type { AirdropVia } from "../../features/fund-wallet";

/**
 * The caller of the `airdrop` run in flight, for `fund_airdropped`. The
 * command cannot tell who ran it, so a caller names itself around `execute`
 * through `withAirdropVia`; the terminal names nobody and is the default.
 *
 * One value for the whole module: two airdrops started at once from
 * different callers could read each other's `via`. The Flow state counts
 * airdrops in flight (`views/flow/state/stage.ts`, `airdrops`), and two at
 * once are rare, so the event takes that chance over a parameter the
 * terminal cannot pass.
 */
let pending: AirdropVia | undefined;

/** The caller of the airdrop in flight; `terminal` when none named itself */
export const getAirdropVia = (): AirdropVia => pending ?? "terminal";

/**
 * Runs `run` as the airdrop caller `via`, restores the previous caller when
 * it settles, and resolves with what `run` resolves with
 */
export const withAirdropVia = async <T>(
  run: () => Promise<T>,
  via: AirdropVia
): Promise<T> => {
  const previous = pending;
  pending = via;
  try {
    return await run();
  } finally {
    pending = previous;
  }
};
