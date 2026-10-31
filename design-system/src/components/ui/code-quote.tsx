import * as React from "react"
import { cn } from "@/lib/utils"

/* One line of a file quoted in a message: its path and line, a way back to
   it in the editor, then the line itself. tone says how the line reads:
   default   lit on the card's ground, a line the message is about
   error     red, with the token the compiler named under a wavy line
   resolved  an error quote once it no longer holds (the step passed, or
             the line changed): plain, the mark gone, the words kept */
function CodeQuote({ className, tone = "default", ...props }: React.ComponentProps<"div"> & { tone?: "default" | "error" | "resolved" }) {
  return (
    <div
      data-slot="code-quote"
      data-tone={tone}
      className={cn("group/code-quote overflow-hidden rounded-control border border-border bg-surface-well", className)}
      {...props}
    />
  )
}

/* Under a finger the head is a thumb's height, so its action is a target */
function CodeQuoteHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="code-quote-header"
      className={cn("flex h-7 items-center gap-2 border-b border-border px-3 text-[0.75rem] pointer-coarse:h-11 pointer-coarse:pr-1", className)}
      {...props}
    />
  )
}

/* Where the line is: src/lib.rs:9 */
function CodeQuoteTitle({ className, ...props }: React.ComponentProps<"span">) {
  return <span data-slot="code-quote-title" className={cn("min-w-0 truncate font-mono text-muted-foreground", className)} {...props} />
}

/* The way back to the line in the editor: "Show in lib.rs" */
function CodeQuoteAction({ className, children, ...props }: React.ComponentProps<"button">) {
  return (
    <button
      type="button"
      data-slot="code-quote-action"
      className={cn(
        "ml-auto flex shrink-0 items-center gap-1 rounded-sm text-muted-foreground underline-offset-[3px] outline-none hover:text-foreground hover:underline focus-visible:ring-2 focus-visible:ring-ring pointer-coarse:h-11 pointer-coarse:px-2",
        className
      )}
      {...props}
    >
      {children}
    </button>
  )
}

/* The line, wrapped rather than cut. Pass it highlighted, as children.
   12px on a 20px line, a whole pixel line as the written listings use, so
   a wrapped line's rows sit on the same grid as theirs.
   Plain code is in the foreground: --syntax-plain has no paper value, and
   on the product's ground the two are the same colour */
function CodeQuoteLine({ className, ...props }: React.ComponentProps<"code">) {
  return (
    <code
      data-slot="code-quote-line"
      className={cn(
        "block border-l-2 border-border-strong bg-card-ground px-3 py-1.5 font-mono text-[12px] leading-5 break-words whitespace-pre-wrap text-foreground",
        "group-data-[tone=error]/code-quote:border-error group-data-[tone=error]/code-quote:bg-error/10 group-data-[tone=resolved]/code-quote:bg-transparent",
        className
      )}
      {...props}
    />
  )
}

/* The token the compiler named, under a wavy red line that draws in. It
   marks only while the quote's tone is error */
function CodeQuoteMark({ className, ...props }: React.ComponentProps<"span">) {
  return (
    <span
      data-slot="code-quote-mark"
      className={cn(
        "group-data-[tone=error]/code-quote:squiggle group-data-[tone=error]/code-quote:animate-squiggle group-data-[tone=error]/code-quote:motion-reduce:animate-none",
        className
      )}
      {...props}
    />
  )
}

export { CodeQuote, CodeQuoteAction, CodeQuoteHeader, CodeQuoteLine, CodeQuoteMark, CodeQuoteTitle }
