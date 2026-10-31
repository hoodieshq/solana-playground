import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"
import { Slot } from "radix-ui"

/* A card you open: a tutorial, a sample, a program. The link inside it
   covers the whole card, so the card is one target and the text stays
   selectable. default takes a brighter edge on hover. frame is the older
   card's: a ring of the brand's colours fades in and the card lifts. fill
   is the tutorial gallery's: the card fills a step on hover, its title at
   500, and the way in is a square in its corner (ActionCardIndicator). */

const actionCardVariants = cva(
  "group/action-card relative flex min-w-0 gap-3 rounded-xl border border-border bg-surface-panel p-3.5 transition-[border-color,transform,background-color] duration-150 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring",
  {
    variants: {
      variant: {
        default: "hover:border-muted-foreground",
        frame:
          "after:pointer-events-none after:absolute after:-inset-[5px] after:-z-10 after:rounded-[18px] after:bg-[linear-gradient(45deg,var(--brand-purple),var(--brand-green))] after:opacity-0 after:transition-opacity after:duration-150 hover:-translate-y-2 hover:bg-surface-hover hover:after:opacity-100 motion-reduce:hover:translate-y-0",
        fill: "gap-3.5 rounded-panel duration-100 hover:bg-[color-mix(in_srgb,var(--foreground)_4%,var(--surface-panel))] motion-reduce:transition-none",
      },
      orientation: {
        horizontal: "flex-row items-start",
        vertical: "flex-col",
      },
    },
    defaultVariants: {
      variant: "default",
      orientation: "horizontal",
    },
  }
)

function ActionCard({
  className,
  variant = "default",
  orientation = "horizontal",
  ...props
}: React.ComponentProps<"div"> & VariantProps<typeof actionCardVariants>) {
  return (
    <div
      data-slot="action-card"
      data-variant={variant}
      data-orientation={orientation}
      className={cn(actionCardVariants({ variant, orientation }), variant === "frame" && "isolate", className)}
      {...props}
    />
  )
}

function ActionCardMedia({
  className,
  variant = "icon",
  ...props
}: React.ComponentProps<"div"> & { variant?: "icon" | "image" }) {
  return (
    <div
      data-slot="action-card-media"
      data-variant={variant}
      className={cn(
        "grid shrink-0 place-items-center overflow-hidden rounded-lg bg-surface-raised text-muted-foreground",
        variant === "icon" && "size-11 [&_svg:not([class*='size-'])]:size-5",
        variant === "image" && "h-[2.625rem] w-14 *:size-full *:object-cover",
        className
      )}
      {...props}
    />
  )
}

function ActionCardContent({ className, ...props }: React.ComponentProps<"div">) {
  return <div data-slot="action-card-content" className={cn("flex min-w-0 flex-1 flex-col gap-0.5", className)} {...props} />
}

function ActionCardEyebrow({ className, ...props }: React.ComponentProps<"span">) {
  return <span data-slot="action-card-eyebrow" className={cn("text-xs text-subtle", className)} {...props} />
}

function ActionCardTitle({ className, ...props }: React.ComponentProps<"h3">) {
  return (
    <h3
      data-slot="action-card-title"
      className={cn(
        "line-clamp-1 text-control font-act text-foreground group-data-[variant=fill]/action-card:leading-5 group-data-[variant=fill]/action-card:font-medium",
        className
      )}
      {...props}
    />
  )
}

function ActionCardDescription({ className, ...props }: React.ComponentProps<"p">) {
  return (
    <p
      data-slot="action-card-description"
      className={cn(
        "line-clamp-2 text-caption font-read text-muted-foreground group-data-[variant=fill]/action-card:leading-[1.125rem] group-data-[variant=fill]/action-card:font-[350]",
        className
      )}
      {...props}
    />
  )
}

/* Who made it and with what, under the description: "Anchor · by acheron" */
function ActionCardMeta({ className, ...props }: React.ComponentProps<"p">) {
  return (
    <p
      data-slot="action-card-meta"
      className={cn("mt-1.5 text-xs leading-4 font-label text-muted-foreground/80 tabular-nums", className)}
      {...props}
    />
  )
}

/* The link, stretched over the card. Put it in the title */
function ActionCardLink({ className, asChild = false, ...props }: React.ComponentProps<"a"> & { asChild?: boolean }) {
  const Comp = asChild ? Slot.Root : "a"
  return (
    <Comp
      data-slot="action-card-link"
      className={cn("outline-none after:absolute after:inset-0 after:rounded-[inherit] after:content-['']", className)}
      {...props}
    />
  )
}

/* The way in, as a square in the card's corner: an arrow, or a green tick
   once it is done. It is the stretched link, so it covers the card; give it
   an aria-label that names the card. A button by default, asChild for a link */
function ActionCardIndicator({
  className,
  state = "open",
  asChild = false,
  children,
  ...props
}: React.ComponentProps<"button"> & { state?: "open" | "done"; asChild?: boolean }) {
  const Comp = asChild ? Slot.Root : "button"
  return (
    <Comp
      data-slot="action-card-indicator"
      data-state={state}
      {...(asChild ? {} : { type: "button" as const })}
      className={cn(
        "ml-auto flex size-8 shrink-0 items-center justify-center self-start rounded-lg outline-none after:absolute after:inset-0 after:content-[''] focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring [&_svg:not([class*='size-'])]:size-4",
        "data-[state=open]:bg-surface-hover data-[state=open]:text-muted-foreground/70 data-[state=open]:transition-colors data-[state=open]:duration-100 data-[state=open]:group-hover/action-card:text-foreground data-[state=open]:focus-visible:text-foreground motion-reduce:transition-none",
        "data-[state=done]:bg-brand-green/12 data-[state=done]:text-brand-green",
        className
      )}
      {...props}
    >
      {asChild ? children : (children ?? (state === "done" ? <IndicatorDone /> : <IndicatorOpen />))}
    </Comp>
  )
}

function IndicatorOpen() {
  return (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M5 11 11 5M6 5h5v5" />
    </svg>
  )
}

function IndicatorDone() {
  return (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M3.5 8.5l3 3 6-7" />
    </svg>
  )
}

/* An action of its own, above the stretched link. Hidden on a phone,
   where the whole card is the action */
function ActionCardAction({ className, ...props }: React.ComponentProps<"div">) {
  return <div data-slot="action-card-action" className={cn("relative z-10 ml-auto shrink-0 self-center max-md:hidden", className)} {...props} />
}

export {
  ActionCard,
  ActionCardAction,
  ActionCardContent,
  ActionCardDescription,
  ActionCardEyebrow,
  ActionCardIndicator,
  ActionCardLink,
  ActionCardMedia,
  ActionCardMeta,
  ActionCardTitle,
  actionCardVariants,
}
