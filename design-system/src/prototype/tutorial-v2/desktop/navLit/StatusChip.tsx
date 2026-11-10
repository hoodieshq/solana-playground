import { Check, ChevronLeft } from "lucide-react"
import { useState, type ReactNode } from "react"

import { Button } from "@/components/ui/button"
import { Popover, PopoverAnchor, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { StatusDot } from "@/components/ui/status-dot"
import { cn } from "@/lib/utils"

import type { Health, StatusRow } from "../../navStates"
import { openSettings } from "../../settings/open"
import { view as shownView } from "../../view"
import { soon } from "../Catalog"
import { healthWith, MODELS, networksFor, setChoices, useChoices, withChoices } from "./choices"
import { FOCUS, HOVER, Tip, useRoomy } from "./parts"

/** The chip's dot: quiet grey while all is well (green only inside the popover), a purple pulse while
 * connecting, amber with a ring cut into the ground when something needs you */
export function HealthMark({ health }: { health: Health }) {
  if (health.tone === "busy") return <StatusDot variant="running" />
  return (
    <span
      aria-hidden="true"
      className={cn("inline-block size-1.5 shrink-0 rounded-full", health.tone === "attention" ? "bg-warning shadow-[0_0_0_2px_var(--nav-bg)]" : "bg-(--text-quiet)")}
    />
  )
}

type View = "status" | "Network" | "Assistant"

/** The phone views draw the popover in the menu sheet, full width with no room beside it: there a
 * row's choices swap in place of the rows, with a back row */
const BESIDE = shownView === "desktop" || shownView === "tablet"

/** Network, Assistant, Rust analyzer, one row each as Twingate and Qatalog set them: the dot, the name
 * over its state in small type, and at most two quiet actions on the right, centred on the row. What
 * each one is for is the name's tooltip, so a row stays two lines. Change (and Connect) opens that
 * row's choices in a panel beside the popover, level with the row, as the account menu's Help opens
 * (Almaz, 9 Nov): the rows stay in view and don't jump */
function StatusRows({ rows, note, view, onChange, onClose }: { rows: StatusRow[]; note?: string; view: View; onChange: (v: View) => void; onClose: () => void }) {
  const opens = (r: StatusRow, a: string) => (a === "Change" || a === "Connect") && (r.name === "Network" || r.name === "Assistant")
  return (
    // No visible title: it opens from the status chip, and the three rows say what they are (Almaz, 11/06)
    <div role="group" aria-label="Status" className="flex flex-col">
      {rows.map((r) => (
        <Popover key={r.name} open={BESIDE && view === r.name} onOpenChange={(v) => onChange(v ? (r.name as View) : "status")}>
        <PopoverAnchor asChild>
        <div className={cn("flex min-h-12 items-center gap-2.5 rounded-lg px-2 py-1.5", view === r.name && "bg-surface-raised")}>
          <span className="flex h-[1.125rem] items-center self-start pt-px">
            <StatusDot variant={r.dot} />
          </span>
          <Tip label={r.hint} side="top">
            <div className="flex min-w-0 flex-1 cursor-default flex-col">
              <span className="text-[0.8125rem] leading-[1.125rem] font-act text-foreground">{r.name}</span>
              <span className={cn("truncate text-[0.75rem] leading-4 font-label", r.dot === "warning" ? "text-warning-ink" : "text-muted-foreground")}>{r.value}</span>
            </div>
          </Tip>
          {r.actions && (
            <div className="flex shrink-0 gap-0.5">
              {r.actions.map((a) =>
                opens(r, a) && !BESIDE ? (
                  <Button key={a} variant="ghost" size="xs" onClick={() => onChange(r.name as View)} className="text-muted-foreground hover:text-foreground">
                    {a}
                  </Button>
                ) : opens(r, a) ? (
                  <PopoverTrigger key={a} asChild>
                    <Button variant="ghost" size="xs" className="text-muted-foreground hover:text-foreground data-[state=open]:text-foreground">
                      {a}
                    </Button>
                  </PopoverTrigger>
                ) : (
                  <Button key={a} variant="ghost" size="xs" onClick={soon} className="text-muted-foreground hover:text-foreground">
                    {a}
                  </Button>
                )
              )}
            </div>
          )}
        </div>
        </PopoverAnchor>
          {(r.name === "Network" || r.name === "Assistant") && (
            <PopoverContent side="right" align="start" sideOffset={10} alignOffset={-6} className="w-[22rem] gap-0 rounded-(--radius-panel) p-1.5 shadow-panel">
              <Choose view={r.name} bare onBack={() => onChange("status")} onClose={onClose} />
            </PopoverContent>
          )}
        </Popover>
      ))}
      {note && <p className="mx-2 mt-1 border-t border-border pt-2 pb-1 text-[0.75rem] leading-4 font-label text-muted-foreground">{note}</p>}
    </div>
  )
}

/** A row's choices, in the popover in place of the rows: back, the title, then one option a line with
 * a check on the current one. A pick applies and goes back, so you see it in the row. `bare` drops the
 * back row, for Settings, which opens the list straight from its Model row. `onClose` closes the
 * popover, for Add custom RPC, which carries on in Settings */
export function Choose({ view, onBack, bare, onClose }: { view: "Network" | "Assistant"; onBack: () => void; bare?: boolean; onClose?: () => void }) {
  const c = useChoices()
  const options = view === "Network" ? networksFor(shownView, c) : MODELS
  const current = view === "Network" ? c.network : c.model
  const pick = (name: string) => {
    setChoices(view === "Network" ? { network: name, picked: true } : { model: name, connected: true })
    onBack()
  }
  return (
    <div className="flex flex-col">
      <div className={cn("flex items-center gap-1 pb-1", bare && "hidden")}>
        <button
          type="button"
          onClick={onBack}
          aria-label="Back to status"
          className={cn("flex size-7 items-center justify-center rounded-md text-muted-foreground hover:bg-surface-raised hover:text-foreground", FOCUS)}
        >
          <ChevronLeft className="size-4" strokeWidth={2} />
        </button>
        <p className="text-[0.8125rem] leading-[1.125rem] font-act text-foreground">{view === "Network" ? "Network" : "Assistant model"}</p>
      </div>
      <div role="radiogroup" aria-label={view} className="flex flex-col gap-0.5">
        {options.map((o, i) => (
          <button
            key={o.name}
            type="button"
            role="radio"
            aria-checked={o.name === current}
            autoFocus={i === 0}
            onClick={() => pick(o.name)}
            className={cn("flex min-h-12 items-center gap-2.5 rounded-lg px-2 py-1.5 text-left hover:bg-surface-raised", FOCUS)}
          >
            <span className="flex min-w-0 flex-1 flex-col">
              <span className="text-[0.8125rem] leading-[1.125rem] font-act text-foreground">{o.name}</span>
              <span className={cn("text-[0.75rem] leading-4 font-label", "warn" in o && o.warn ? "text-warning-ink" : "text-muted-foreground")}>{o.hint}</span>
            </span>
            {o.name === current && <Check aria-hidden="true" className="size-4 shrink-0 text-foreground" strokeWidth={2} />}
          </button>
        ))}
      </div>
      {view === "Assistant" && (
        <div className="mx-2 mt-1 border-t border-border pt-1.5">
          <Button variant="ghost" size="xs" onClick={soon} className="-ml-2 text-muted-foreground hover:text-foreground">
            Use your own API key
          </Button>
        </div>
      )}
      {/* An option of the list, as Use your own API key is under the models: the field opens in Settings */}
      {view === "Network" && (
        <div className="mx-2 mt-1 border-t border-border pt-1.5">
          <Button
            variant="ghost"
            size="xs"
            onClick={() => {
              onClose?.()
              openSettings({ section: "network", rpcForm: true })
            }}
            className="-ml-2 text-muted-foreground hover:text-foreground"
          >
            Add custom RPC
          </Button>
        </div>
      )}
    </div>
  )
}

/** The Status popover, from the chip (above it) or from the rail's dot (to its right). It opens on the
 * rows every time; Change opens that row's choices beside it */
export function StatusPopover({ rows, note, side, trigger }: { rows: StatusRow[]; note?: string; side: "top" | "right"; trigger: ReactNode }) {
  const c = useChoices()
  const [view, setView] = useState<View>("status")
  const [open, setOpen] = useState(false)
  return (
    <Popover
      open={open}
      onOpenChange={(v) => {
        setOpen(v)
        setView("status")
      }}
    >
      {trigger}
      <PopoverContent side={side} align="end" sideOffset={6} className="w-80 gap-0 rounded-(--radius-panel) p-1.5 shadow-panel">
        {BESIDE || view === "status" ? (
          <StatusRows rows={withChoices(rows, c)} note={note} view={view} onChange={setView} onClose={() => setOpen(false)} />
        ) : (
          <Choose view={view} onBack={() => setView("status")} onClose={() => setOpen(false)} />
        )}
      </PopoverContent>
    </Popover>
  )
}

/** The chip on the account row's first line: a dot and one word a person would say ("Devnet",
 * "Devnet down", "Offline"). Quiet until something needs you. Visual 20 high, hit 28 (44 on the tablet) */
export function StatusChip({ health: given, rows, note }: { health: Health; rows: StatusRow[]; note?: string }) {
  const tablet = useRoomy()
  const health = healthWith(given, useChoices())
  return (
    <StatusPopover
      rows={rows}
      note={note}
      side="top"
      trigger={
        <Tip label={health.tip} side="top">
          <PopoverTrigger asChild>
            <button type="button" aria-label={`Status: ${health.word}. ${health.tip}`} className={cn("group/chip flex items-center rounded-full", FOCUS, tablet ? "h-11" : "h-7")}>
              <span
                className={cn(
                  "flex items-center gap-1.5 rounded-full px-2 text-[0.75rem] font-act tracking-[0.01em] whitespace-nowrap group-hover/chip:bg-(--nav-hover) group-data-[state=open]/chip:bg-(--nav-hover)",
                  HOVER,
                  tablet ? "h-7" : "h-5",
                  health.tone === "attention" ? "text-warning-ink" : "text-(color:--text-quiet)"
                )}
              >
                <HealthMark health={health} />
                {health.word}
              </span>
            </button>
          </PopoverTrigger>
        </Tip>
      }
    />
  )
}
