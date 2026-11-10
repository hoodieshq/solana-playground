import { useState } from "react"

import { Button } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { StatusDot } from "@/components/ui/status-dot"
import { cn } from "@/lib/utils"

import { soon } from "../desktop/Catalog"
import { setChoices, useChoices, withChoices } from "../desktop/navLit/choices"
import { Choose } from "../desktop/navLit/StatusChip"
import { useNavState } from "../navStates"
import type { Scene } from "./bar"
import { Row, usePhone } from "./Row"

type Model = { value: string; line?: string; action?: "Change" | "Connect" | "Add API key" }

/** What the Model row says, read off the Status popover's Assistant row with the picks laid over it.
 * A nav state with no rows (the prototype's own) says on or off from the picks alone */
function useModel(notAnswering: boolean): Model {
  const [, state] = useNavState()
  const c = useChoices()
  const row = state.statusRows && withChoices(state.statusRows, c).find((r) => r.name === "Assistant")
  if (!row) return c.connected ? { value: c.model, action: "Change" } : { value: "Off", action: "Connect" }
  if (row.value === "Offline") return { value: "Offline" }
  if (row.value === "Off") return { value: "Off", action: "Connect" }
  if (row.dot === "warning") return { value: c.model, line: "Limit reached. Back at 3:00 PM", action: "Add API key" }
  if (notAnswering) return { value: c.model, line: "Not answering right now", action: "Change" }
  return { value: c.model, action: "Change" }
}

/** Assistant (CONSENSUS 3.2): the model with the popover's own action, and your key while one is in use.
 * Change opens the popover's list itself, so there's no third picker */
export function AssistantGroup({ scene }: { scene: Scene }) {
  const phone = usePhone()
  const c = useChoices()
  const model = useModel(!!scene.notAnswering)
  const [choosing, setChoosing] = useState(false)
  const [confirm, setConfirm] = useState(!!scene.confirmDelete)
  const value = <span className="truncate text-caption text-muted-foreground">{model.value}</span>
  // As quiet as the Status popover's own actions
  const tap = cn("text-muted-foreground hover:text-foreground", phone && "h-9")

  return (
    <div className="flex flex-col">
      <Row
        label="Model"
        line={
          model.line && (
            <span className="flex items-center gap-2 text-[0.8125rem] leading-5 font-read text-muted-foreground">
              <StatusDot variant="warning" />
              {model.line}
            </span>
          )
        }
      >
        {value}
        {model.action === "Add API key" && (
          <Button variant="ghost" size="sm" onClick={soon} className={tap}>
            Add API key
          </Button>
        )}
        {(model.action === "Change" || model.action === "Connect") && (
          <Popover open={choosing} onOpenChange={setChoosing}>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="sm" className={tap}>
                {model.action}
              </Button>
            </PopoverTrigger>
            <PopoverContent align="end" sideOffset={6} className="w-80 gap-0 rounded-(--radius-panel) p-1.5 shadow-panel">
              <Choose view="Assistant" bare onBack={() => setChoosing(false)} />
            </PopoverContent>
          </Popover>
        )}
      </Row>
      {c.key &&
        (confirm ? (
          // The product clears the chat on delete, so it asks here instead of offering an Undo
          <div className="flex min-h-12 flex-wrap items-center justify-between gap-x-6 gap-y-1 py-2 [html.touch_&]:min-h-13">
            <p className={phone ? "text-body" : "text-control leading-5"}>{`Delete your ${c.key} key? The chat on screen clears.`}</p>
            <div className="flex shrink-0 gap-1">
              <Button variant="ghost" size="sm" autoFocus onClick={() => setConfirm(false)} className={tap}>
                Cancel
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setChoices({ key: undefined, model: "GLM 5.3 Flash" })
                  setConfirm(false)
                }}
                className={cn(tap, "text-destructive hover:text-destructive")}
              >
                Delete
              </Button>
            </div>
          </div>
        ) : (
          <Row label="Your key">
            <span className="text-caption text-muted-foreground">{c.key}</span>
            <Button variant="ghost" size="sm" onClick={() => setConfirm(true)} className={tap}>
              Delete
            </Button>
          </Row>
        ))}
    </div>
  )
}
