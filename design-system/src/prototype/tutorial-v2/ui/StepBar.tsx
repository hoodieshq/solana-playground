import { ChevronDown } from "lucide-react"

import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"

import { STEPS } from "../data"
import { useStore } from "../store"
import { StepGlyph } from "./StepGlyph"
import { StepRing } from "./StepRing"
import { FOCUS } from "./type"

type BarProps = { viewing: number | null; onPick: (step: number) => void }

/** The tutorial's steps across the top of the chat: the ring and "Step 2 of 4 · Build" on one line, as a
 * project's bar has them (Nikita, 20 Nov: four bars here and a line there were two patterns for one thing).
 * The line opens the steps as the phone's drawer lists them, and a reached step is picked there. It sits 12
 * under the head's rule and 12 over the chat */
export function StepBar({ viewing, onPick }: BarProps) {
  const { s } = useStore()
  const finished = s.passed.every(Boolean)
  const where = !s.started ? `${STEPS.length} steps` : finished ? "Done" : `Step ${s.step + 1} of ${STEPS.length}`
  const name = s.started && !finished ? STEPS[s.step].short : null

  return (
    <nav aria-label="Tutorial steps" className="shrink-0 px-5 py-3">
      <DropdownMenu>
        <DropdownMenuTrigger
          disabled={!s.started}
          className={cn(
            "group -mx-1.5 flex h-6 items-center gap-1.5 rounded-md px-1.5 text-13 leading-5 font-label outline-none hover:bg-surface-hover disabled:hover:bg-transparent data-[state=open]:bg-surface-hover",
            FOCUS
          )}
        >
          <StepRing done={finished ? STEPS.length : s.passed.filter(Boolean).length} of={STEPS.length} />
          <span className="ml-0.5 text-muted-foreground tabular-nums">{where}</span>
          {name && (
            <>
              <span aria-hidden="true" className="text-subtle">
                ·
              </span>
              <span className="font-act text-foreground">{name}</span>
            </>
          )}
          {s.started && (
            <span
              aria-hidden="true"
              className="flex size-3.5 text-muted-foreground transition-transform duration-150 group-data-[state=open]:rotate-180 motion-reduce:transition-none [&>svg]:size-full"
            >
              <ChevronDown aria-hidden="true" strokeWidth={1.5} className="size-full" />
            </span>
          )}
        </DropdownMenuTrigger>
        {/* A row keeps 10 at its sides, as above and below its 20 line: at 6 the number and Now touched the
            lit row's edges. The menu sits 8 to the left, so the numbers stand under the trigger's "Step"
            (the menu's 4 and the row's 10 against the trigger's 6) */}
        <DropdownMenuContent align="start" alignOffset={-8} className="w-64">
          {STEPS.map((step, i) => {
            const done = s.passed[i]
            const current = !finished && i === s.step && !done
            const reached = done || i <= s.step
            const looking = viewing === i && (finished || viewing !== s.step)
            return (
              <DropdownMenuItem
                key={step.id}
                disabled={!reached}
                onSelect={() => onPick(i)}
                aria-current={looking ? "location" : current ? "step" : undefined}
                className={cn("min-h-10 gap-3 px-2.5", (current || looking) && "bg-foreground/[0.06]")}
              >
                <StepGlyph i={i} done={done} current={current} className={current ? undefined : "bg-foreground/10"} />
                <span className="min-w-0 flex-1 truncate">{step.title}</span>
                {(done || current) && <span className="shrink-0 text-caption text-muted-foreground">{done ? "Done" : "Now"}</span>}
              </DropdownMenuItem>
            )
          })}
        </DropdownMenuContent>
      </DropdownMenu>
    </nav>
  )
}
