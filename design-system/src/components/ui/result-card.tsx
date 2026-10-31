import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { ChevronDown } from "lucide-react"
import { Collapsible as CollapsiblePrimitive } from "radix-ui"
import { cn } from "@/lib/utils"

/* One shape for every finished run: build, deploy, run, a call. A status
   row (icon, title, meta), the result under it, and more that opens in the
   same box, never a box of its own.

   The status row reads the same on every result: put ResultCardTitle and
   ResultCardMeta inside ResultCardText, which sets them on one baseline,
   and the row centres the icon on the title's line. A card with nothing
   under its head (Build successful, Deployed to devnet) is one row: give
   the header toggle and put the details in ResultCardFold. A card whose
   result stays in view (Confirmed, with the account or what the program
   said) keeps ResultCardBody outside the fold and still opens from its
   head, so the details appear right under what they explain.
   ResultCardToggle, a Details strip at the foot, is for a card whose body
   is long enough that a chevron in the head would open its far end.
   error tints the head red; size lg is a failure still waiting on you, 48
   tall at the question card's inset. */

const ResultCardContext = React.createContext<{ open: boolean }>({ open: false })

const resultCardVariants = cva("group/result-card @container overflow-hidden border bg-card-ground", {
  variants: {
    variant: {
      default: "border-border",
      error: "border-error/40",
    },
    size: {
      default: "rounded-control",
      lg: "rounded-panel",
    },
  },
  defaultVariants: {
    variant: "default",
    size: "default",
  },
})

function ResultCard({
  className,
  variant = "default",
  size = "default",
  open: openProp,
  defaultOpen = false,
  onOpenChange,
  ...props
}: React.ComponentProps<typeof CollapsiblePrimitive.Root> & VariantProps<typeof resultCardVariants>) {
  const [openState, setOpenState] = React.useState(defaultOpen)
  const open = openProp ?? openState
  const setOpen = (next: boolean) => {
    if (openProp === undefined) setOpenState(next)
    onOpenChange?.(next)
  }
  return (
    <ResultCardContext.Provider value={{ open }}>
      <CollapsiblePrimitive.Root
        data-slot="result-card"
        data-variant={variant}
        data-size={size}
        open={open}
        onOpenChange={setOpen}
        className={cn(resultCardVariants({ variant, size }), className)}
        {...props}
      />
    </ResultCardContext.Provider>
  )
}

const focusRing = "outline-none focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring"

function Chevron() {
  return (
    <ChevronDown
      aria-hidden="true"
      className="ml-auto size-4 shrink-0 text-muted-foreground transition-transform duration-150 ease-standard group-hover/result-card-trigger:text-foreground group-data-[state=open]/result-card-trigger:rotate-180 motion-reduce:transition-none"
    />
  )
}

/* The status row. It is a live status, so a run's outcome is read out as it
   lands. With toggle it is also the way to open the fold, chevron at its end;
   label names that for a screen reader. 36 tall, 44 under a finger, 48 at
   size lg on any pointer */
function ResultCardHeader({
  className,
  toggle = false,
  label = "Details",
  children,
  ...props
}: React.ComponentProps<"div"> & { toggle?: boolean; label?: string }) {
  const row = cn(
    "flex h-9 w-full items-center gap-2 px-3 text-left pointer-coarse:h-11 [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
    "group-data-[size=lg]/result-card:h-12 group-data-[size=lg]/result-card:px-4 group-data-[size=lg]/result-card:pointer-coarse:h-12",
    "group-data-[variant=error]/result-card:bg-error/[0.08]"
  )
  return (
    <div data-slot="result-card-header" role="status" className={cn(!toggle && row, className)} {...props}>
      {toggle ? (
        <CollapsiblePrimitive.Trigger
          data-slot="result-card-trigger"
          className={cn(
            row,
            "group/result-card-trigger transition-colors duration-150 ease-standard hover:bg-foreground/[0.04] active:bg-foreground/[0.06] motion-reduce:transition-none",
            focusRing
          )}
        >
          {children}
          <span className="sr-only">{label}</span>
          <Chevron />
        </CollapsiblePrimitive.Trigger>
      ) : (
        children
      )}
    </div>
  )
}

