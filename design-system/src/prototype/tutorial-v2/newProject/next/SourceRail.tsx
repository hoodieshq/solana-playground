import { Blocks, ChevronRight, GraduationCap, Plus, Sparkle } from "lucide-react"
import { Tabs } from "radix-ui"
import type { ReactNode } from "react"

import { cn } from "@/lib/utils"

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

type Row = { value: Source; label: string; line?: string; glyph: ReactNode; notch?: boolean }

/** A second line only when the source can't be used as usual (CONSENSUS.md, section 8) */
function rows(env: Env, into: boolean): Row[] {
  const off = !env.online
  const all: Row[] = [
    { value: "starter", label: "Framework starter", glyph: <Plus /> },
    { value: "example", label: "Example program", line: off ? "Basics only while offline" : undefined, glyph: <Blocks />, notch: off },
    { value: "import", label: "Import from GitHub", line: off ? "Needs a connection" : undefined, glyph: <GitHubMark />, notch: off },
    {
      value: "describe",
      label: "Describe it",
      line: off ? "Needs a connection" : env.assistant === "off" ? "Assistant is off" : env.assistant === "limit" ? "Assistant limit reached" : undefined,
      glyph: <Sparkle />,
      notch: off,
    },
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
              <span className="text-base leading-5 font-act text-foreground">{r.label}</span>
              {r.line && <span className="truncate text-[0.8125rem] leading-[1.125rem] text-(color:--text-quiet)">{r.line}</span>}
            </span>
            <ChevronRight aria-hidden="true" className="size-4 shrink-0 text-(color:--text-quiet)" />
          </button>
        ))}
    </div>
  )
}

/** The four ways to start (CONSENSUS.md, 3.4): vertical tabs, arrows move and pick. A busy dialog
 * holds every row but the current one */
export function SourceRail({
  value,
  env,
  into,
  busy,
  onPointerPick,
  onTutorial,
}: {
  value: Source
  env: Env
  into: boolean
  busy: boolean
  onPointerPick: (s: Source) => void
  onTutorial: () => void
}) {
  return (
    <div className="flex min-h-0 flex-col border-r border-border px-2 pt-3 pb-3">
      <Tabs.List aria-label="Start from" className="flex flex-col gap-0.5">
        {rows(env, into).map((r) => {
          const current = r.value === value
          return (
            <Tabs.Trigger
              key={r.value}
              value={r.value}
              disabled={busy && !current}
              onPointerUp={() => onPointerPick(r.value)}
              className={cn(
                "group/row flex min-h-9 items-start gap-2.5 rounded-lg p-2 text-left outline-none focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-(--ring) disabled:pointer-events-none disabled:opacity-50 [html.touch_&]:min-h-11 [html.touch_&]:py-3",
                current && "bg-(--np-current)"
              )}
            >
              <span
                aria-hidden="true"
                className={cn(
                  "relative grid size-5 shrink-0 place-items-center [&>svg]:size-4",
                  current ? "text-foreground" : "text-muted-foreground group-hover/row:text-foreground"
                )}
              >
                {r.glyph}
                {r.notch && <span className="absolute -top-0.5 -right-0.5 size-1.5 rounded-full bg-warning shadow-[0_0_0_2px_var(--surface-panel)]" />}
              </span>
              <span className="flex min-w-0 flex-col">
                <span className={cn("text-sm leading-5 font-act whitespace-nowrap", current ? "text-foreground" : "text-muted-foreground group-hover/row:text-foreground")}>{r.label}</span>
                {r.line && <span className={cn("truncate text-xs leading-4 font-[380]", current ? "text-muted-foreground" : "text-(color:--text-quiet)")}>{r.line}</span>}
              </span>
            </Tabs.Trigger>
          )
        })}
      </Tabs.List>
      <button
        type="button"
        onClick={onTutorial}
        className="group/tut mt-auto flex min-h-9 items-center gap-2.5 rounded-lg p-2 text-left outline-none focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-(--ring) [html.touch_&]:min-h-11"
      >
        {/* A row like the sources above, in their type and icon column, so it reads as one more way out of
            the dialog, set apart by standing at the foot; one line, as Home's tile names it */}
        <span aria-hidden="true" className="grid size-5 shrink-0 place-items-center text-muted-foreground group-hover/tut:text-foreground [&>svg]:size-4">
          <GraduationCap />
        </span>
        <span className="text-sm leading-5 font-act whitespace-nowrap text-muted-foreground group-hover/tut:text-foreground">Follow a tutorial</span>
      </button>
    </div>
  )
}
