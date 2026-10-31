import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { Check, FilePlus2 } from "lucide-react"
import { cn } from "@/lib/utils"

import { CodeBlockContent } from "@/components/ui/code-block"
import { DiffContent } from "@/components/ui/diff"

/* A file the assistant touched, in the conversation.
   wrote     its name and the first lines written, numbered, so the chat
             keeps a record of what was written even with another file
             open. A FileChangeOpen makes the whole card the way back to
             the lines
   created   one row: Created, the path, a New file tag
   proposal  a change shown before it lands: a diff, then Apply and Keep
             it. Once answered it folds to a FileChangeRecord */

type Variant = "wrote" | "created" | "proposal"

const FileChangeContext = React.createContext<Variant>("wrote")

const fileChangeVariants = cva("group/file-change relative overflow-hidden border border-border bg-card-ground", {
  variants: {
    variant: {
      wrote: "rounded-control transition-colors duration-100 has-[[data-slot=file-change-open]:hover]:border-border-strong motion-reduce:transition-none",
      created: "rounded-control transition-colors duration-100 has-[[data-slot=file-change-open]:hover]:border-border-strong motion-reduce:transition-none",
      proposal: "rounded-panel",
    },
  },
  defaultVariants: {
    variant: "wrote",
  },
})

function FileChange({ className, variant = "wrote", ...props }: React.ComponentProps<"div"> & VariantProps<typeof fileChangeVariants>) {
  const v = variant ?? "wrote"
  return (
    <FileChangeContext.Provider value={v}>
      <div data-slot="file-change" data-variant={v} className={cn(fileChangeVariants({ variant: v }), className)} {...props} />
    </FileChangeContext.Provider>
  )
}

/* The card's head. A written file is its name, nothing more: the numbers
   under it already say which lines, and the whole card opens them, so a
   corner arrow was a second sign for the same thing.
   A created one has its icon; a proposal is a plain path:line */
function FileChangeHeader({ className, children, ...props }: React.ComponentProps<"div">) {
  const variant = React.useContext(FileChangeContext)
  return (
    <div
      data-slot="file-change-header"
      className={cn(
        "flex items-center gap-2 px-3 [&>[data-slot=tag]]:ml-auto",
        variant === "wrote" && "h-8",
        variant === "created" && "h-9 pointer-coarse:h-11",
        variant === "proposal" && "h-7 border-b border-border font-mono text-[0.75rem] text-muted-foreground",
        className
      )}
      {...props}
    >
      {variant === "created" && <FilePlus2 aria-hidden="true" className="size-3.5 shrink-0 text-muted-foreground" />}
      {children}
    </div>
  )
}

/* The path. On a narrow row it gives way, never the tag beside it */
function FileChangeTitle({ className, ...props }: React.ComponentProps<"span">) {
  return (
    <span
      data-slot="file-change-title"
      className={cn("min-w-0 truncate font-mono text-[0.75rem] text-foreground group-data-[variant=proposal]/file-change:text-muted-foreground", className)}
      {...props}
    />
  )
}

/* The verb before a created file's path: Created */
function FileChangeLabel({ className, ...props }: React.ComponentProps<"span">) {
  return <span data-slot="file-change-label" className={cn("shrink-0 text-caption text-muted-foreground", className)} {...props} />
}

/* A word on how it was written, under the head: "I put it at the end:
   your own lines are kept." */
function FileChangeNote({ className, ...props }: React.ComponentProps<"p">) {
  return <p data-slot="file-change-note" className={cn("border-t border-border px-3 py-1.5 text-[0.75rem] text-warning-ink", className)} {...props} />
}

/* The first lines written, on the card's own ground, as CodeBlockLines.
   start is the first line's number in the file. 12px on a 20px line. A
   long line scrolls sideways instead of breaking: a program id wrapped
   under the line's start and read as a second statement. The numbers stay
   put while the code moves: they start 12px in, under the file's name, so
   the head and the listing share one left edge, in a 14px column, and the
   code follows 8px past it. Put a FileChangeMore last, inside. Plain code
   is in the foreground, which reads on paper too */
