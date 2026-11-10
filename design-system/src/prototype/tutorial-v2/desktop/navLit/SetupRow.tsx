import { ChevronRight } from "lucide-react"
import { useState } from "react"

import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { SetupListIndicator, SetupListItem } from "@/components/ui/setup-list"
import { cn } from "@/lib/utils"

import { soon } from "../Catalog"
import { FOCUS, HOVER, Tip, useRoomy, useTablet } from "./parts"
import type { SetupView } from "./setup"
import { LitIcon } from "./icons"
import { ProgressRing } from "./ProgressRing"
import { Choose } from "./StatusChip"

/* The nav has no red: a step that needs you is amber, as the chip is */
const WARN_INDICATOR = "group-data-[status=warn]/setup-item:border-warning"

/** The four steps, set as the Status popover sets its rows: a small quiet heading with the count, then
 * a row a step, the name over what it's for (or, once done, what it's set to). The assistant and the
 * network open their choices in place, the same ones Status has; a pick finishes the step */
export function SetupSteps({ setup }: { setup: SetupView }) {
  const [view, setView] = useState<"steps" | "Assistant" | "Network">("steps")
  if (view !== "steps") return <Choose view={view} onBack={() => setView("steps")} />
  const opens = (i: number) => (i === 0 ? () => setView("Assistant") : i === 1 ? () => setView("Network") : soon)
  return (
    <div className="flex flex-col">
      <div className="flex items-center justify-between px-2 pt-1 pb-1.5 text-[0.75rem] leading-4 font-act text-(color:--text-quiet)">
        <span>Get set up</span>
        <span className="tabular-nums">{`${setup.done} of ${setup.total} done`}</span>
      </div>
      <ul className="flex flex-col">
        {setup.steps.map((step, i) => {
          const body = (
            <>
              <SetupListIndicator className={cn("mt-0.5 self-start", WARN_INDICATOR)} />
              <span className="flex min-w-0 flex-1 flex-col">
                <span className={cn("text-[0.8125rem] leading-[1.125rem] font-act", step.state === "done" ? "text-muted-foreground" : "text-foreground")}>{step.label}</span>
                <span className={cn("truncate text-[0.75rem] leading-4 font-label", step.state === "warn" ? "text-warning-ink" : "text-muted-foreground")}>
                  {step.state === "todo" ? step.hint : step.value}
                </span>
              </span>
            </>
          )
          return step.state === "todo" ? (
            <SetupListItem key={step.label} className="h-auto p-0">
              <button type="button" onClick={opens(i)} className={cn("flex min-h-12 w-full items-center gap-2.5 rounded-lg px-2 py-1.5 text-left hover:bg-surface-raised", FOCUS)}>
                {body}
                <ChevronRight aria-hidden="true" className="size-4 shrink-0 text-muted-foreground" />
              </button>
            </SetupListItem>
          ) : (
            <SetupListItem key={step.label} status={step.state} className="h-auto min-h-12 items-center px-2 py-1.5">
              {body}
            </SetupListItem>
          )
        })}
      </ul>
    </div>
  )
}

type Props = {
  setup: SetupView
  open: boolean
  onOpenChange: (open: boolean) => void
  onHide: () => void
}

/** "Get set up" above the account while setup is unfinished and not hidden. Its ring fills a step
 * done. When one step is left the row names it. The × (on hover, always on the tablet) hides the
 * row; the account menu brings it back */
export function SetupRow({ setup, open, onOpenChange, onHide }: Props) {
  const tablet = useTablet()
  const roomy = useRoomy()
  return (
    <div className="group/row relative">
      <Popover open={open} onOpenChange={onOpenChange}>
        <Tip label={setup.tip}>
          <PopoverTrigger asChild>
            <button
              type="button"
              aria-label={`${setup.label}, ${setup.done} of ${setup.total} done`}
              className={cn(
                "flex w-full items-center gap-2.5 rounded-lg text-left text-foreground hover:bg-(--nav-hover) active:bg-surface-hover data-[state=open]:bg-(--nav-hover)",
                FOCUS,
                HOVER,
                roomy ? "h-11 px-2 pr-12 text-control" : cn("h-8 px-2 text-[0.875rem] leading-5", tablet ? "pr-8" : "group-focus-within/row:pr-8 group-hover/row:pr-8"),
                "font-act tracking-[-0.005em]"
              )}
            >
              {/* As wide as the avatar under it, the ring on its centre, so both rows' words start on one line */}
              <span aria-hidden="true" className={cn("flex w-8 shrink-0 items-center justify-center", roomy ? "h-6" : "h-5")}>
                <ProgressRing done={setup.done} of={setup.total} size={roomy ? 22 : 20} />
              </span>
              {/* No 1/4 after it: the ring says how far, the tip and the popover say it in numbers */}
              <span className="min-w-0 flex-1 truncate">{setup.label}</span>
            </button>
          </PopoverTrigger>
        </Tip>
        <PopoverContent side="top" align="start" sideOffset={6} className="w-80 gap-0 rounded-(--radius-panel) p-1.5 shadow-panel">
          <SetupSteps setup={setup} />
        </PopoverContent>
      </Popover>
      <Tip label="Hide. It stays in the account menu" side="top">
        <button
          type="button"
          onClick={onHide}
          aria-label="Hide setup"
          className={cn(
            "absolute top-1/2 right-1 flex -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground hover:bg-surface-raised hover:text-foreground [&>svg]:size-3.5",
            FOCUS,
            roomy ? "size-11" : tablet ? "size-6" : "size-6 opacity-0 group-focus-within/row:opacity-100 group-hover/row:opacity-100 focus-visible:opacity-100"
          )}
        >
          <LitIcon name="close" />
        </button>
      </Tip>
    </div>
  )
}