/* The title and the meta on one baseline. Centred, a 16 title beside a 14
   meta sat their baselines apart and read as two sizes that nearly match */
function ResultCardText({ className, ...props }: React.ComponentProps<"span">) {
  return <span data-slot="result-card-text" className={cn("flex min-w-0 flex-1 items-baseline gap-2", className)} {...props} />
}

/* The same face on every result, compact or lg: the size of the row, not of
   the words, is what says a failure is still live */
function ResultCardTitle({ className, ...props }: React.ComponentProps<"span">) {
  return (
    <span
      data-slot="result-card-title"
      className={cn("shrink-0 font-heading text-[1rem] leading-[1.5rem] font-medium text-foreground", className)}
      {...props}
    />
  )
}

/* What it took, which line failed, the instruction that ran: one line, cut
   at its end. Keep it to one short fact, so a long extra never cuts it
   mid way: Confirmed shows only the instruction, in mono a pixel under 14
   so it does not look bigger, and leaves the rest to the details */
function ResultCardMeta({ className, ...props }: React.ComponentProps<"span">) {
  return (
    <span
      data-slot="result-card-meta"
      className={cn("min-w-0 truncate text-[0.875rem] leading-[1.125rem] text-muted-foreground [&_code]:font-mono [&_code]:text-[13px]", className)}
      {...props}
    />
  )
}

/* The result itself. Under a red head it sits under a faint red rule */
function ResultCardBody({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="result-card-body"
      className={cn(
        "flex flex-col gap-3 px-3 pb-3",
        "group-data-[variant=error]/result-card:gap-4 group-data-[variant=error]/result-card:border-t group-data-[variant=error]/result-card:border-error/20 group-data-[variant=error]/result-card:pt-3",
        "group-data-[size=lg]/result-card:px-4 group-data-[size=lg]/result-card:pb-4 group-data-[size=lg]/result-card:pt-4",
        className
      )}
      {...props}
    />
  )
}

/* The card's own foot, under a hairline, that opens the fold. A control of
   the card, not one more line of what it says */
function ResultCardToggle({
  className,
  label = "Details",
  openLabel = "Hide details",
  ...props
}: Omit<React.ComponentProps<typeof CollapsiblePrimitive.Trigger>, "children"> & { label?: string; openLabel?: string }) {
  const { open } = React.useContext(ResultCardContext)
  return (
    <CollapsiblePrimitive.Trigger
      data-slot="result-card-toggle"
      className={cn(
        "group/result-card-trigger flex h-8 w-full items-center justify-between border-t border-border px-3 text-caption text-muted-foreground transition-colors duration-150 ease-standard hover:bg-foreground/[0.03] hover:text-foreground pointer-coarse:h-11 motion-reduce:transition-none",
        focusRing,
        className
      )}
      {...props}
    >
      {open ? openLabel : label}
      <Chevron />
    </CollapsiblePrimitive.Trigger>
  )
}

/* What opens: an older card's body, then its details */
function ResultCardFold({ className, ...props }: React.ComponentProps<typeof CollapsiblePrimitive.Content>) {
  return (
    <CollapsiblePrimitive.Content
      data-slot="result-card-fold"
      className={cn(
        "overflow-hidden duration-200 ease-standard data-[state=closed]:animate-collapsible-up data-[state=open]:animate-collapsible-down motion-reduce:animate-none",
        className
      )}
      {...props}
    />
  )
}

/* What opens: ResultDetails, or a log of your own. Under its own hairline,
   except right under the foot, whose hairline is theirs */
function ResultCardDetails({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="result-card-details"
      className={cn(
        "mx-3 flex flex-col gap-2 border-t border-border py-3 [[data-slot=result-card-toggle]+[data-slot=result-card-fold]>&]:border-t-0",
        className
      )}
      {...props}
    />
  )
}

export {
  ResultCard,
  ResultCardBody,
  ResultCardDetails,
  ResultCardFold,
  ResultCardHeader,
  ResultCardMeta,
  ResultCardText,
  ResultCardTitle,
  ResultCardToggle,
  resultCardVariants,
}
