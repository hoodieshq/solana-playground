import { ChevronDown } from "lucide-react"
import { Fragment } from "react"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { StatusDot } from "@/components/ui/status-dot"

import { setNavState } from "../navStates"
import { NP_NEXT_STATES, setNewProjectState, useNewProjectState, type NextStateId } from "./design"

const NEXT_IDS = Object.keys(NP_NEXT_STATES) as NextStateId[]

/** First Light's states under their groups, in the spec's order */
const NEXT_GROUPS = NEXT_IDS.reduce<{ group?: string; ids: NextStateId[] }[]>((all, id) => {
  const group = "group" in NP_NEXT_STATES[id] ? (NP_NEXT_STATES[id] as { group: string }).group : undefined
  const last = all.at(-1)
  if (last && last.group === group) last.ids.push(id)
  else all.push({ group, ids: [id] })
  return all
}, [])

/** The prototype bar's New project control: one menu with First Light's states. A state that needs
 * a nav environment sets the nav state with it */
export function NewProjectControls() {
  const state = useNewProjectState()
  const text = `NP: ${NP_NEXT_STATES[state].label}`

  const pick = (id: string) => {
    const nav = (NP_NEXT_STATES[id as NextStateId] as { nav?: Parameters<typeof setNavState>[0] }).nav
    if (nav) setNavState(nav)
    setNewProjectState(id as NextStateId)
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
        <DropdownMenuRadioGroup value={state} onValueChange={pick}>
          {NEXT_GROUPS.map((g) => (
            <Fragment key={g.group ?? "live"}>
              {g.group && <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">{g.group}</DropdownMenuLabel>}
              {g.ids.map((id) => (
                <DropdownMenuRadioItem key={id} value={id}>
                  {NP_NEXT_STATES[id].label}
                </DropdownMenuRadioItem>
              ))}
            </Fragment>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
