import * as React from "react"
import { cn } from "@/lib/utils"

import { CodeBlockContent, CodeBlockLine } from "@/components/ui/code-block"
import { Popover, PopoverAnchor, PopoverContent, PopoverTrigger } from "@/components/ui/popover"

/* Where a line in a log came from: a caption under it, "from msg! ·
   src/lib.rs:10", that opens a read only peek of the file around that
   line, so the log reads as the code's own words even with another file
   open. With a mouse it opens on hover after a short wait, and a click
   keeps it open; a finger taps it. Wrap the line it explains and the
   trigger in a SourcePeekAnchor, and the peek opens off both, so it never
   covers the line. */

type SourcePeekContextValue = {
  open: boolean
  pinned: boolean
  setPinned: (pinned: boolean) => void
  enter: (e: React.PointerEvent) => void
  leave: (e: React.PointerEvent) => void
  hold: () => void
}

const SourcePeekContext = React.createContext<SourcePeekContextValue | null>(null)

function useSourcePeek() {
  const context = React.useContext(SourcePeekContext)
  if (!context) throw new Error("SourcePeek parts must be inside a SourcePeek")
  return context
}

function SourcePeek({ children, ...props }: Omit<React.ComponentProps<typeof Popover>, "open" | "onOpenChange">) {
  const [open, setOpen] = React.useState(false)
  /* Opened by a click it stays when the pointer leaves; opened by hover it
     goes with the pointer */
  const [pinned, setPinned] = React.useState(false)
  const timer = React.useRef(0)
  React.useEffect(() => () => window.clearTimeout(timer.current), [])
  const later = (fn: () => void, ms: number) => {
    window.clearTimeout(timer.current)
    timer.current = window.setTimeout(fn, ms)
  }
  const value: SourcePeekContextValue = {
    open,
    pinned,
    setPinned,
    /* A short wait, so passing over the log on the way somewhere does not
       flash it */
    enter: (e) => {
      if (e.pointerType === "mouse") later(() => setOpen(true), open ? 0 : 150)
    },
    leave: (e) => {
      if (e.pointerType === "mouse" && !pinned) later(() => setOpen(false), 200)
    },
    hold: () => window.clearTimeout(timer.current),
  }
  return (
    <SourcePeekContext.Provider value={value}>
      <Popover
        open={open}
        onOpenChange={(to) => {
          window.clearTimeout(timer.current)
          setOpen(to)
          setPinned(to)
        }}
        {...props}
      >
        {children}
      </Popover>
    </SourcePeekContext.Provider>
  )
}

/* The line explained and its caption, together, for the peek to open off */
function SourcePeekAnchor({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <PopoverAnchor asChild>
      <div data-slot="source-peek-anchor" className={className} {...props} />
    </PopoverAnchor>
  )
}

/* The caption that opens the peek. caption sits under the line, after an
   arrow that points back up to it; inline sits beside it, with none */
function SourcePeekTrigger({
  className,
  variant = "caption",
  children,
  onClick,
  onPointerEnter,
  onPointerLeave,
  ...props
}: React.ComponentProps<"button"> & { variant?: "caption" | "inline" }) {
  const { open, pinned, setPinned, enter, leave } = useSourcePeek()
  return (
    <PopoverTrigger asChild>
      <button
        type="button"
        data-slot="source-peek-trigger"
        data-variant={variant}
        onPointerEnter={(e) => {
          enter(e)
          onPointerEnter?.(e)
        }}
        onPointerLeave={(e) => {
          leave(e)
          onPointerLeave?.(e)
        }}
        onClick={(e) => {
          /* Already open from hover: the click keeps it, rather than
             closing what it points at */
          if (open && !pinned) {
            e.preventDefault()
            setPinned(true)
          }
          onClick?.(e)
        }}
        className={cn(
          "flex items-center gap-1.5 rounded-sm font-mono text-code text-muted-foreground underline-offset-4 outline-none hover:text-foreground hover:underline focus-visible:ring-2 focus-visible:ring-ring pointer-coarse:min-h-11",
          variant === "caption" ? "mb-0.5" : "shrink-0 pointer-coarse:-my-3",
          className
        )}
        {...props}
      >
        {variant === "caption" && <span aria-hidden="true">↳</span>}
        {children}
      </button>
    </PopoverTrigger>
  )
}

/* The peek: the file's path, then the line and context lines either side,
   the line itself lit, with the indent they share taken off so the narrow
   box spends its width on the code. code is the whole file; renderLine
   highlights a line, if the app has a highlighter. A peek is to read, not a
   form: the focus stays where it was, so the log keeps its place */
function SourcePeekContent({
  className,
  file,
  code,
  line,
  context = 1,
  label = "Read only",
  renderLine,
  children,
  onPointerEnter,
  onPointerLeave,
  ...props
}: React.ComponentProps<typeof PopoverContent> & {
  file: string
  code: string
  line: number
  context?: number
  /** said on the right of the path */
  label?: React.ReactNode
  renderLine?: (code: string, number: number) => React.ReactNode
}) {
  const { hold, leave } = useSourcePeek()
  const rows = code.split("\n")
  const first = Math.max(1, line - context)
  const last = Math.min(rows.length, line + context)
  const shown = Array.from({ length: Math.max(0, last - first + 1) }, (_, i) => first + i)
  const leads = shown.map((n) => rows[n - 1]).filter((l) => l.trim()).map((l) => l.match(/^\s*/)?.[0].length ?? 0)
  const indent = leads.length ? Math.min(...leads) : 0
  return (
    <PopoverContent
      data-slot="source-peek-content"
      side="top"
      align="start"
      aria-label={`${file}, line ${line}`}
      onOpenAutoFocus={(e) => e.preventDefault()}
      onPointerEnter={(e) => {
        hold()
        onPointerEnter?.(e)
      }}
      onPointerLeave={(e) => {
        leave(e)
        onPointerLeave?.(e)
      }}
      className={cn("w-80 max-w-[calc(100vw-2rem)] gap-0 overflow-hidden p-0", className)}
      {...props}
    >
      <div className="flex items-center justify-between gap-3 border-b border-border px-3 py-2 text-caption">
        <span className="min-w-0 truncate font-mono text-foreground">{file}</span>
        <span className="shrink-0 text-muted-foreground">{label}</span>
      </div>
      <CodeBlockContent wrap style={{ counterReset: `line ${first - 1}` }} className="m-0 overflow-visible px-3 py-1.5 text-code text-foreground">
        {shown.map((n) => {
          const text = rows[n - 1].slice(indent)
          return (
            <CodeBlockLine key={n} state={n === line ? "focus" : undefined} indent={text.match(/^\s*/)?.[0].length ?? 0}>
              {renderLine ? renderLine(text, n) : text}
            </CodeBlockLine>
          )
        })}
      </CodeBlockContent>
      {children}
    </PopoverContent>
  )
}

/* A line under the code on what it did: "msg! wrote this line to the
   program log, and the transaction brought it back." */
function SourcePeekCaption({ className, ...props }: React.ComponentProps<"p">) {
  return (
    <p
      data-slot="source-peek-caption"
      className={cn("border-t border-border px-3 py-2 text-caption text-muted-foreground", className)}
      {...props}
    />
  )
}

export { SourcePeek, SourcePeekAnchor, SourcePeekCaption, SourcePeekContent, SourcePeekTrigger }
