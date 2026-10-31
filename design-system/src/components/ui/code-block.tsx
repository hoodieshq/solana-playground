import * as React from "react"
import { cn } from "@/lib/utils"

function CodeBlock({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="code-block"
      className={cn(
        "group/code-block flex w-full min-w-0 flex-col overflow-hidden rounded-xl border border-border bg-surface-base",
        className
      )}
      {...props}
    />
  )
}

function CodeBlockHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="code-block-header"
      className={cn("flex h-9 items-center gap-2 border-b border-border pr-1.5 pl-3", className)}
      {...props}
    />
  )
}

function CodeBlockTitle({ className, ...props }: React.ComponentProps<"span">) {
  return (
    <span
      data-slot="code-block-title"
      className={cn("min-w-0 truncate font-mono text-xs text-muted-foreground", className)}
      {...props}
    />
  )
}

function CodeBlockActions({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="code-block-actions"
      className={cn(
        "ml-auto flex items-center gap-1 opacity-0 transition-opacity group-hover/code-block:opacity-100 focus-within:opacity-100 [@media(hover:none)]:opacity-100",
        className
      )}
      {...props}
    />
  )
}

/* wrap soft-wraps long lines, for a narrow screen. A wrapped line's rest
   hangs two characters in from where its own code starts, so it reads as
   the same line going on, never as a new one at the left edge */
function CodeBlockContent({ className, wrap = false, ...props }: React.ComponentProps<"pre"> & { wrap?: boolean }) {
  return (
    <pre
      data-slot="code-block-content"
      data-wrap={wrap || undefined}
      className={cn(
        "group/code-block-content overflow-x-auto p-3 font-mono text-[0.8125rem] leading-relaxed text-syntax-plain [counter-reset:line]",
        className
      )}
      {...props}
    />
  )
}

/* One line. Numbered by CSS, so copying the code leaves the numbers behind.
   A state marks it with an edge down its left side:
   focus    what the lesson is about, on the accent's tint
   added    just written; with arrive (its place in the run) it comes in
            lit green and settles
   landing  where an answer will go, a dashed edge
   error    the line a failed build points at, on red */
function CodeBlockLine({
  className,
  state,
  arrive,
  indent,
  style,
  children,
  ...props
}: React.ComponentProps<"code"> & {
  state?: "focus" | "added" | "landing" | "error"
  /** the line's place in a run of added lines, to stagger their arrival */
  arrive?: number
  /** leading spaces, for the hanging indent when the code is not a plain string */
  indent?: number
}) {
  const lead = indent ?? (typeof children === "string" ? (children.match(/^\s*/)?.[0].length ?? 0) : 0)
  return (
    <code
      data-slot="code-block-line"
      data-state={state}
      style={
        {
          ...(arrive !== undefined && { "--i": arrive }),
          ...(lead > 0 && { "--code-block-indent": `${lead}ch` }),
          ...style,
        } as React.CSSProperties
      }
      className={cn(
        "block min-h-[1lh] [counter-increment:line] before:mr-4 before:inline-block before:w-5 before:text-right before:text-subtle before:content-[counter(line)] before:select-none",
        "group-data-wrap/code-block-content:pl-[calc(2.25rem+var(--code-block-indent,0ch)+2ch)] group-data-wrap/code-block-content:-indent-[calc(2.25rem+var(--code-block-indent,0ch)+2ch)] group-data-wrap/code-block-content:break-words group-data-wrap/code-block-content:whitespace-pre-wrap",
        "data-state:-mx-3 data-state:border-l-2 data-state:pr-3 data-state:pl-2.5 data-state:group-data-wrap/code-block-content:pl-[calc(0.625rem+2.25rem+var(--code-block-indent,0ch)+2ch)]",
        "data-[state=focus]:border-primary data-[state=focus]:bg-primary/10",
        "data-[state=added]:border-foreground/25 data-[state=added]:before:text-muted-foreground",
        arrive !== undefined && state === "added" && "animate-arrive motion-reduce:animate-none",
        "data-[state=landing]:border-dashed data-[state=landing]:border-border-strong",
        "data-[state=error]:border-error data-[state=error]:bg-error/10",
        className
      )}
      {...props}
    >
      {children}
    </code>
  )
}

/* The token a compiler named, under a wavy red line that draws in */
function CodeBlockMark({ className, ...props }: React.ComponentProps<"span">) {
  return (
    <span
      data-slot="code-block-mark"
      className={cn("squiggle animate-squiggle motion-reduce:animate-none", className)}
      {...props}
    />
  )
}

export { CodeBlock, CodeBlockActions, CodeBlockContent, CodeBlockHeader, CodeBlockLine, CodeBlockMark, CodeBlockTitle }
