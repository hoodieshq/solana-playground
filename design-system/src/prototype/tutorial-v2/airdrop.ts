import { useEffect, useState } from "react"

import { FAUCET_URL } from "./lessons/common"

/* What devnet's airdrop does when a first deploy (or a read mode call) funds the Playground wallet,
   picked from the prototype bar. The team call of 10 Nov: the console's airdrop often refuses (429) or
   sends 1 SOL of the 5 asked, and the web faucet is the reliable way but almost nobody knows it. So a
   refusal or a short airdrop says so and links the web faucet with the wallet and the amount filled in,
   and the assistant says the same in the chat. Either way the next airdrop goes through, as the retry
   would in practice. ?airdrop=works|limit|partial puts a link on one; ?demo=faucet is the old name of
   limit */

export type AirdropOutcome = "works" | "limit" | "partial"

export const AIRDROP_OUTCOMES: Record<AirdropOutcome, string> = { works: "Works", limit: "Limit (429)", partial: "Sends 1 SOL" }

/** What the airdrop asks for, and what a short one brings */
export const AIRDROP_SOL = 5
export const SHORT_SOL = 1

const KEY = "oak.airdrop"
const EVENT = "oak.airdrop"

const isOutcome = (v: string | null): v is AirdropOutcome => v === "works" || v === "limit" || v === "partial"

try {
  const q = new URLSearchParams(location.search)
  const asked = q.get("airdrop")
  if (isOutcome(asked)) localStorage.setItem(KEY, asked)
  else if (q.getAll("demo").includes("faucet")) localStorage.setItem(KEY, "limit")
} catch {
  // Storage off: the bar's pick lasts in this window only
}

export function readAirdrop(): AirdropOutcome {
  try {
    const v = localStorage.getItem(KEY)
    return isOutcome(v) ? v : "works"
  } catch {
    return "works"
  }
}

export function setAirdrop(v: AirdropOutcome) {
  try {
    localStorage.setItem(KEY, v)
  } catch {
    // Storage off
  }
  window.dispatchEvent(new Event(EVENT))
}

export function useAirdrop(): AirdropOutcome {
  const [v, setV] = useState(readAirdrop)
  useEffect(() => {
    const sync = () => setV(readAirdrop())
    window.addEventListener(EVENT, sync)
    window.addEventListener("storage", sync)
    return () => {
      window.removeEventListener(EVENT, sync)
      window.removeEventListener("storage", sync)
    }
  }, [])
  return v
}

/** The web faucet with the wallet and the amount filled in: the visitor signs in and confirms */
export const webFaucet = (wallet: string) => `${FAUCET_URL}/?walletAddress=${wallet}&amount=${AIRDROP_SOL}&cluster=devnet`

/** What the failure card says happened, by how much came: nothing (the limit) or a short airdrop */
export const shortfall = (got: number, need: string) =>
  got > 0
    ? `The devnet faucet sent ${got} SOL instead of ${AIRDROP_SOL}, and this needs about ${need}.`
    : `The devnet faucet hit its rate limit (429), so your wallet still has 0 SOL. This needs about ${need}.`

/** The line under it, the same in every card: the way that works */
export const WEB_FAUCET_LINE = `The web faucet is the reliable way: your address and ${AIRDROP_SOL} SOL are filled in, you sign in with GitHub and confirm.`

/** The assistant's word in the chat after a refused or short airdrop */
export const assistantFaucetNote = (got: number) =>
  `${got > 0 ? `Devnet's faucet only sent ${got} SOL.` : "Devnet's faucet is busy right now."} This happens a lot. The web faucet is the sure way to get test SOL: open it from the card, your address and ${AIRDROP_SOL} SOL are already filled in. Then press Try again.`
