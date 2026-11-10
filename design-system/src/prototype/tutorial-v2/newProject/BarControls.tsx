import { ChevronDown } from "lucide-react"
import { Fragment } from "react"

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
import { StatusDot } from "@/components/ui/status-dot"

import { setNavState } from "../navStates"
import {
  NP_NEXT_STATES,
  NP_STATES,
  setNewProjectDesign,
  setNewProjectState,
  useNewProjectDesign,
  useNewProjectState,
  type AnyState,
  type NewProjectDesign,
  type NewProjectState,
  type NextStateId,
} from "./design"

const CURRENT_IDS = Object.keys(NP_STATES) as NewProjectState[]
const NEXT_IDS = Object.keys(NP_NEXT_STATES) as NextStateId[]

/** First Light's states under their groups, in the spec's order */
const NEXT_GROUPS = NEXT_IDS.reduce<{ group?: string; ids: NextStateId[] }[]>((all, id) => {
  const group = "group" in NP_NEXT_STATES[id] ? (NP_NEXT_STATES[id] as { group: string }).group : undefined
  const last = all.at(-1)
  if (last && last.group === group) last.ids.push(id)
  else all.push({ group, ids: [id] })
  return all
}, [])

const labelOf = (design: NewProjectDesign, state: AnyState) =>
  design === "next" ? NP_NEXT_STATES[state as NextStateId].label : NP_STATES[state as NewProjectState]

/** The prototype bar's New project control: one menu with the design and the states of the design
 * picked. A First Light state that needs a nav environment sets the nav state with it */
export function NewProjectControls() {
  const design = useNewProjectDesign()
  const state = useNewProjectState()
  const name = design === "next" ? "First Light" : "Current"
  const text = `NP: ${name}${state === "live" ? "" : ` · ${labelOf(design, state)}`}`

  const pick = (id: string) => {
    if (design === "next") {
      const nav = (NP_NEXT_STATES[id as NextStateId] as { nav?: Parameters<typeof setNavState>[0] }).nav
      if (nav) setNavState(nav)
    }
    setNewProjectState(id as AnyState)
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="max-w-44" title={text}>
          {state !== "live" && <StatusDot variant="target" />}
          <span className="truncate">{text}</span>
          <ChevronDown />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="max-h-[70vh] w-72 overflow-y-auto">
        <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">Design</DropdownMenuLabel>
        <DropdownMenuRadioGroup value={design} onValueChange={(v) => setNewProjectDesign(v as NewProjectDesign)}>
          <DropdownMenuRadioItem value="current">Current</DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="next">First Light</DropdownMenuRadioItem>
        </DropdownMenuRadioGroup>
        <DropdownMenuSeparator />
        <DropdownMenuRadioGroup value={state} onValueChange={pick}>
          {design === "current" ? (
            <>
              <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">State</DropdownMenuLabel>
              {CURRENT_IDS.map((id) => (
                <DropdownMenuRadioItem key={id} value={id}>
                  {NP_STATES[id]}
                </DropdownMenuRadioItem>
              ))}
            </>
          ) : (
            NEXT_GROUPS.map((g) => (
              <Fragment key={g.group ?? "live"}>
                {g.group && <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">{g.group}</DropdownMenuLabel>}
                {g.ids.map((id) => (
                  <DropdownMenuRadioItem key={id} value={id}>
                    {NP_NEXT_STATES[id].label}
                  </DropdownMenuRadioItem>
                ))}
              </Fragment>
            ))
          )}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
