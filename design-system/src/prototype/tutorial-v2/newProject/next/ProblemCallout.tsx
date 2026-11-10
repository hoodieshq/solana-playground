import { ChevronDown } from "lucide-react"
import { useEffect, useRef } from "react"

import { Button } from "@/components/ui/button"
import { Callout } from "@/components/ui/callout"
import { CopyButton } from "@/components/ui/copy-button"
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer"
import { StatusDot } from "@/components/ui/status-dot"
import { cn } from "@/lib/utils"

export type CalloutAction = { label: string; onClick: () => void; disabled?: boolean }

/** A problem where it happens (CONSENSUS.md, 3.10): a neutral callout and a 6 px dot, amber when the
 * person can fix it or wait, red only when Playground failed. Red ones carry the raw error behind
 * Show details. `inline` puts the actions on the title's line (create failed). Focus moves to its
 * first action when it appears, if `focus`. On the phone the details open in a drawer (6.2) */
export function ProblemCallout({
  tone,
  title,
  cause,
  primary,
  secondary,
  details,
  open,
  onToggle,
  inline,
  focus = true,
  className,
}: {
  tone: "warning" | "error"
  title: string
  cause?: string
  primary?: CalloutAction
  secondary?: CalloutAction
  details?: string
  open?: boolean
  onToggle?: () => void
  inline?: boolean
  focus?: boolean
  className?: string
}) {
  const first = useRef<HTMLButtonElement>(null)
  const phone = document.documentElement.classList.contains("phone")
  useEffect(() => {
    if (focus) first.current?.focus()
  }, [focus])
  const actions = (primary || details) && (
    <div className={cn("flex items-center gap-2", inline ? "shrink-0" : "mt-2")}>
      {primary && (
        <Button ref={first} variant="outline" size="sm" disabled={primary.disabled} onClick={primary.onClick} className="[html.phone_&]:h-12 [html.touch_&]:h-11">
          {primary.label}
        </Button>
      )}
      {secondary && (
        <Button variant="ghost" size="sm" onClick={secondary.onClick} className="[html.phone_&]:h-12 [html.touch_&]:h-11">
          {secondary.label}
        </Button>
      )}
      {details && (
        <Button variant="ghost" size="sm" aria-expanded={open} onClick={onToggle} className="[html.phone_&]:h-12 [html.touch_&]:h-11">
          {open ? "Hide details" : "Show details"}
          <ChevronDown aria-hidden="true" className={cn("size-3 transition-transform", open && "rotate-180")} />
        </Button>
      )}
    </div>
  )
  return (
    <Callout role="alert" className={cn("animate-in gap-0 fade-in-0 duration-150", className)}>
      <div className={cn("flex gap-3", inline ? "items-center" : "flex-col gap-0")}>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 text-sm leading-5 font-act text-foreground">
            <span aria-hidden="true" className="grid size-4 shrink-0 place-items-center">
              <StatusDot variant={tone} />
            </span>
            {title}
          </div>
          {cause && <p className="pl-[22px] text-[0.8125rem] leading-[1.1875rem] font-read text-muted-foreground">{cause}</p>}
        </div>
        {actions && <div className={inline ? "" : "pl-[22px]"}>{actions}</div>}
      </div>
      {details && phone && (
        <Drawer open={!!open} onOpenChange={(next) => next !== open && onToggle?.()}>
          <DrawerContent className="px-4 pb-[calc(16px+var(--safe-bottom))]">
            <DrawerHeader className="px-0">
              <DrawerTitle>{title}</DrawerTitle>
            </DrawerHeader>
            <div className="relative max-h-60 overflow-auto rounded-lg bg-(--np-peek) py-2 pr-12 pl-3 font-mono text-[0.8125rem] leading-5 whitespace-pre-wrap text-muted-foreground">
              {details}
              <CopyButton value={details} className="absolute top-1 right-1" />
            </div>
          </DrawerContent>
        </Drawer>
      )}
      {details && open && !phone && (
        <div className="relative mt-2 max-h-24 overflow-auto rounded-lg bg-(--np-peek) py-2 pr-10 pl-3 font-mono text-xs leading-[1.125rem] text-muted-foreground">
          {details}
          <CopyButton value={details} className="absolute top-1 right-1" />
        </div>
      )}
    </Callout>
  )
}
