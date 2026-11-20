import { ArrowUpRight, CloudOff, KeyRound, LogOut, Settings, Unplug, Wallet } from "lucide-react"
import type { ReactNode } from "react"

import { DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator } from "@/components/ui/dropdown-menu"
import { Kbd } from "@/components/ui/kbd"

import { cancelSignIn, signIn, type Account } from "../../navStates"
import { GitHubMark } from "../../newProject/next/SourceRail"
import { HelpItems } from "../../settings/HelpItems"
import { soon } from "../Catalog"
import { AvatarDisc } from "./AccountRow"
import { ProgressRing } from "./ProgressRing"
import type { SetupView } from "./setup"

/* The account menu (Almaz, 10 Nov): who you are at its head, then what's left to set up, the app's own
   two rows, the wallet, and the way out last. Every row leads with its glyph, as the nav's rows do: a
   list of bare words beside a nav of icons read as unfinished */

/** A row: 32 high and 13px, 44 under a finger; its glyph in the quiet grey, 10 before the words */
export const MENU_ITEM = "h-8 gap-2.5 px-2 text-13 font-label [html.touch_&]:h-11 [html.phone_&]:h-11 [&>svg:first-child]:size-4 [&>svg:first-child]:text-muted-foreground"
const NOTE = "px-2 py-1.5 text-13 leading-4 font-label text-muted-foreground"
/** A trailing icon sits centred under the ⌘, key (22 wide), not flush with the edge, so the right
 * column reads as one line: 14 wide plus 4 each side */
export const TRAIL_ICON = "ml-auto mr-1 size-3.5 text-muted-foreground"
/** The stroke every glyph in the menu is drawn at */
export const MENU_STROKE = 1.75

const Item = ({ children, onSelect = soon, disabled }: { children: ReactNode; onSelect?: () => void; disabled?: boolean }) => (
  <DropdownMenuItem onSelect={onSelect} disabled={disabled} className={MENU_ITEM}>
    {children}
  </DropdownMenuItem>
)

/** The menu's head while there's an account to show: the avatar, the name, the handle */
function Who({ a }: { a: Account }) {
  return (
    <DropdownMenuLabel className="flex items-center gap-2.5 px-2 py-2 font-normal">
      <AvatarDisc a={a} size={32} />
      <span className="flex min-w-0 flex-col">
        <span className="truncate text-13 leading-5 font-act text-foreground">{a.primary}</span>
        <span className="truncate font-mono text-11 leading-4 text-(color:--text-quiet)">{a.line}</span>
      </span>
    </DropdownMenuLabel>
  )
}

/** One GitHub action, with a note over it when the session has something to say */
function GitHub({ note, onSelect, children }: { note?: string; onSelect: () => void; children: ReactNode }) {
  return (
    <>
      {note && <DropdownMenuLabel className={NOTE}>{note}</DropdownMenuLabel>}
      <Item onSelect={onSelect}>
        <GitHubMark />
        {children}
      </Item>
    </>
  )
}

/** Who you are and what you can do about it, as the product's BaseAccountMenu words each session */
function Session({ a }: { a: Account }) {
  switch (a.session) {
    case "in":
    case "offline":
      return <Who a={a} />
    case "out":
      // The one thing to do here, so it's the menu's head: the mark on the avatar's tile, the reason under the words
      return (
        <DropdownMenuItem onSelect={signIn} className="h-auto gap-2.5 px-2 py-2 text-13 font-label">
          <span aria-hidden="true" className="flex size-8 shrink-0 items-center justify-center rounded-full bg-foreground/[0.08] text-foreground">
            <GitHubMark />
          </span>
          <span className="flex min-w-0 flex-col">
            <span className="text-13 leading-5 font-act text-foreground">Sign in with GitHub</span>
            <span className="text-13 leading-4 text-muted-foreground">Keep your work on any device</span>
          </span>
        </DropdownMenuItem>
      )
    case "waiting":
      return <GitHub note="Waiting for GitHub…" onSelect={cancelSignIn}>Cancel sign-in</GitHub>
    case "failed":
      return <GitHub note="Couldn't sign in. Your work is safe in this browser." onSelect={signIn}>Try again</GitHub>
    case "ended":
      return <GitHub note="Your session ended. New changes stay in this browser until you sign in." onSelect={signIn}>Sign in again</GitHub>
  }
}

