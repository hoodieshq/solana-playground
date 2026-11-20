import type { ReactNode } from "react"

import { DropdownMenu, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Spinner } from "@/components/ui/spinner"
import { cn } from "@/lib/utils"

import { cancelSignIn, type Account } from "../../navStates"
import { LitIcon } from "./icons"
import { Notch } from "./ItemTile"
import { FOCUS, HOVER, Tip, useRoomy, useTablet } from "./parts"
import type { SetupView } from "./setup"

/** Sign-in failed and the session ended both need you; the nav draws both in amber, never red */
export const needsYou = (a: Account) => a.tone === "warning" || a.tone === "error"

/** Line 2 as Lit Path says it: shorter where the product's is long */
export const lineOf = (a: Account) => a.short ?? a.line ?? ""

/** The account's initials, the profile glyph when signed out, a spinner while GitHub answers; the
 * amber notch when the account needs you, in the rail only: the open row says it in amber on line 2,
 * and a second dot there read as one more status beside the chip's (Almaz, 11/06). A disc, as a person
 * is drawn, where the squares in the nav are things (Almaz, 10 Nov); signed in, a breath of the brand's
 * light under the initials, so the corner reads as yours */
export function AvatarDisc({ a, size = 32, notch = false }: { a: Account; size?: number; notch?: boolean }) {
  return (
    <span className="relative flex shrink-0" style={{ width: size, height: size }}>
      <span
        style={a.avatar ? { backgroundImage: "linear-gradient(135deg, rgb(153 69 255 / 0.34), rgb(20 241 149 / 0.2))" } : undefined}
        className={cn(
          "flex size-full items-center justify-center rounded-full bg-surface-raised font-act tracking-wide [&>svg]:size-[55%]",
          a.avatar ? "text-foreground" : "text-muted-foreground",
          size < 28 ? "text-11" : "text-13"
        )}
      >
        {a.session === "waiting" ? <Spinner className="size-4" aria-label="Signing in" /> : (a.avatar ?? <LitIcon name="profile" />)}
      </span>
      {notch && needsYou(a) && <Notch />}
    </span>
  )
}

/** Setup's progress as a ring round the avatar: how much of you is set up, drawn on you. It was a row
 * of its own over the account (Almaz, 10 Nov); the foot keeps one height now, setup or not */
function SetupRing({ done, of }: { done: number; of: number }) {
  const r = 16.5
  const c = 2 * Math.PI * r
  return (
    <svg aria-hidden="true" viewBox="0 0 36 36" className="absolute inset-0 size-full -rotate-90">
      <defs>
        <linearGradient id="lit-setup-ring" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#9945ff" />
          <stop offset="1" stopColor="#14f195" />
        </linearGradient>
      </defs>
      <circle cx="18" cy="18" r={r} fill="none" strokeWidth="2" className="stroke-border-strong" />
      {done > 0 && (
        <circle
          cx="18"
          cy="18"
          r={r}
          fill="none"
          strokeWidth="2"
          strokeLinecap="round"
          stroke="url(#lit-setup-ring)"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - Math.min(done, of) / of)}
          className="transition-[stroke-dashoffset] duration-500 ease-out motion-reduce:transition-none"
        />
      )}
    </svg>
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
  /** Setup while it's unfinished: the ring round the avatar and, with nothing else to say, line 2 */
  setup?: SetupView | null
}

/** Who you are, always 44 high (60 on the tablet), so the foot never changes height. Two sibling
 * buttons: the account (avatar and its lines, opens the menu) and, on line 1's right, the status chip.
 * Line 2 says what's wrong with the account, in amber; signed in and well, or signed out, there's
 * nothing to say, so the name stands alone, centred */
export function AccountRow({ account: a, chip, menu, chipWord, setup }: Props) {
  const tablet = useTablet()
  const roomy = useRoomy()
  const line = lineOf(a)
  // Signed out, "Saved in this browser" said little (Almaz, 11/09): the menu's note says why to sign in
  const calm = a.session === "in" || a.session === "out"
  // The account's own trouble comes first on line 2; calm, setup says how far it is
  const line2 = !calm ? line : setup ? `${setup.label} · ${setup.done} of ${setup.total}` : ""
  const alone = !line2
  const tip = a.session === "out" ? "Sign in with GitHub to keep your work on any device" : undefined
  return (
    <div className={cn("group/account relative", roomy ? "h-15" : "h-11")}>
      <DropdownMenu>
        <Tip label={tip} side="top">
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              aria-label={alone ? `${a.primary}. Account menu` : `${a.primary}, ${line2}. Account menu`}
              className={cn(
                "flex size-full items-center gap-2 rounded-lg pr-1 pl-1.5 text-left hover:bg-(--nav-hover) active:bg-surface-hover data-[state=open]:bg-(--nav-hover)",
                FOCUS,
                HOVER
              )}
            >
              {/* One 36 box in every state, so the words never move: the disc fills it, or stands in the ring */}
              <span className="relative flex size-9 shrink-0 items-center justify-center">
                {setup && <SetupRing done={setup.done} of={setup.total} />}
                <AvatarDisc a={a} size={setup ? 26 : 32} />
              </span>
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="flex min-w-0 items-center gap-2">
                  <span
                    className={cn(
                      "min-w-0 truncate leading-5 font-act tracking-normal text-foreground",
                      roomy ? "text-16" : "text-13"
                    )}
                  >
                    {a.primary}
                  </span>
                  {/* The chip's room, drawn invisibly at its size: the chip itself is a button of its own over it */}
                  <span aria-hidden="true" className="invisible ml-auto flex shrink-0 items-center gap-1.5 px-2 text-13 font-act tracking-normal whitespace-nowrap">
                    <span className="size-1.5" />
                    {a.session === "waiting" ? "Cancel" : chipWord}
                  </span>
                </span>
                {/* Signed in and well, line 2 was only the handle under the name: the menu shows it */}
                {!alone && (
                  <span
                    className={cn(
                      "truncate leading-4 text-13 font-act tracking-normal",
                      !calm && needsYou(a) ? "text-warning-ink" : "text-(color:--text-quiet)"
                    )}
                  >
                    {line2}
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
            onClick={cancelSignIn}
            className={cn("rounded-md px-1.5 text-13 text-muted-foreground hover:bg-(--nav-hover) hover:text-foreground", FOCUS, HOVER, roomy ? "h-11" : "mt-0.5 h-6")}
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