const EXCERPT_LINE = [
  "[&_[data-slot=code-block-line]]:whitespace-pre",
  "[&_[data-slot=code-block-line]]:before:sticky [&_[data-slot=code-block-line]]:before:left-0",
  "[&_[data-slot=code-block-line]]:before:mr-2 [&_[data-slot=code-block-line]]:before:w-[26px] [&_[data-slot=code-block-line]]:before:pl-3",
  "[&_[data-slot=code-block-line]]:before:bg-card-ground [&_[data-slot=code-block-line]]:before:text-left [&_[data-slot=code-block-line]]:before:tabular-nums",
]

function FileChangeExcerpt({
  className,
  start = 1,
  style,
  children,
  ...props
}: Omit<React.ComponentProps<typeof CodeBlockContent>, "wrap"> & {
  start?: number
}) {
  return (
    <CodeBlockContent
      data-slot="file-change-excerpt"
      style={{ counterReset: `line ${start - 1}`, ...style }}
      className={cn("p-0 pb-2 text-[12px] leading-5 text-foreground", EXCERPT_LINE, className)}
      {...props}
    >
      {/* As wide as the longest line, so each line is too and its number has room to stay put */}
      <span className="block w-max min-w-full pr-3">{children}</span>
    </CodeBlockContent>
  )
}

/* What the excerpt left out, the excerpt's last row, 4 under the code: an
   ellipsis in the numbers' column holds the left edge, and "8 more lines"
   sits on the code's edge in the interface face. In mono on the numbers'
   edge it read as line 8; indented alone to the code it floated off. It
   stays put while the code scrolls */
function FileChangeMore({ className, children, ...props }: React.ComponentProps<"span">) {
  return (
    <span
      data-slot="file-change-more"
      className={cn("sticky left-0 mt-1 flex w-fit text-[12px] leading-5 text-subtle", className)}
      {...props}
    >
      <span aria-hidden="true" className="w-[26px] shrink-0 pl-3 font-mono select-none">
        ⋯
      </span>
      <span className="pl-2 font-sans">{children}</span>
    </span>
  )
}

function FileChangeDiff({ className, ...props }: React.ComponentProps<typeof DiffContent>) {
  return (
    <DiffContent
      data-slot="file-change-diff"
      className={cn("bg-surface-well py-1.5 text-[0.75rem] leading-[1.6] break-words whitespace-pre-wrap", className)}
      {...props}
    />
  )
}

/* Apply and Keep it, under the change */
function FileChangeActions({ className, ...props }: React.ComponentProps<"div">) {
  return <div data-slot="file-change-actions" className={cn("flex items-center gap-2 border-t border-border px-3 py-2", className)} {...props} />
}

/* The whole card as one button, so a press anywhere on it opens the file
   at the lines. Give it an aria-label that says where. Empty, it covers the
   card. Around the head and the excerpt it is the card's body instead: a
   cover would take the wheel and the swipe, and a long line could not
   scroll */
function FileChangeOpen({ className, children, ...props }: React.ComponentProps<"button">) {
  return (
    <button
      type="button"
      data-slot="file-change-open"
      className={cn(
        // An outline, not an inset ring: the numbers' ground would cover a ring along the left edge
        "rounded-[inherit] outline-none focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring",
        children ? "block w-full min-w-0 text-left" : "absolute inset-0",
        className
      )}
      {...props}
    >
      {children}
    </button>
  )
}

/* What a proposal folds to once answered: applied, with a green check, or
   kept as it was, with a grey one */
function FileChangeRecord({ className, status = "applied", children, ...props }: React.ComponentProps<"div"> & { status?: "applied" | "kept" }) {
  return (
    <div
      data-slot="file-change-record"
      data-status={status}
      className={cn("flex h-9 items-center gap-2 rounded-control border border-border bg-card-ground px-3 text-caption text-muted-foreground", className)}
      {...props}
    >
      <Check strokeWidth={2.5} aria-hidden="true" className={cn("size-3.5 shrink-0", status === "applied" ? "text-success" : "text-subtle")} />
      <span className="min-w-0 truncate">{children}</span>
    </div>
  )
}

export {
  FileChange,
  FileChangeActions,
  FileChangeDiff,
  FileChangeExcerpt,
  FileChangeHeader,
  FileChangeLabel,
  FileChangeMore,
  FileChangeNote,
  FileChangeOpen,
  FileChangeRecord,
  FileChangeTitle,
  fileChangeVariants,
}
