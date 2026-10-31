import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

function Diff({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="diff"
      className={cn("flex w-full min-w-0 flex-col overflow-hidden rounded-xl border border-border bg-surface", className)}
      {...props}
    />
  )
}

function DiffHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="diff-header"
      className={cn("flex items-center gap-2 border-b border-border px-3 py-2", className)}
      {...props}
    />
  )
}

function DiffTitle({ className, ...props }: React.ComponentProps<"span">) {
  return (
    <span data-slot="diff-title" className={cn("min-w-0 truncate font-mono text-xs text-muted-foreground", className)} {...props} />
  )
}

/* Lines added and removed, as the header counts them: +2 −1 */
function DiffStat({
  className,
  added = 0,
  removed = 0,
  ...props
}: React.ComponentProps<"span"> & { added?: number; removed?: number }) {
  return (
    <span data-slot="diff-stat" className={cn("ml-auto flex gap-2 text-xs tabular-nums", className)} {...props}>
      <span className="text-success">+{added}</span>
      <span className="text-error">−{removed}</span>
    </span>
  )
}

function DiffContent({ className, ...props }: React.ComponentProps<"pre">) {
  return (
    <pre
      data-slot="diff-content"
      className={cn("overflow-x-auto py-2 font-mono text-[0.8125rem] leading-relaxed", className)}
      {...props}
    />
  )
}

const diffLineVariants = cva("block px-3 before:mr-2 before:inline-block before:w-2 before:select-none", {
  variants: {
    variant: {
      context: "text-muted-foreground before:content-['_']",
      added: "bg-success/10 text-success before:content-['+']",
      removed: "bg-error/10 text-error before:content-['−']",
    },
  },
  defaultVariants: {
    variant: "context",
  },
})

/* One line. Given a number (null on a removed line, which the new file has
   no number for), it takes the numbered layout: the new file's number, a
   column for the mark, and an edge in green or red down its left side. mark
   puts something else in the mark's column, a DiffNoteTrigger. strike draws
   a removed line through */
function DiffLine({
  className,
  variant = "context",
  number,
  mark,
  strike = false,
  children,
  ...props
}: React.ComponentProps<"code"> &
  VariantProps<typeof diffLineVariants> & {
    number?: number | null
    mark?: React.ReactNode
    strike?: boolean
  }) {
  if (number === undefined) {
    return (
      <code
        data-slot="diff-line"
        data-variant={variant}
        className={cn(diffLineVariants({ variant }), className)}
        {...props}
      >
        {strike ? <Struck>{children}</Struck> : children}
      </code>
    )
  }
  return (
    <code
      data-slot="diff-line"
      data-variant={variant}
      data-numbered=""
      className={cn(
        diffLineVariants({ variant }),
        "flex border-l-2 border-transparent pr-3 pl-0 before:hidden",
        variant === "added" && "border-success",
        variant === "removed" && "border-error",
        className
      )}
      {...props}
    >
      <span data-slot="diff-line-number" aria-hidden="true" className="w-10 shrink-0 pr-2 text-right text-subtle select-none">
        {number}
      </span>
      <span data-slot="diff-line-mark" className="flex w-4 shrink-0 items-start justify-center select-none">
        {mark ?? (variant === "added" ? "+" : variant === "removed" ? "−" : "")}
      </span>
      <span className="min-w-0 flex-1">{strike ? <Struck>{children}</Struck> : children}</span>
    </code>
  )
}

/* Struck through from the code's first character, not across its indent */
function Struck({ children }: { children: React.ReactNode }) {
  const lead = typeof children === "string" ? (children.match(/^\s*/)?.[0] ?? "") : ""
  return (
    <>
      {lead}
      <span className="line-through decoration-error/50">{lead ? (children as string).slice(lead.length) : children}</span>
    </>
  )
}

/* The dot on a line the assistant explains: a button that opens its note
   under the line. Give it an aria-label that names the line */
function DiffNoteTrigger({ className, open = false, ...props }: React.ComponentProps<"button"> & { open?: boolean }) {
  return (
    <button
      type="button"
      data-slot="diff-note-trigger"
      data-state={open ? "open" : "closed"}
      aria-expanded={open}
      className={cn(
        "group/diff-note-trigger relative grid h-[1lh] w-4 place-items-center rounded-sm outline-none focus-visible:ring-2 focus-visible:ring-ring pointer-coarse:before:absolute pointer-coarse:before:-inset-3",
        className
      )}
      {...props}
    >
      <span className="size-[7px] rounded-full bg-brand-purple ring-3 ring-brand-purple/25 group-data-[state=open]/diff-note-trigger:ring-brand-purple/50" />
    </button>
  )
}

/* The note itself, under the line it is about, by the code */
function DiffNote({ className, ...props }: React.ComponentProps<"span">) {
  return (
    <span
      data-slot="diff-note"
      role="note"
      className={cn(
        "my-1.5 mr-3 ml-14 block rounded-control border border-border bg-surface-panel px-3 py-2 font-sans text-caption whitespace-normal text-muted-foreground",
        className
      )}
      {...props}
    />
  )
}

/* Where unchanged lines were left out between two runs of change */
function DiffGap({ className, children, ...props }: React.ComponentProps<"span">) {
  return (
    <span
      data-slot="diff-gap"
      aria-hidden={children ? undefined : true}
      className={cn("block min-h-3 pl-14 font-sans text-xs text-subtle", className)}
      {...props}
    >
      {children}
    </span>
  )
}

function DiffFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div data-slot="diff-footer" className={cn("flex items-center gap-2 border-t border-border px-3 py-2", className)} {...props} />
  )
}

export {
  Diff,
  DiffContent,
  DiffFooter,
  DiffGap,
  DiffHeader,
  DiffLine,
  DiffNote,
  DiffNoteTrigger,
  DiffStat,
  DiffTitle,
  diffLineVariants,
}
