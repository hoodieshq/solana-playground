import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { ChevronRight, ExternalLink } from "lucide-react"
import { cn } from "@/lib/utils"

import { shortKey } from "@/components/ui/key-row"

/* What a transaction leaves behind, in the order a newcomer asks: what the
   program said, who paid, then the rest.
   printed  a slip: mono, dashed rules between groups, a torn foot
   compact  the signature with Copy and Explorer, then the fee, as quiet
            14/18 lines that wrap whole and never cut mid way. The result
            card no longer carries these lines: ResultDetails says the same
            in one sentence. Keep compact for a transaction shown on its own
   answer   the proof, short: the call, what the program answered at size,
            what it cost, and a foot that opens the printed slip under it
   print makes the lines come out one by one, 60ms apart, as from a
   printer. It is read once, as the receipt mounts, so a render above it
   never stops it halfway; with reduced motion the lines are simply there.
   The result card dropped it with the compact lines; the slip keeps it. */

const receiptVariants = cva("group/receipt @container/receipt flex flex-col [&_[data-slot=copy-button]_svg]:size-3.5", {
  variants: {
    variant: {
      printed:
        "edge-torn rounded-t-control border border-b-0 border-border bg-surface-panel px-4 pt-4 font-mono text-code text-foreground",
      compact:
        "flex-row flex-wrap items-center justify-between gap-x-4 gap-y-1 border-t border-border pt-3 text-[0.875rem] leading-[1.125rem] text-muted-foreground",
      answer: "overflow-hidden rounded-card border border-border bg-surface-well",
    },
  },
  defaultVariants: {
    variant: "printed",
  },
})

/* A line that prints in: every part below that is one line carries it */
const PRINT_ROW = "group-data-print/receipt:animate-print group-data-print/receipt:motion-reduce:animate-none"

function Receipt({
  className,
  variant = "printed",
  print = false,
  ref,
  ...props
}: React.ComponentProps<"section"> & VariantProps<typeof receiptVariants> & { print?: boolean }) {
  const [printing] = React.useState(print)
  const root = React.useRef<HTMLElement | null>(null)
  /* Each line's place in the print order, in the order they read, set
     before the first paint so none flashes in early */
  React.useLayoutEffect(() => {
    if (!printing || !root.current) return
    root.current.querySelectorAll<HTMLElement>("[data-print-row]").forEach((el, i) => el.style.setProperty("--i", String(i)))
  }, [printing])
  return (
    <section
      ref={(el) => {
        root.current = el
        if (typeof ref === "function") ref(el)
        else if (ref) ref.current = el
      }}
      data-slot="receipt"
      data-variant={variant}
      data-print={printing || undefined}
      className={cn(receiptVariants({ variant }), className)}
      {...props}
    />
  )
}

/* The slip's first line: the program and the cluster */
function ReceiptTitle({ className, ...props }: React.ComponentProps<"p">) {
  return <p data-slot="receipt-title" data-print-row="" className={cn("text-foreground", PRINT_ROW, className)} {...props} />
}

/* Under the title: when it ran */
function ReceiptMeta({ className, ...props }: React.ComponentProps<"p">) {
  return <p data-slot="receipt-meta" data-print-row="" className={cn("text-muted-foreground", PRINT_ROW, className)} {...props} />
}

/* The answer's padded top, over its foot */
function ReceiptBody({ className, ...props }: React.ComponentProps<"div">) {
  return <div data-slot="receipt-body" className={cn("px-4 pt-4 pb-3.5", className)} {...props} />
}

/* The call as the learner made it: hello("Ada") returned */
function ReceiptCall({ className, ...props }: React.ComponentProps<"p">) {
  return (
    <p data-slot="receipt-call" data-print-row="" className={cn("font-mono text-code text-muted-foreground", PRINT_ROW, className)} {...props} />
  )
}

/* What the program answered, the reason the step was worth doing, so it
   is the largest thing on the card */
function ReceiptAnswer({ className, ...props }: React.ComponentProps<"p">) {
  return (
    <p
      data-slot="receipt-answer"
      data-print-row=""
      className={cn(
        "mt-1 font-mono text-[1.375rem] leading-tight font-medium break-words text-foreground @max-[30rem]/receipt:text-[1.25rem]",
        PRINT_ROW,
        className
      )}
      {...props}
    />
  )
}

/* A run of rows under a rule: dashed on the slip, a hairline on the answer */
function ReceiptGroup({ className, ...props }: React.ComponentProps<"dl">) {
  return (
    <dl
      data-slot="receipt-group"
      className={cn(
        "mt-3 flex flex-col border-t border-dashed border-border-strong pt-3",
        "group-data-[variant=answer]/receipt:mt-3.5 group-data-[variant=answer]/receipt:border-solid group-data-[variant=answer]/receipt:border-border group-data-[variant=answer]/receipt:text-caption",
        className
      )}
      {...props}
    />
  )
}

/* One field: its label on the left, the value on the right. On a narrow
   slip the value goes under its label, whole, so a key never breaks */
function ReceiptRow({ className, label, children, ...props }: React.ComponentProps<"div"> & { label: React.ReactNode }) {
  return (
    <div
      data-slot="receipt-row"
      data-print-row=""
      className={cn(
        "flex justify-between gap-x-4 py-0.5 @max-xs/receipt:flex-col",
        "group-data-[variant=answer]/receipt:items-start group-data-[variant=answer]/receipt:py-0 group-data-[variant=answer]/receipt:@max-xs/receipt:flex-row",
        PRINT_ROW,
        className
      )}
      {...props}
    >
      <dt className="shrink-0 text-muted-foreground">{label}</dt>
      <dd className="min-w-0 text-right break-words text-foreground @max-xs/receipt:text-left group-data-[variant=answer]/receipt:@max-xs/receipt:text-right">
        {children}
      </dd>
    </div>
  )
}

