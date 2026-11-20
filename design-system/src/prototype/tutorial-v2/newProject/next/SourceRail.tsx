import { Blocks, ChevronRight, Plus } from "lucide-react"
import { Tabs } from "radix-ui"
import type { ReactNode } from "react"

import { cn } from "@/lib/utils"

import { AssistantMark } from "../../ui/AssistantMark"
import type { Env, Source } from "./model"

/** GitHub's mark in Lucide's outline style (lucide 1.x dropped brand icons) */
export function GitHubMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={cn("size-4 shrink-0", className)}
    >
      <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4" />
      <path d="M9 18c-4.51 2-5-2-7-2" />
    </svg>
  )
}

/** `short` is the word a tab has room for; `label` is the full name, on the phone's rows and read aloud */
type Row = { value: Source; label: string; short: string; glyph: ReactNode; notch?: boolean }

/** The sources by name alone: no second line, even when one can't be used as usual (offline, the
 * assistant off or at its limit). The notch on the glyph and the pane say so (Almaz, 10 Nov) */
function rows(env: Env, into: boolean): Row[] {
  const off = !env.online
  const all: Row[] = [
    { value: "starter", label: "Framework starter", short: "Starter", glyph: <Plus /> },
    { value: "example", label: "Example program", short: "Example", glyph: <Blocks />, notch: off },
    { value: "import", label: "Import from GitHub", short: "GitHub", glyph: <GitHubMark />, notch: off },
    { value: "describe", label: "Describe it", short: "Describe", glyph: <AssistantMark />, notch: off },
  ]
  // Filling an empty project has nothing to ask the assistant to start
  return into ? all.slice(0, 3) : all
}

/** The phone's "Or start from" (CONSENSUS.md, 6.2): the three sources past the starter, each a row
 * that pushes its own page */
export function SourceRows({ env, into, busy, onOpen }: { env: Env; into: boolean; busy: boolean; onOpen: (s: Source) => void }) {
  return (
    <div className="flex flex-col">
      {rows(env, into)
        .slice(1)
        .map((r) => (
          <button
            key={r.value}
            type="button"
            disabled={busy}
            onClick={() => onOpen(r.value)}
            className="flex h-(--phone-row) items-center gap-3 rounded-xl px-2 text-left outline-none focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-(--ring) active:bg-(--np-current) disabled:opacity-50"
          >
            <span aria-hidden="true" className="relative grid size-5 shrink-0 place-items-center text-muted-foreground [&>svg]:size-5">
              {r.glyph}
              {r.notch && <span className="absolute -top-0.5 -right-0.5 size-1.5 rounded-full bg-warning shadow-[0_0_0_2px_var(--surface-base)]" />}
            </span>
            <span className="flex min-w-0 flex-1 flex-col">
              <span className="text-16 leading-5 font-act text-foreground">{r.label}</span>
            </span>
            <ChevronRight aria-hidden="true" className="size-4 shrink-0 text-(color:--text-quiet)" />
          </button>
        ))}
    </div>
  )
}

/** The four ways to start (CONSENSUS.md, 3.4), as one row of tabs across the dialog's top: arrows move
 * and pick. A busy dialog holds every tab but the current one */
export function SourceTabs({ value, env, into, busy, onPointerPick }: { value: Source; env: Env; into: boolean; busy: boolean; onPointerPick: (s: Source) => void }) {
  return (
    <Tabs.List aria-label="Start from" className="mx-6 flex shrink-0 gap-1 rounded-xl bg-foreground/[0.05] p-1">
      {rows(env, into).map((r) => {
        const current = r.value === value
        return (
          <Tabs.Trigger
            key={r.value}
            value={r.value}
            aria-label={r.label}
            disabled={busy && !current}
            onPointerUp={() => onPointerPick(r.value)}
            className={cn(
              "group/row flex h-8 min-w-0 flex-1 items-center justify-center gap-2 rounded-lg px-2 text-13 leading-5 font-act outline-none transition-colors duration-100 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-(--ring) disabled:pointer-events-none disabled:opacity-50 motion-reduce:transition-none [html.touch_&]:h-10",
              current ? "bg-foreground/[0.11] text-foreground" : "text-muted-foreground hover:text-foreground"
            )}
          >
            <span aria-hidden="true" className="relative grid size-4 shrink-0 place-items-center [&>svg]:size-4">
              {r.glyph}
              {r.notch && <span className="absolute -top-0.5 -right-0.5 size-1.5 rounded-full bg-warning shadow-[0_0_0_2px_var(--surface-panel)]" />}
            </span>
            <span className="truncate">{r.short}</span>
          </Tabs.Trigger>
        )
      })}
    </Tabs.List>
  )
}
