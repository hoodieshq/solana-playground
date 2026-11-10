import { ArrowUpRight } from "lucide-react"
import type { ReactNode } from "react"

import { DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator } from "@/components/ui/dropdown-menu"
import { Kbd } from "@/components/ui/kbd"

import type { Account } from "../../navStates"
import { HelpItems } from "../../settings/HelpItems"
import { soon } from "../Catalog"
import type { SetupView } from "./setup"

const ITEM = "h-[1.875rem] text-[0.8125rem] font-label"
const NOTE = "px-1.5 py-1 text-[0.75rem] leading-4 font-label text-muted-foreground"
/** A trailing icon sits centred under the ⌘, key (22 wide), not flush with the edge, so the right
 * column reads as one line: 14 wide plus 4 each side */
export const TRAIL_ICON = "ml-auto mr-1 size-3.5 text-muted-foreground"

const Item = ({ children, onSelect = soon, disabled }: { children: ReactNode; onSelect?: () => void; disabled?: boolean }) => (
  <DropdownMenuItem onSelect={onSelect} disabled={disabled} className={ITEM}>
    {children}
  </DropdownMenuItem>
)

/** Who you are and what you can do about it, as the product's BaseAccountMenu words each session */
function Session({ a }: { a: Account }) {
  const who = (
    <DropdownMenuLabel className="flex flex-col gap-0.5 py-1.5">
      <span className="text-[0.8125rem] font-act text-foreground">{a.primary}</span>
      <span className="font-mono text-[0.6875rem] font-normal text-(color:--text-quiet)">{a.line}</span>
    </DropdownMenuLabel>
  )
  switch (a.session) {
    case "in":
      return (
        <>
          {who}
          <Item>
            Open GitHub profile
            <ArrowUpRight className={TRAIL_ICON} />
          </Item>
          <Item>Sign out</Item>
        </>
      )
    case "offline":
      return (
        <>
          {who}
          <Item disabled>You're offline</Item>
          <Item>Sign out</Item>
        </>
      )
    case "out":
      return (
        <>
          {/* The note is the item's second line, 2 apart as the signed in name and line are, not a row of its own */}
          <DropdownMenuItem onSelect={soon} className="flex-col items-start gap-0.5 py-1.5 text-[0.8125rem] font-label">
            Sign in with GitHub
            <span className="text-[0.75rem] leading-4 text-muted-foreground">Keep your work on any device</span>
          </DropdownMenuItem>
        </>
      )
    case "waiting":
      return (
        <>
          <DropdownMenuLabel className={NOTE}>Waiting for GitHub…</DropdownMenuLabel>
          <Item>Cancel sign-in</Item>
        </>
      )
    case "failed":
      return (
        <>
          <DropdownMenuLabel className={NOTE}>Couldn't sign in. Your work is safe in this browser.</DropdownMenuLabel>
          <Item>Try again</Item>
        </>
      )
    case "ended":
      return (
        <>
          <DropdownMenuLabel className={NOTE}>Your session ended. New changes stay in this browser until you sign in.</DropdownMenuLabel>
          <Item>Sign in again</Item>
        </>
      )
  }
}

type Props = {
  account: Account
  setup: SetupView | null
  notSynced: number
  /** Whether a wallet is connected: once setup's last step is done, or with no setup left */
  wallet: boolean
  side: "top" | "right"
  /** Shows the setup row again and opens its popover */
  onSetup: () => void
  onSettings?: () => void
  onCloseAutoFocus?: (e: Event) => void
}

/** The account menu, from the account row (above it) or the rail's avatar (to its right). In Oak every
 * item says it isn't here, except Get set up, which works */
export function AccountMenu({ account, setup, notSynced, wallet, side, onSetup, onSettings, onCloseAutoFocus }: Props) {
  return (
    <DropdownMenuContent side={side} align={side === "top" ? "start" : "end"} sideOffset={6} onCloseAutoFocus={onCloseAutoFocus} className="w-60 rounded-(--radius-panel) p-1 shadow-panel">
      <Session a={account} />
      {setup && (
        <>
          <DropdownMenuSeparator />
          <Item onSelect={onSetup}>{`Get set up · ${setup.done} of ${setup.total}`}</Item>
        </>
      )}
      {notSynced > 0 && (
        <>
          <DropdownMenuSeparator />
          <Item>
            {`${notSynced} project${notSynced > 1 ? "s" : ""} not synced`}
            <span className="ml-auto text-[0.75rem] text-muted-foreground">Sync now</span>
          </Item>
        </>
      )}
      <DropdownMenuSeparator />
      <Item onSelect={onSettings}>
        Settings
        <Kbd className="ml-auto">⌘,</Kbd>
      </Item>
      <HelpItems />
      <DropdownMenuSeparator />
      {wallet ? (
        <>
          <DropdownMenuLabel className="flex items-center gap-2 py-1.5 font-normal">
            <span className="font-mono text-[0.75rem] text-foreground">7xKX…gAsU</span>
            <span className="ml-auto text-[0.75rem] text-muted-foreground tabular-nums">2.5 SOL</span>
          </DropdownMenuLabel>
          {/* The Playground wallet's key lives in this browser alone: clear the browser and the wallet, and the
              right to upgrade what it deployed, are gone. The product's wallet menu has Export; this is it */}
          <Item>Back up wallet</Item>
          <Item>Disconnect wallet</Item>
        </>
      ) : (
        <Item>Connect wallet</Item>
      )}
    </DropdownMenuContent>
  )
}
