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

import { LATER, PROG_STATES, setProgState, setProgramsDesign, useProgState, useProgramsDesign, type ProgState, type ProgramsDesign } from "./design"
import { applyProgState } from "./bar"
import { go, resetPrograms } from "./store"
import { BannerIconsLink } from "../desktop/TutorialsBar"

const IDS = Object.keys(PROG_STATES) as ProgState[]

/** The prototype bar's Programs control, folded into one menu so the bar fits at 1440: which design
 * draws Programs, and under New, which state the flow is put in */
export function ProgramsControls() {
  const design = useProgramsDesign()
  const state = useProgState()
  const label = design === "current" ? "Programs: Current" : `Programs: New · ${PROG_STATES[state]}${LATER.has(state) ? " (later)" : ""}`
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
          value={design}
          onValueChange={(v) => {
            setProgramsDesign(v as ProgramsDesign)
            if (v === "new") applyProgState(state)
            else go({ at: "catalog" })
          }}
        >
          <DropdownMenuRadioItem value="current">Current</DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="new">New</DropdownMenuRadioItem>
        </DropdownMenuRadioGroup>
        {design === "new" && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuRadioGroup
              value={state}
              onValueChange={(v) => {
                setProgState(v as ProgState)
                applyProgState(v as ProgState)
              }}
            >
              {/* Today: the programs draw in read mode. Later: in build mode, as when Native builds */}
              {[false, true].map((later) => (
                <div key={String(later)}>
                  <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">{later ? "Later: when Native builds" : "Today"}</DropdownMenuLabel>
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
          </>
        )}
        <DropdownMenuSeparator />
        <BannerIconsLink />
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
