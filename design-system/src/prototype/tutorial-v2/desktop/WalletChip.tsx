import { ArrowUpRight, Wallet } from "lucide-react"
import { useEffect, useState } from "react"

import { Button } from "@/components/ui/button"
import { CopyButton } from "@/components/ui/copy-button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Separator } from "@/components/ui/separator"
import { Spinner } from "@/components/ui/spinner"
import { Tag } from "@/components/ui/tag"
import { cn } from "@/lib/utils"

import { FAUCET_URL, WALLET, shortKey } from "../lessons/common"
import { soon } from "./Catalog"

const fmt = (sol: number) => `${Number(sol.toFixed(2))} SOL`
const AIRDROP_SOL = 5
/** The web faucet with this wallet and amount filled in, as the product's console prints it */
const WEB_FAUCET = `${FAUCET_URL}/?walletAddress=${WALLET}&amount=${AIRDROP_SOL}&cluster=devnet`

/** `away`: the web faucet is open in another tab; coming back here checks the balance */
type Ask = "idle" | "asking" | "refused" | "away" | "checking" | "got"

/** The Playground wallet at the console bar's end: address and balance on devnet. The wallet lives in
 * this browser and needs no sign-in, so it shows whoever is here, next to the builds and deploys it pays
 * for. The popover is two blocks: the wallet, then topping it up, with one main button per state. The
 * airdrop says how it went right here, not only in the console, since the console isn't open everywhere.
 * In Oak the first ask is refused (the case people hit) and the next goes through. A refusal spells out
 * the web faucet in three steps, since a newcomer won't know what to do on that page, and coming back
 * to the tab reads the balance again */
export function WalletChip({ sol }: { sol: number }) {
  const [ask, setAsk] = useState<Ask>("idle")
  const [tries, setTries] = useState(0)
  const balance = sol + (ask === "got" ? AIRDROP_SOL : 0)
  const request = () => {
    setAsk("asking")
    setTimeout(() => {
      setAsk(tries === 0 ? "refused" : "got")
      setTries((n) => n + 1)
    }, 1200)
  }
  // Back from the web faucet: the balance is read again on its own, nobody has to know to refresh
  useEffect(() => {
    if (ask !== "away") return
    const back = () => {
      setAsk("checking")
      setTimeout(() => setAsk("got"), 1200)
    }
    window.addEventListener("focus", back)
    return () => window.removeEventListener("focus", back)
  }, [ask])

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={`Playground wallet ${shortKey(WALLET, 4)} on devnet, ${fmt(balance)}`}
          className="flex h-6 shrink-0 items-center gap-1.5 rounded-md px-1.5 text-xs text-muted-foreground outline-none hover:bg-surface-hover hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
        >
          <Wallet className="size-3.5" />
          <span className="font-mono">{shortKey(WALLET, 4)}</span>
          <span aria-hidden="true">·</span>
          <span className={cn("tabular-nums", balance === 0 && "text-warning")}>{fmt(balance)}</span>
        </button>
      </PopoverTrigger>
      <PopoverContent side="top" align="end" sideOffset={6} onOpenAutoFocus={(e) => e.preventDefault()} className="w-72 gap-0 p-0">
        {/* The wallet: what it is, how much it holds, its address. Devnet is a tag, since it's a state */}
        <div className="p-4">
          <div className="flex items-center justify-between">
            <span className="text-[0.8125rem] font-act text-foreground">Playground wallet</span>
            <Tag>Devnet</Tag>
          </div>
          <p className="mt-3 text-2xl leading-none font-act tabular-nums text-foreground">{fmt(balance)}</p>
          <div className="mt-1.5 flex h-4 items-center gap-0.5">
            <span className="font-mono text-[0.75rem] text-muted-foreground">{shortKey(WALLET, 6)}</span>
            <CopyButton value={WALLET} label="Copy address" className="-my-1" />
          </div>
        </div>
        <Separator />

        {/* Topping it up: one main action per state */}
        <div className="flex flex-col gap-3 p-4">
          {ask === "refused" && (
            <>
              <p className="text-[0.8125rem] font-act text-foreground">The faucet is at its limit</p>
              <ol className="flex flex-col gap-1.5 text-[0.75rem] leading-4 text-foreground/80">
                {[
                  "Open the web faucet and sign in with GitHub (an account with a public repo)",
                  `Confirm the airdrop. Your address and ${AIRDROP_SOL} SOL are filled in`,
                  "Come back here. The balance updates by itself",
                ].map((step, i) => (
                  <li key={step} className="flex gap-2">
                    <span className="w-3 shrink-0 text-muted-foreground tabular-nums">{i + 1}</span>
                    {step}
                  </li>
                ))}
              </ol>
            </>
          )}
          {(ask === "away" || ask === "checking") && (
            <p className="flex items-center gap-2 text-[0.8125rem] text-muted-foreground">
              <Spinner className="size-3.5" />
              {ask === "away" ? "Waiting for SOL from the web faucet…" : "Checking the balance…"}
            </p>
          )}
          {ask === "got" && <p className="text-[0.8125rem] text-success">{`Got ${AIRDROP_SOL} SOL. You're ready to deploy`}</p>}

          {(ask === "idle" || ask === "asking") && (
            <Button className="w-full" disabled={ask === "asking"} onClick={request}>
              {ask === "asking" ? (
                <>
                  <Spinner className="size-3.5" />
                  Asking the faucet…
                </>
              ) : (
                `Get ${AIRDROP_SOL} devnet SOL`
              )}
            </Button>
          )}
          {ask === "refused" && (
            <Button asChild className="w-full">
              <a href={WEB_FAUCET} target="_blank" rel="noreferrer" onClick={() => setAsk("away")}>
                Open the web faucet
                <ArrowUpRight data-icon="inline-end" />
              </a>
            </Button>
          )}

          {/* The other ways, as real buttons under the main one: half width side by side, or full width alone */}
          {ask !== "got" && ask !== "checking" && (
            <div className={cn("grid gap-2", (ask === "refused" || ask === "away") && "grid-cols-2")}>
              {ask === "refused" && (
                <Button variant="secondary" size="sm" onClick={request}>
                  Try again
                </Button>
              )}
              {ask === "away" && (
                <Button asChild variant="secondary" size="sm">
                  <a href={WEB_FAUCET} target="_blank" rel="noreferrer">
                    Open it again
                  </a>
                </Button>
              )}
              <Button variant="secondary" size="sm" onClick={soon}>
                {ask === "refused" || ask === "away" ? "Use your wallet" : "Send from your wallet"}
              </Button>
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  )
}
