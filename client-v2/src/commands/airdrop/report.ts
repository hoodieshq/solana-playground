import type { FaucetLinkFill } from "@/shared/lib/faucet";
import { faucetLink } from "@/shared/lib/faucet";

const LAMPORTS_PER_SOL = 1_000_000_000;

/**
 * The line after an airdrop landed, with what the balance rose by. A public
 * RPC may grant less than was asked (devnet asked for 5 SOL gave 1), so the
 * requested amount alone would overstate it. A balance that fell meanwhile
 * (the wallet paid for something) gives no amount to name.
 */
export const receivedLine = (
  requestedSol: number,
  receivedLamports: number
): string => {
  if (receivedLamports <= 0) return "Airdrop successful.";
  const received = receivedLamports / LAMPORTS_PER_SOL;
  return received >= requestedSol
    ? `Airdrop successful: received ${received} SOL.`
    : `Airdrop successful: received ${received} SOL of the ${requestedSol} SOL requested.`;
};

/**
 * Whether the RPC refused the airdrop for asking too often: an HTTP 429 (which
 * web3.js reports as "429 Too Many Requests: …") or the faucet's own words for
 * its daily limit.
 */
export const isRateLimited = (error: unknown): boolean =>
  error instanceof Error &&
  /\b429\b|too many (airdrop )?requests|rate.?limit|airdrop limit|run dry/i.test(
    error.message
  );

/** What the terminal says after a rate limit, with the web faucet filled in */
export const rateLimitNote = (fill: FaucetLinkFill): string =>
  `The RPC rate-limits airdrops and refused this one. Request SOL from the web faucet instead: ${faucetLink(
    fill
  )}`;
