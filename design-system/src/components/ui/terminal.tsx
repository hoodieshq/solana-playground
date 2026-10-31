import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { Check } from "lucide-react"
import { Slot } from "radix-ui"

import { Spinner } from "@/components/ui/spinner"
import { cn } from "@/lib/utils"

/* What you typed, what came back and how it went. wrap says which lines
   wrap: all of them (the default, and a phone's), none, so a key never
   leaves its last characters alone on the next line and the log scrolls
   sideways instead, or errors, so the one line that says what is wrong
   reads whole while the rest keep their columns. */
function Terminal({
  className,
  wrap = "all",
  ...props
}: React.ComponentProps<"div"> & { wrap?: "all" | "none" | "errors" }) {
  return (
    <div
      data-slot="terminal"
      data-wrap={wrap === "all" ? undefined : wrap}
      role="log"
      aria-live="polite"
      className={cn(
        "group/terminal flex w-full flex-col gap-0.5 overflow-auto rounded-xl border border-border bg-surface-well p-3 font-mono text-[0.8125rem] leading-relaxed text-muted-foreground",
        className
      )}
      {...props}
    />
  )
}

/* highlight is the program's own line, back from the network: lit, with a
   purple edge. link is a line that points into a file (the compiler's
   "-->"): put a button in it with asChild, and set lit while its line is
   pointed at in the editor */
const terminalLineVariants = cva(
  "min-w-0 break-words whitespace-pre-wrap group-data-[wrap=errors]/terminal:break-normal group-data-[wrap=errors]/terminal:whitespace-pre group-data-[wrap=none]/terminal:break-normal group-data-[wrap=none]/terminal:whitespace-pre",
  {
    variants: {
      variant: {
        output: "text-muted-foreground",
        prompt: "text-foreground before:mr-2 before:text-brand-purple before:content-['$']",
        info: "text-info",
        success: "text-success",
        warning: "text-warning",
        error:
          "text-error group-data-[wrap=errors]/terminal:break-words group-data-[wrap=errors]/terminal:whitespace-pre-wrap",
        highlight:
          "relative -mx-3 bg-brand-purple/12 px-3 text-foreground before:absolute before:inset-y-0 before:left-0 before:w-0.5 before:bg-brand-purple",
        link: "-mx-3 block w-[calc(100%+1.5rem)] px-3 text-left text-muted-foreground underline decoration-dotted underline-offset-4 transition-colors duration-150 ease-standard outline-none hover:text-foreground focus-visible:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset data-lit:bg-error/15 data-lit:text-foreground motion-reduce:transition-none pointer-coarse:min-h-11",
      },
    },
    defaultVariants: {
      variant: "output",
    },
  }
)

function TerminalLine({
  className,
  variant = "output",
  lit = false,
  asChild = false,
  ...props
}: React.ComponentProps<"div"> &
  VariantProps<typeof terminalLineVariants> & {
    /** a link line whose place in the file is pointed at */
    lit?: boolean
    asChild?: boolean
  }) {
  const Comp = asChild ? Slot.Root : "div"
  return (
    <Comp
      data-slot="terminal-line"
      data-variant={variant}
      data-lit={lit || undefined}
      className={cn(terminalLineVariants({ variant }), className)}
      {...props}
    />
  )
}

/* What it says before anything has run */
function TerminalEmpty({ className, ...props }: React.ComponentProps<"p">) {
  return (
    <p
      data-slot="terminal-empty"
      className={cn("py-3 font-sans text-caption whitespace-normal text-muted-foreground", className)}
      {...props}
    />
  )
}

/* The stages of a run that has several, a deploy's, while it goes */
function TerminalStages({ className, ...props }: React.ComponentProps<"ol">) {
  return <ol data-slot="terminal-stages" className={cn("flex flex-col gap-2", className)} {...props} />
}

/* done is ticked, running spins, pending waits in grey */
function TerminalStage({
  className,
  status = "pending",
  children,
  ...props
}: React.ComponentProps<"li"> & { status?: "done" | "running" | "pending" }) {
  return (
    <li
      data-slot="terminal-stage"
      data-status={status}
      className={cn("flex items-center gap-2 text-foreground data-[status=pending]:text-muted-foreground", className)}
      {...props}
    >
      {status === "done" ? (
        <Check strokeWidth={2.5} aria-hidden="true" className="size-3.5 shrink-0 text-success" />
      ) : status === "running" ? (
        <Spinner className="size-3.5 shrink-0" />
      ) : (
        <span aria-hidden="true" className="size-3.5 shrink-0" />
      )}
      {children}
    </li>
  )
}

/* The prompt's block caret, in Solana's green, blinking */
function TerminalCaret({ className, ...props }: React.ComponentProps<"span">) {
  return (
    <span
      data-slot="terminal-caret"
      aria-hidden="true"
      className={cn("inline-block h-[1.1em] w-[0.6em] translate-y-[0.2em] bg-success animate-caret motion-reduce:animate-none", className)}
      {...props}
    />
  )
}

export { Terminal, TerminalCaret, TerminalEmpty, TerminalLine, TerminalStage, TerminalStages, terminalLineVariants }
