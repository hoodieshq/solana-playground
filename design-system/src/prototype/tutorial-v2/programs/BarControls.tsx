import { ChevronDown } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

import { LATER, PROG_STATES, setProgState, setProgramsDesign, useProgState, useProgramsDesign, type ProgState } from "./design"
import { applyProgState } from "./bar"
import { resetPrograms } from "./store"
import { BannerIconsLink } from "../desktop/TutorialsBar"

/** The bar's picks: the catalog, your programs, opening and reading today, and the build path later.
 * The rest stay reachable by ?progState= (Almaz, 11 Nov: twenty seven was too many) */
const IDS: ProgState[] = [
  "live",
  "catalog-loading",
  "catalog-failed",
  "your-programs-1",
  "your-programs-5",
  "opening",
  "open-not-found",
  "read-mid",
  "read-done",
  "build-live",
  "build-failed",
  "projects-full-deploy",
]

/** The prototype bar's Programs control: which state the redesign is put in. Current (the list as Oak
 * copied it from client-v2) left the bar once the redesign was the only one in use (Almaz, 11 Nov) */
export function ProgramsControls() {
  const design = useProgramsDesign()
  const state = useProgState()
  const label = `Programs: ${PROG_STATES[state]}${LATER.has(state) ? " (later)" : ""}`
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="max-w-44">
          <span className="truncate">{label}</span>
          <ChevronDown />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="max-h-[80vh] w-64 overflow-y-auto">
        <DropdownMenuRadioGroup
          value={design === "new" ? state : ""}
          onValueChange={(v) => {
            if (design !== "new") setProgramsDesign("new")
            setProgState(v as ProgState)
            applyProgState(v as ProgState)
          }}
        >
          {/* Today: the programs draw in read mode. Later: in build mode, as when Native builds */}
          {[false, true].map((later) => (
            <div key={String(later)}>
              <DropdownMenuLabel className="text-13 font-normal text-muted-foreground">{later ? "Later: when Native builds" : "Today"}</DropdownMenuLabel>
              {IDS.filter((id) => LATER.has(id) === later).map((id) => (
                <DropdownMenuRadioItem key={id} value={id}>
                  {PROG_STATES[id]}
                </DropdownMenuRadioItem>
              ))}
            </div>
          ))}
        </DropdownMenuRadioGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onSelect={() => {
            resetPrograms()
            setProgState("live")
          }}
        >
          Reset programs
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <BannerIconsLink />
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
