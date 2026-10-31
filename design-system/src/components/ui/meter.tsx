import * as React from "react"
import { cn } from "@/lib/utils"

/* A value against its most, read at a glance. cells counts it out in short
   bars (a game's energy, an account's size in 10 KB blocks); bar is one
   line with an optional threshold tick, and the fill turns red past it (what
   a read takes from a 32 KB heap). brand fills in Solana's green, neutral
   in a grey that keeps purple and green for what needs you. The number
   beside it carries the value; the track only shows it.
   Not Progress (one bar, how far a task is) and not ObjectiveMeter (a
   lesson's progress in the brand gradient). */

type MeterContextValue = {
  value: number
  max: number
  variant: "cells" | "bar"
  tone: "brand" | "neutral"
  cells: number
  threshold?: number
  status: "ok" | "over" | "empty"
  labelId: string
}

const MeterContext = React.createContext<MeterContextValue | null>(null)

function useMeter(part: string) {
  const ctx = React.useContext(MeterContext)
  if (!ctx) throw new Error(`${part} must be inside Meter`)
  return ctx
}

function Meter({
  className,
  value,
  max = 100,
  variant = "cells",
  tone = "brand",
  cells,
  threshold,
  alertEmpty = false,
  children,
  ...props
}: React.ComponentProps<"div"> & {
  value: number
  max?: number
  variant?: "cells" | "bar"
  tone?: "brand" | "neutral"
  /** how many cells the most is cut into; one per unit of max when left out */
  cells?: number
  /** a tick on the bar; the fill turns red past it */
  threshold?: number
  /** an empty meter reads red, as energy at 0 does */
  alertEmpty?: boolean
}) {
  const labelId = React.useId()
  const status = threshold !== undefined && value > threshold ? "over" : alertEmpty && value <= 0 ? "empty" : "ok"
  const hasLabel = React.Children.toArray(children).some((c) => React.isValidElement(c) && c.type === MeterLabel)
  return (
    <MeterContext.Provider
      value={{ value, max, variant, tone, cells: Math.max(1, Math.round(cells ?? max)), threshold, status, labelId }}
    >
      <div
        role="meter"
        data-slot="meter"
        data-variant={variant}
        data-status={status}
        aria-valuenow={value}
        aria-valuemin={0}
        aria-valuemax={max}
        aria-labelledby={hasLabel ? labelId : undefined}
        className={cn("group/meter flex items-center gap-2", className)}
        {...props}
      >
        {children ?? <MeterTrack />}
      </div>
    </MeterContext.Provider>
  )
}

/* What it measures, with an optional glyph; red with the value when over or empty */
function MeterLabel({ className, ...props }: React.ComponentProps<"span">) {
  const { labelId } = useMeter("MeterLabel")
  return (
    <span
      id={labelId}
      data-slot="meter-label"
      className={cn(
        "flex shrink-0 items-center gap-2 text-caption text-muted-foreground [&>svg]:size-3.5 [&>svg]:shrink-0 group-data-[status=empty]/meter:[&>svg]:text-error group-data-[status=over]/meter:[&>svg]:text-error",
        className
      )}
      {...props}
    />
  )
}

function MeterTrack({ className, ...props }: React.ComponentProps<"span">) {
  const { value, max, variant, tone, cells, threshold, status } = useMeter("MeterTrack")
  const pct = (n: number) => `${Math.max(0, Math.min(100, (n / max) * 100))}%`
  if (variant === "cells") {
    const per = max / cells
    return (
      <span data-slot="meter-track" aria-hidden="true" className={cn("flex gap-0.5", className)} {...props}>
        {Array.from({ length: cells }, (_, i) => (
          <span
            key={i}
            data-lit={(i + 1) * per <= value + 1e-9 || undefined}
            className={cn(
              "h-1 min-w-3 flex-1 rounded-full bg-foreground/10 transition-colors duration-300 motion-reduce:transition-none",
              tone === "brand" ? "data-lit:bg-brand-green" : "data-lit:bg-foreground/45"
            )}
          />
        ))}
      </span>
    )
  }
  return (
    <span data-slot="meter-track" aria-hidden="true" className={cn("relative flex h-2.5 min-w-12 flex-1 items-center", className)} {...props}>
      <span className="absolute inset-x-0 h-1 rounded-full bg-foreground/15" />
      <span
        className={cn(
          "absolute left-0 h-1 rounded-full transition-[width] duration-300 motion-reduce:transition-none",
          status === "over" ? "bg-error" : tone === "brand" ? "bg-brand-green" : "bg-foreground/45"
        )}
        style={{ width: pct(value) }}
      />
      {threshold !== undefined && (
        <span
          data-slot="meter-threshold"
          className="absolute inset-y-0 w-px -translate-x-1/2 rounded-full bg-foreground/60"
          style={{ left: pct(threshold) }}
        />
      )}
    </span>
  )
}

/* The number: value/max when given no children */
function MeterValue({ className, children, ...props }: React.ComponentProps<"span">) {
  const { value, max } = useMeter("MeterValue")
  return (
    <span
      data-slot="meter-value"
      className={cn(
        "shrink-0 font-mono text-[0.75rem] whitespace-nowrap text-foreground tabular-nums group-data-[status=empty]/meter:text-error group-data-[status=over]/meter:text-error",
        className
      )}
      {...props}
    >
      {children ?? `${value}/${max}`}
    </span>
  )
}

export { Meter, MeterLabel, MeterTrack, MeterValue }