/* A small line in the sans, under the rows: where the values came from */
function ReceiptNote({ className, ...props }: React.ComponentProps<"p">) {
  return (
    <p
      data-slot="receipt-note"
      data-print-row=""
      className={cn("mt-3 font-sans text-[0.6875rem] text-muted-foreground", PRINT_ROW, className)}
      {...props}
    />
  )
}

/* One of the compact receipt's two lines. It never shrinks: a line that
   does not fit goes under the other whole, rather than losing its end.
   Under a finger Copy and Explorer are 44px squares, pulled in so the line
   keeps its height */
function ReceiptLine({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="receipt-line"
      data-print-row=""
      className={cn(
        "flex shrink-0 items-center gap-1 whitespace-nowrap tabular-nums",
        "pointer-coarse:*:data-[slot=copy-button]:-my-2.5 pointer-coarse:*:data-[slot=copy-button]:size-11",
        PRINT_ROW,
        className
      )}
      {...props}
    />
  )
}

/* A key cut to its ends, six and six by default; the whole key is its title.
   On the compact lines it keeps both ends, mono a pixel under the line's 14 */
function ReceiptKey({
  className,
  value,
  head = 6,
  tail = 6,
  ...props
}: Omit<React.ComponentProps<"code">, "children"> & { value: string; head?: number; tail?: number }) {
  return (
    <code
      data-slot="receipt-key"
      title={value}
      className={cn("min-w-0 truncate font-mono group-data-[variant=compact]/receipt:mr-1 group-data-[variant=compact]/receipt:shrink-0 group-data-[variant=compact]/receipt:overflow-visible group-data-[variant=compact]/receipt:text-[13px]", className)}
      {...props}
    >
      {shortKey(value, head, tail)}
    </code>
  )
}

/* The slip's actions under a dashed rule, or the answer's foot. Put a
   CopyButton and a ReceiptLink in it, and on the answer a ReceiptToggle */
function ReceiptFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="receipt-footer"
      data-print-row=""
      className={cn(
        "mt-2 flex flex-wrap items-center gap-x-4 border-t border-dashed border-border-strong pt-1 font-sans text-caption [&>[data-slot=copy-button]:first-child]:-ml-1.5",
        "group-data-[variant=answer]/receipt:mt-0 group-data-[variant=answer]/receipt:flex-nowrap group-data-[variant=answer]/receipt:gap-1 group-data-[variant=answer]/receipt:border-solid group-data-[variant=answer]/receipt:border-border group-data-[variant=answer]/receipt:py-1 group-data-[variant=answer]/receipt:pr-1.5 group-data-[variant=answer]/receipt:pl-2",
        "group-data-[variant=answer]/receipt:*:data-[slot=copy-button]:size-9 group-data-[variant=answer]/receipt:*:data-[slot=copy-button]:[&_svg]:size-4",
        "pointer-coarse:*:data-[slot=copy-button]:size-11",
        PRINT_ROW,
        className
      )}
      {...props}
    />
  )
}

/* The answer's way to the full slip: "Transaction 5VERv8…", with a chevron
   that turns as it opens. Use it as a CollapsibleTrigger's child, or give
   it aria-expanded yourself */
function ReceiptToggle({ className, children, ...props }: React.ComponentProps<"button">) {
  return (
    <button
      type="button"
      data-slot="receipt-toggle"
      className={cn(
        "flex min-h-11 min-w-0 flex-1 items-center gap-1.5 rounded-control px-2 text-left text-caption text-muted-foreground outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring aria-expanded:[&>svg]:rotate-90",
        className
      )}
      {...props}
    >
      <ChevronRight
        strokeWidth={1.75}
        aria-hidden="true"
        className="size-3.5 shrink-0 transition-transform duration-150 motion-reduce:transition-none"
      />
      <span className="truncate">{children}</span>
    </button>
  )
}

/* The transaction on an explorer. With words it reads "Explorer" and its
   arrow; without, it is the icon alone, named by label, a 44px square
   under a finger */
function ReceiptLink({
  className,
  children,
  label = "Open in Explorer",
  ...props
}: React.ComponentProps<"a"> & { label?: string }) {
  return (
    <a
      data-slot="receipt-link"
      target="_blank"
      rel="noreferrer"
      aria-label={children ? undefined : label}
      title={children ? undefined : label}
      className={cn(
        "inline-flex shrink-0 items-center gap-1 rounded-md text-muted-foreground outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring",
        children
          ? "h-8 pointer-coarse:h-11"
          : "size-6 justify-center hover:bg-surface-hover group-data-[variant=answer]/receipt:size-9 group-data-[variant=answer]/receipt:[&>svg]:size-4 pointer-coarse:size-11 group-data-[variant=compact]/receipt:pointer-coarse:-my-2.5",
        className
      )}
      {...props}
    >
      {children}
      <ExternalLink strokeWidth={1.75} aria-hidden="true" className="size-3.5" />
    </a>
  )
}

export {
  Receipt,
  ReceiptAnswer,
  ReceiptBody,
  ReceiptCall,
  ReceiptFooter,
  ReceiptGroup,
  ReceiptKey,
  ReceiptLine,
  ReceiptLink,
  ReceiptMeta,
  ReceiptNote,
  ReceiptRow,
  ReceiptTitle,
  ReceiptToggle,
  receiptVariants,
}
