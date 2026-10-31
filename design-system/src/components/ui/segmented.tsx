import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"
import { ToggleGroup as ToggleGroupPrimitive } from "radix-ui"

import { useIndicator } from "@/hooks/use-indicator"

/* One choice out of a few, always one. Four looks, from client-v2:
   thumb    a neutral thumb that slides (the left panel's switch)
   boxed    tabs in a well, the current one lifted, with a count (the gallery)
   gradient the current option ringed in Solana's colours (a framework)
   chips    small chips, the current one purple (a network, in settings)
   and two from the tutorial:
   pill     the thumb, round (a view switch in a bar)
   quiet    a faint well, the current one a step lighter, no thumb or ring
            (Form and IDL in the Call panel)
   tone="neutral" makes the current chip grey instead of purple, for chips
   that only pick what to show (an instruction) */

const segmentedVariants = cva("group/segmented relative inline-flex w-fit items-center", {
  variants: {
    variant: {
      thumb: "h-7 rounded-lg border border-border bg-surface-panel p-0.5",
      boxed: "gap-1 rounded-xl bg-surface-base p-1",
      gradient: "gap-2",
      chips: "flex-wrap gap-1.5",
      pill: "h-7 rounded-full border border-border bg-surface-panel p-0.5",
      quiet: "gap-0.5 rounded-[10px] bg-foreground/[0.04] p-[3px]",
    },
  },
  defaultVariants: {
    variant: "thumb",
  },
})

const Variant = React.createContext<NonNullable<VariantProps<typeof segmentedVariants>["variant"]>>("thumb")
const Tone = React.createContext<"primary" | "neutral">("primary")

function Segmented({
  className,
  variant = "thumb",
  tone = "primary",
  value,
  defaultValue,
  onValueChange,
  children,
  ...props
}: Omit<React.ComponentProps<typeof ToggleGroupPrimitive.Root>, "type" | "value" | "defaultValue" | "onValueChange"> &
  VariantProps<typeof segmentedVariants> & {
    /** the current chip's colour; only chips have one */
    tone?: "primary" | "neutral"
    value?: string
    defaultValue?: string
    onValueChange?: (value: string) => void
  }) {
  const [inner, setInner] = React.useState(defaultValue ?? "")
  const current = value ?? inner
  const [ref, box] = useIndicator<HTMLDivElement>('[data-slot="segmented-item"][data-state="on"]', [current, children])
  return (
    <Variant.Provider value={variant ?? "thumb"}>
      <Tone.Provider value={tone}>
        <ToggleGroupPrimitive.Root
          ref={ref}
          type="single"
          data-slot="segmented"
          data-variant={variant}
          data-tone={tone === "neutral" ? tone : undefined}
          value={current}
          onValueChange={(v: string) => {
            if (!v) return /* one is always chosen */
            setInner(v)
            onValueChange?.(v)
          }}
          className={cn(segmentedVariants({ variant }), className)}
          {...props}
        >
          {(variant === "thumb" || variant === "pill") && (
            <span
              data-slot="segmented-thumb"
              aria-hidden="true"
              className={cn(
                "pointer-events-none absolute top-0.5 left-0 h-[calc(100%-4px)] rounded-md bg-surface-hover shadow-thumb transition-[transform,width] duration-(--duration-thumb) ease-standard motion-reduce:transition-none",
                variant === "pill" && "rounded-full"
              )}
              style={box ? { width: box.width, transform: `translateX(${box.left}px)` } : { opacity: 0 }}
            />
          )}
          {children}
        </ToggleGroupPrimitive.Root>
      </Tone.Provider>
    </Variant.Provider>
  )
}

const segmentedItemVariants = cva(
  "relative z-10 inline-flex shrink-0 items-center justify-center gap-1.5 text-[0.8125rem] font-act whitespace-nowrap outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-3.5",
  {
    variants: {
      variant: {
        thumb: "h-full rounded-md px-3 text-muted-foreground hover:text-foreground data-[state=on]:text-foreground",
        boxed: "h-8 rounded-[10px] px-3 text-muted-foreground hover:text-foreground data-[state=on]:bg-surface-panel data-[state=on]:text-foreground",
        gradient:
          "h-8 rounded-lg border border-border px-3 text-muted-foreground hover:border-border-strong hover:text-foreground data-[state=on]:gradient-stroke data-[state=on]:text-foreground data-[state=on]:[--stroke-fill:var(--surface-panel)]",
        chips:
          "h-7 rounded-md border border-border px-2.5 text-muted-foreground hover:text-foreground data-[state=on]:border-primary data-[state=on]:bg-primary/10 data-[state=on]:text-foreground",
        pill: "h-full rounded-full px-3 text-muted-foreground hover:text-foreground data-[state=on]:text-foreground",
        quiet:
          "h-7 rounded-[7px] px-3 text-muted-foreground transition-colors duration-100 hover:text-foreground focus-visible:ring-ring/50 data-[state=on]:bg-foreground/[0.08] data-[state=on]:text-foreground pointer-coarse:h-10",
      },
      tone: {
        primary: "",
        neutral: "",
      },
    },
    compoundVariants: [
      {
        variant: "chips",
        tone: "neutral",
        className: "data-[state=on]:border-border-strong data-[state=on]:bg-foreground/[0.08]",
      },
    ],
    defaultVariants: {
      variant: "thumb",
      tone: "primary",
    },
  }
)

function SegmentedItem({ className, ...props }: React.ComponentProps<typeof ToggleGroupPrimitive.Item>) {
  const variant = React.useContext(Variant)
  const tone = React.useContext(Tone)
  return (
    <ToggleGroupPrimitive.Item
      data-slot="segmented-item"
      className={cn(segmentedItemVariants({ variant, tone }), className)}
      {...props}
    />
  )
}

/* How many there are behind a tab: "Tutorials 12" */
function SegmentedCount({ className, ...props }: React.ComponentProps<"span">) {
  return (
    <span
      data-slot="segmented-count"
      className={cn("rounded-full bg-surface-base px-1.5 text-[0.6875rem] text-muted-foreground tabular-nums", className)}
      {...props}
    />
  )
}

export { Segmented, SegmentedCount, SegmentedItem, segmentedItemVariants, segmentedVariants }
