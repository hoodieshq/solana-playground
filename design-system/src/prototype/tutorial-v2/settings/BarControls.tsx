import { ChevronDown } from "lucide-react"

import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuRadioGroup, DropdownMenuRadioItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"

import { applySettingsState } from "./bar"
import { SETTINGS_STATES, useSettingsState, type SettingsState } from "./design"

const IDS = Object.keys(SETTINGS_STATES) as SettingsState[]

/** The prototype bar's Settings control: one menu of states, as Programs folds its own. A pick sets the
 * state up once, even the one already picked; from there it's the live page */
export function SettingsControls() {
  const state = useSettingsState()
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="max-w-44">
          <span className="truncate">{`Settings: ${SETTINGS_STATES[state]}`}</span>
          <ChevronDown />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="max-h-[80vh] w-56 overflow-y-auto">
        <DropdownMenuRadioGroup value={state}>
          {IDS.map((id) => (
            <DropdownMenuRadioItem key={id} value={id} onSelect={() => applySettingsState(id)}>
              {SETTINGS_STATES[id]}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
