import { ArrowUpRight, ChevronDown, RotateCcw } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Segmented, SegmentedItem } from "@/components/ui/segmented"

import { NewProjectControls } from "./newProject/BarControls"
import { TutorialsControls } from "./desktop/TutorialsBar"
import { ProgramsControls } from "./programs/BarControls"
import { SettingsControls } from "./settings/BarControls"
import { NAV_STATES, setNavDesign, setNavState, setWalletDesign, useNavDesign, useNavState, useWalletDesign, type NavDesign, type NavStateId, type WalletDesign } from "./navStates"
import { switchView, view, type View } from "./view"

const NAV_IDS = Object.keys(NAV_STATES) as NavStateId[]

/** Which state the nav draws, to compare them. The current nav has the prototype's own nav first; Lit
 * Path has no such thing */
function NavStatePicker() {
  const [id, state] = useNavState()
  const design = useNavDesign()
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="max-w-72">
          <span className="truncate">{`State: ${state.label}`}</span>
          <ChevronDown />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-72">
        <DropdownMenuRadioGroup value={id} onValueChange={(v) => setNavState(v as NavStateId)}>
          {design === "current" && (
            <>
              <DropdownMenuRadioItem value={NAV_IDS[0]}>{NAV_STATES[NAV_IDS[0]].label}</DropdownMenuRadioItem>
              <DropdownMenuSeparator />
            </>
          )}
          <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">As the product draws it</DropdownMenuLabel>
          {NAV_IDS.slice(1).map((k) => (
            <DropdownMenuRadioItem key={k} value={k}>
              {NAV_STATES[k].label}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

/** Which nav draws: Lit Path, the redesign, or the product's current one. In the bar, one click away */
function NavDesignSwitch() {
  const design = useNavDesign()
  return (
    <Segmented value={design} onValueChange={(v) => v && setNavDesign(v as NavDesign)} aria-label="Nav design" className="pill h-7! rounded-full! border-0! p-0!">
      <SegmentedItem value="current" className="rounded-full! px-3!">
        Current nav
      </SegmentedItem>
      <SegmentedItem value="lit" className="rounded-full! px-3!">
        Lit Path
      </SegmentedItem>
    </Segmented>
  )
}

// v1 is on this server in development and on its own stand once deployed (prototype/vercel-v2/build.sh)
const V1 = import.meta.env.VITE_V1_URL ?? "/prototype/tutorial/"

/** The prototype's own controls, in one place for both views: a thin strip across the top, over
 * the phone and tablet frames and over the desktop screen alike, so switching never moves them. A lighter
 * ground and small type keep it apart from the product, so it doesn't read as the app's header */
/** The wallet chip at the console bar's end, before and after, to compare live */
function WalletSwitch() {
  const design = useWalletDesign()
  return (
    <Segmented value={design} onValueChange={(v) => v && setWalletDesign(v as WalletDesign)} aria-label="Wallet chip" className="pill h-7! rounded-full! border-0! p-0!">
      <SegmentedItem value="before" className="rounded-full! px-3!">
        Wallet: Before
      </SegmentedItem>
      <SegmentedItem value="after" className="rounded-full! px-3!">
        After
      </SegmentedItem>
    </Segmented>
  )
}

export function PrototypeBar({ onReset }: { onReset: () => void }) {
  return (
    <header
      aria-label="Prototype controls"
      // The controls take what they need and the title what's left: with Tutorials beside Programs the
      // even sides pushed Open v1 and Reset off the bar at 1440
      className="grid h-10 shrink-0 grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-3 border-b border-border bg-surface-raised px-4 text-caption text-muted-foreground"
    >
      <span className="truncate">Solana Playground · Oak · prototype</span>
      <Segmented
        value={view}
        onValueChange={(v) => v !== view && switchView(v as View)}
        aria-label="View"
        className="pill h-7! rounded-full! border-0! p-0!"
      >
        <SegmentedItem value="phone" className="rounded-full! px-3!">
          Phone
        </SegmentedItem>
        {/* The tablet both ways: held upright it's under 1024 and gets the phone's screens, held
            landscape it's the desktop's at 1152 */}
        <SegmentedItem value="portrait" className="rounded-full! px-3!">
          Tablet 820
        </SegmentedItem>
        <SegmentedItem value="tablet" className="rounded-full! px-3!">
          Tablet 1152
        </SegmentedItem>
        <SegmentedItem value="desktop" className="rounded-full! px-3!">
          Desktop
        </SegmentedItem>
      </Segmented>
      <div className="flex items-center gap-1 justify-self-end">
        <WalletSwitch />
        <NavDesignSwitch />
        <NavStatePicker />
        <NewProjectControls />
        <TutorialsControls />
        <ProgramsControls />
        <SettingsControls />
        {/* v1 as shown on 10/23, for the side by side. It gets no link back: it stays as it was */}
        {/* Short, so the bar fits at 1440 with Tutorials in it; the full words are in the tips */}
        <Button variant="ghost" size="sm" asChild>
          <a href={`${V1}${view === "phone" ? "" : `?view=${view}`}`} title="Open v1" aria-label="Open v1">
            v1
            <ArrowUpRight />
          </a>
        </Button>
        <Button variant="ghost" size="icon-sm" onClick={onReset} title="Reset" aria-label="Reset">
          <RotateCcw />
        </Button>
      </div>
    </header>
  )
}
