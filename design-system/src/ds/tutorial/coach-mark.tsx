import * as React from "react"
import { PanelLeft } from "lucide-react"

import { Button } from "@/components/ui/button"
import { CoachMark } from "@/components/ui/coach-mark"

import { Block } from "../parts"

function CoachMarkBlock() {
  const [open, setOpen] = React.useState(false)
  return (
    <Block
      id="coach-mark"
      title="Coach mark"
      source="playground"
      registry="coach-mark"
      className="min-h-28 items-start"
      note="A one time hint beside what it is about, in the raised tip's look and on one line. It goes after six seconds or at the first press or key anywhere, and clicks go through it. Put it in a relative box next to its subject; side says which way it stands off. useCoachMark(storageKey, when) shows it once, the first time when turns true, and remembers in storage. duration 0 and dismissOnInput false keep it, as here."
    >
      <div className="relative">
        <Button variant="ghost" size="icon" aria-label="Menu" className="text-muted-foreground">
          <PanelLeft />
        </Button>
        <CoachMark duration={0} dismissOnInput={false}>
          The menu is folded to icons while you learn
        </CoachMark>
      </div>
      <div className="relative ml-auto self-end">
        <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
          Show it the real way
        </Button>
        <CoachMark side="top" open={open} onDismiss={() => setOpen(false)} className="right-0 left-auto">
          Gone in six seconds, or at the next press
        </CoachMark>
      </div>
    </Block>
  )
}

export { CoachMarkBlock }