type Props = {
  account: Account
  setup: SetupView | null
  notSynced: number
  /** Whether a wallet is connected: once setup's last step is done, or with no setup left */
  wallet: boolean
  side: "top" | "right"
  /** Opens setup's steps over the account row */
  onSetup: () => void
  onSettings?: () => void
  onCloseAutoFocus?: (e: Event) => void
}

/** The account menu, from the account row (above it) or the rail's avatar (to its right). In Oak every
 * item says it isn't here, except Get set up, Settings and Help, which work */
export function AccountMenu({ account, setup, notSynced, wallet, side, onSetup, onSettings, onCloseAutoFocus }: Props) {
  const signedIn = account.session === "in" || account.session === "offline"
  return (
    <DropdownMenuContent side={side} align={side === "top" ? "start" : "end"} sideOffset={6} onCloseAutoFocus={onCloseAutoFocus} className="w-64 rounded-(--radius-panel) p-1 shadow-panel">
      <Session a={account} />
      {(setup || notSynced > 0) && <DropdownMenuSeparator />}
      {setup && (
        <Item onSelect={onSetup}>
          <ProgressRing done={setup.done} of={setup.total} size={16} />
          {/* Always the list's own name here: with one step left it took that step's words, "Connect a wallet",
              right over the menu's own Connect wallet, and the two read as one thing twice (Nikita, 20 Nov) */}
          Get set up
          <span className="ml-auto mr-1 text-13 text-muted-foreground tabular-nums">{`${setup.done} of ${setup.total}`}</span>
        </Item>
      )}
      {notSynced > 0 && (
        <Item>
          <CloudOff strokeWidth={MENU_STROKE} />
          {`${notSynced} project${notSynced > 1 ? "s" : ""} not synced`}
          <span className="ml-auto mr-1 text-13 text-muted-foreground">Sync now</span>
        </Item>
      )}
      <DropdownMenuSeparator />
      <Item onSelect={onSettings}>
        <Settings strokeWidth={MENU_STROKE} />
        Settings
        <Kbd className="ml-auto">⌘,</Kbd>
      </Item>
      <HelpItems />
      <DropdownMenuSeparator />
      {wallet ? (
        <>
          <DropdownMenuLabel className="flex h-8 items-center gap-2.5 px-2 py-0 font-normal">
            <Wallet aria-hidden="true" strokeWidth={MENU_STROKE} className="size-4 shrink-0 text-muted-foreground" />
            <span className="font-mono text-13 text-foreground">7xKX…gAsU</span>
            <span className="ml-auto mr-1 text-13 text-muted-foreground tabular-nums">2.5 SOL</span>
          </DropdownMenuLabel>
          {/* The Playground wallet's key lives in this browser alone: clear the browser and the wallet, and the
              right to upgrade what it deployed, are gone. The product's wallet menu has Export; this is it */}
          <Item>
            <KeyRound strokeWidth={MENU_STROKE} />
            Back up wallet
          </Item>
          <Item>
            <Unplug strokeWidth={MENU_STROKE} />
            Disconnect wallet
          </Item>
        </>
      ) : (
        <Item>
          <Wallet strokeWidth={MENU_STROKE} />
          Connect wallet
        </Item>
      )}
      {/* The way out last, as menus end: under the name it sat over everything you came here to do */}
      {signedIn && (
        <>
          <DropdownMenuSeparator />
          {account.session === "offline" ? (
            <Item disabled>
              <CloudOff strokeWidth={MENU_STROKE} />
              You're offline
            </Item>
          ) : (
            <Item>
              <GitHubMark />
              Open GitHub profile
              <ArrowUpRight className={TRAIL_ICON} />
            </Item>
          )}
          <Item>
            <LogOut strokeWidth={MENU_STROKE} />
            Sign out
          </Item>
        </>
      )}
    </DropdownMenuContent>
  )
}
