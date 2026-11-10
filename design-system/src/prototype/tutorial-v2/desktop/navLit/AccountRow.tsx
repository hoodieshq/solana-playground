import type { ReactNode } from "react"

import { DropdownMenu, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Spinner } from "@/components/ui/spinner"
import { cn } from "@/lib/utils"

import type { Account } from "../../navStates"
import { LitIcon } from "./icons"
import { soon } from "../Catalog"
import { Notch } from "./ItemTile"
import { FOCUS, HOVER, Tip, useRoomy, useTablet } from "./parts"

/** Sign-in failed and the session ended both need you; the nav draws both in amber, never red */
export const needsYou = (a: Account) => a.tone === "warning" || a.tone === "error"

/** Line 2 as Lit Path says it: shorter where the product's is long */
export const lineOf = (a: Account) => a.short ?? a.line ?? ""

/** The account's initials, the profile glyph when signed out, a spinner while GitHub answers; the
 * amber notch when the account needs you, in the rail only: the open row says it in amber on line 2,
 * and a second dot there read as one more status beside the chip's (Almaz, 11/06). A rounded square,
 * 32 in the open nav with its left edge on the line the icons above start on (x 16), 28 in the rail on
 * the icons' axis */
export function AvatarDisc({ a, size = 32, notch = false }: { a: Account; size?: 28 | 32; notch?: boolean }) {
  return (
    <span className="relative flex shrink-0" style={{ width: size, height: size }}>
      <span className="flex size-full items-center justify-center rounded-lg bg-surface-raised text-[0.75rem] font-act tracking-[0.02em] text-muted-foreground [&>svg]:size-[1.125rem]">
        {a.session === "waiting" ? <Spinner className="size-4" aria-label="Signing in" /> : (a.avatar ?? <LitIcon name="profile" />)}
      </span>
      {notch && needsYou(a) && <Notch />}
    </span>
  )
}

type Props = {
  account: Account
  /** The chip, or Cancel while signing in, on line 1's right */
  chip: ReactNode
  /** The account menu's content */
  menu: ReactNode
  /** The chip's word ("Devnet down"), so line 1 keeps exactly its room and the name uses the rest */
  chipWord?: string
}

/** Who you are, always 44 high (60 on the tablet), so the foot never changes height. Two sibling
 * buttons: the account (avatar and its lines, opens the menu) and, on line 1's right, the status chip.
 * Line 2 says what's wrong with the account, in amber; signed in and well, or signed out, there's
 * nothing to say, so the name stands alone, centred */
export function AccountRow({ account: a, chip, menu, chipWord }: Props) {
  const tablet = useTablet()
  const roomy = useRoomy()
  const line = lineOf(a)
  // Signed out, "Saved in this browser" said little (Almaz, 11/09): the menu's note says why to sign in
  const alone = a.session === "in" || a.session === "out"
  const tip = a.session === "out" ? "Sign in with GitHub to keep your work on any device" : undefined
  return (
    <div className={cn("group/account relative", roomy ? "h-15" : "h-11")}>
      <DropdownMenu>
        <Tip label={tip} side="top">
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              aria-label={alone ? `${a.primary}. Account menu` : `${a.primary}, ${line}. Account menu`}
              className={cn(
                "flex size-full items-center gap-2.5 rounded-lg pr-1 pl-2 text-left hover:bg-(--nav-hover) active:bg-surface-hover data-[state=open]:bg-(--nav-hover)",
                FOCUS,
                HOVER
              )}
            >
              <AvatarDisc a={a} />
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="flex min-w-0 items-center gap-2">
                  <span
                    className={cn(
                      "min-w-0 truncate leading-5 font-act tracking-[-0.005em] text-foreground",
                      roomy ? "text-control" : "text-[0.875rem]"
                    )}
                  >
                    {a.primary}
                  </span>
                  {/* The chip's room, drawn invisibly at its size: the chip itself is a button of its own over it */}
                  <span aria-hidden="true" className="invisible ml-auto flex shrink-0 items-center gap-1.5 px-2 text-[0.75rem] font-act tracking-[0.01em] whitespace-nowrap">
                    <span className="size-1.5" />
                    {a.session === "waiting" ? "Cancel" : chipWord}
                  </span>
                </span>
                {/* Signed in and well, line 2 was only the handle under the name: the menu shows it */}
                {!alone && (
                  <span
                    className={cn(
                      "truncate leading-4 text-[0.75rem] font-act tracking-[0.01em]",
                      needsYou(a) ? "text-warning-ink" : "text-(color:--text-quiet)"
                    )}
                  >
                    {line}
                  </span>
                )}
              </span>
            </button>
          </DropdownMenuTrigger>
        </Tip>
        {menu}
      </DropdownMenu>
      {/* Line 1's right: the chip, or Cancel while GitHub answers. Centred on line 1 on the desktop,
          on the row on the tablet and when the name stands alone */}
      <div className={cn("absolute right-0 flex items-center", tablet || alone ? "inset-y-0" : "top-0")}>
        {a.session === "waiting" ? (
          <button
            type="button"
            onClick={soon}
            className={cn("rounded-md px-1.5 text-[0.75rem] text-muted-foreground hover:bg-(--nav-hover) hover:text-foreground", FOCUS, HOVER, roomy ? "h-11" : "mt-0.5 h-6")}
          >
            Cancel
          </button>
        ) : (
          chip
        )}
      </div>
    </div>
  )
}
