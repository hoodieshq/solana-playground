import { Braces, Check, ChevronLeft, Globe } from "lucide-react"
import { Fragment, useState, type ReactNode } from "react"

import { Button } from "@/components/ui/button"
import { Popover, PopoverAnchor, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { StatusDot } from "@/components/ui/status-dot"
import { cn } from "@/lib/utils"

import type { Health, StatusRow } from "../../navStates"
import { openSettings } from "../../settings/open"
import { AssistantMark } from "../../ui/AssistantMark"
import { view as shownView } from "../../view"
import { soon } from "../Catalog"
import { healthWith, MODELS, networksFor, setChoices, useChoices, withChoices } from "./choices"
import { FOCUS, HOVER, Tip, useRoomy } from "./parts"

/** The chip's dot: green while all is well, the same dot the popover's Network row shows for the network
 * the chip names (Almaz, 17 Nov: a grey dot here beside a green one in the popover read as out of sync);
 * a purple pulse while connecting, amber with a ring cut into the ground when something needs you */
export function HealthMark({ health }: { health: Health }) {
  if (health.tone === "busy") return <StatusDot variant="running" />
  return (
    <span
      aria-hidden="true"
      className={cn("inline-block size-1.5 shrink-0 rounded-full", health.tone === "attention" ? "bg-warning shadow-[0_0_0_2px_var(--nav-bg)]" : "bg-success")}
    />
  )
}

type View = "status" | "Network" | "Assistant"

/** A status row's glyph, the ones setup's steps use for the same things */
function RowGlyph({ name }: { name: string }) {
  // The assistant's own mark, the one its messages carry in a lesson: a four point star said AI in
  // general, not ours (Almaz, 10 Nov)
  const Glyph = name === "Network" ? Globe : name === "Assistant" ? AssistantMark : Braces
  return <Glyph strokeWidth={1.75} className="size-4" />
}

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
          {/* What the row is about as a picture, its state as a dot cut into the tile's corner: set as the
              setup steps are, so the two popovers of this corner read as one family (Almaz, 10 Nov) */}
          <span aria-hidden="true" className="relative flex size-7 shrink-0 items-center justify-center rounded-lg bg-foreground/[0.07] text-foreground">
            <RowGlyph name={r.name} />
            <span className="absolute -right-0.5 -bottom-0.5 flex rounded-full shadow-[0_0_0_2px_var(--popover)]">
              <StatusDot variant={r.dot} />
            </span>
          </span>
          <Tip label={r.hint} side="top">
            <div className="flex min-w-0 flex-1 cursor-default flex-col">
              <span className="text-13 leading-5 font-act text-foreground">{r.name}</span>
              <span className={cn("truncate text-13 leading-4 font-label", r.dot === "warning" ? "text-warning-ink" : "text-muted-foreground")}>{r.value}</span>
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
      {note && <p className="mx-2 mt-1 border-t border-border pt-2 pb-1 text-13 leading-4 font-label text-muted-foreground">{note}</p>}
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
  const idOf = (o: { id?: string; name: string }) => o.id ?? o.name
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
        <p className="text-13 leading-5 font-act text-foreground">{view === "Network" ? "Network" : "Assistant model"}</p>
      </div>
      <div role="radiogroup" aria-label={view} className="flex flex-col gap-0.5">
        {options.map((o, i) => (
          <button
            key={idOf(o)}
            type="button"
            role="radio"
            aria-checked={idOf(o) === current}
            autoFocus={i === 0}
            onClick={() => pick(idOf(o))}
            className={cn("flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-left hover:bg-surface-raised", FOCUS)}
          >
            {/* The name a size up from its line, 16 against 13, so the two don't run together as two greys of
                one size did (Almaz, 25 Nov) */}
            <span className="flex min-w-0 flex-1 flex-col gap-0.5">
              <span className="text-16 leading-6 text-foreground">{o.name}</span>
              <span className={cn("text-13 leading-5", "warn" in o && o.warn ? "text-warning-ink" : "text-muted-foreground")}>{o.hint}</span>
            </span>
            {idOf(o) === current && <Check aria-hidden="true" className="size-4 shrink-0 text-foreground" strokeWidth={2} />}
          </button>
        ))}
      </div>
      {view === "Assistant" && (
        <div className="mx-2 mt-1 border-t border-border pt-1.5">
          {/* To Settings › Assistant, where the key's field is (Almaz, 25 Nov: it was a "not in the prototype" note) */}
          <Button
            variant="ghost"
            size="xs"
            onClick={() => {
              onClose?.()
              openSettings({ section: "assistant" })
            }}
            className="-ml-2 text-muted-foreground hover:text-foreground"
          >
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
      {/* The popover itself takes the focus as it opens: on the first Change it drew a ring nobody asked for */}
      <PopoverContent
        side={side}
        align="end"
        sideOffset={6}
        onOpenAutoFocus={(e) => {
          e.preventDefault()
          ;(e.currentTarget as HTMLElement).focus()
        }}
        className="w-[21.5rem] gap-0 rounded-(--radius-panel) p-1.5 shadow-panel outline-none"
      >
        {BESIDE || view === "status" ? (
          <StatusRows rows={withChoices(rows, c)} note={note} view={view} onChange={setView} onClose={() => setOpen(false)} />
        ) : (
          <Choose view={view} onBack={() => setView("status")} onClose={() => setOpen(false)} />
        )}
      </PopoverContent>
    </Popover>
  )
}

/** The status dot's tooltip: each status row on a line of its own, its dot, its name and its state ("Network
 * Devnet", "Assistant GLM 5.3 Flash"), read off the same rows the popover draws (Almaz, 25 Nov: one sentence
 * ran two things together, and said "off" while the field below named the model) */
export function StatusTip({ rows }: { rows: StatusRow[] }) {
  const c = useChoices()
  // One size and one colour for every word, the tooltip's own; the state in the dot, in colours dark enough
  // for the tooltip's light ground (the nav's green was lost on it) and a size up from the nav's 6 (Almaz, 25 Nov)
  const DOT: Record<StatusRow["dot"], string> = { success: "bg-[#15803d]", warning: "bg-[#b45309]", error: "bg-[#b91c1c]", idle: "bg-[#71717a]", running: "bg-[#6d28d9]" }
  return (
    <span className="grid grid-cols-[auto_auto_auto] items-center gap-x-2 gap-y-1 py-0.5">
      {withChoices(rows, c).map((r) => (
        <Fragment key={r.name}>
          <span aria-hidden="true" className={cn("size-2 rounded-full", DOT[r.dot])} />
          <span>{r.name}</span>
          <span>{r.value}</span>
        </Fragment>
      ))}
    </span>
  )
}

/** Nothing to tell: the chip shows its dot alone and keeps the word for the hover */
export const chipCalm = (health: Health) => health.tone !== "attention" && health.tone !== "busy"

/** The chip on the account row's first line: a dot and one word a person would say ("Devnet",
 * "Devnet down", "Offline"). Quiet until something needs you. Visual 20 high, hit 28 (44 on the tablet) */
export function StatusChip({ health: given, rows, note }: { health: Health; rows: StatusRow[]; note?: string }) {
  const tablet = useRoomy()
  const health = healthWith(given, useChoices())
  // Calm, the dot alone in the rail's own square (RailButton): 36, the whole square lit under the pointer and
  // its tooltip to the right, as the folded nav's dot. The pill round a lone dot was a 20px target and its
  // tooltip covered the row (Almaz, 25 Nov)
  if (chipCalm(health))
    return (
      <StatusPopover
        rows={rows}
        note={note}
        side="top"
        trigger={
          <Tip label={<StatusTip rows={rows} />}>
            <PopoverTrigger asChild>
              <button
                type="button"
                aria-label={`Status: ${health.word}. ${health.tip}`}
                className={cn("flex shrink-0 items-center justify-center rounded-lg hover:bg-(--nav-hover) active:bg-surface-hover data-[state=open]:bg-(--nav-hover)", FOCUS, HOVER, tablet ? "size-11" : "size-9")}
              >
                <HealthMark health={health} />
              </button>
            </PopoverTrigger>
          </Tip>
        }
      />
    )
  return (
    <StatusPopover
      rows={rows}
      note={note}
      side="top"
      trigger={
        <Tip label={<StatusTip rows={rows} />} side="top">
          <PopoverTrigger asChild>
            <button type="button" aria-label={`Status: ${health.word}. ${health.tip}`} className={cn("group/chip flex items-center rounded-full", FOCUS, tablet ? "h-11" : "h-7")}>
              <span
                className={cn(
                  "flex items-center gap-1.5 rounded-full px-2 text-13 font-act tracking-normal whitespace-nowrap group-hover/chip:bg-(--nav-hover) group-data-[state=open]/chip:bg-(--nav-hover)",
                  HOVER,
                  tablet ? "h-7" : "h-5",
                  health.tone === "attention" ? "text-warning-ink" : "text-(color:--text-quiet)"
                )}
              >
                <HealthMark health={health} />
                {/* Trouble or a wait keeps its word in view; calm has the square above */}
                {health.word}
              </span>
            </button>
          </PopoverTrigger>
        </Tip>
      }
    />
  )
}
