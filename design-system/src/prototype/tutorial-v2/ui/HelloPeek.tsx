import { useEffect, useRef, useState, type PointerEvent, type ReactNode } from "react"

import { Popover, PopoverAnchor, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { cn } from "@/lib/utils"

import { msgLine } from "../check"
import { useStore } from "../store"
import { hang, highlight } from "./CodeView"
import { Prose } from "./Prose"

const FILE = "src/lib.rs"

/** Where the program's line came from, as a caption: "from msg! · src/lib.rs:10". It opens a peek
 * of lib.rs around that line, read only, so the log reads as the code's own words even on step 3,
 * where the open file is the client. With a mouse it opens on hover and a click keeps it open; a
 * finger taps it, on the phone too. `before` is what sits over the caption, the lit line itself in
 * the terminal: the peek opens off both, so it never covers the line it explains */
export function HelloSource({ before, className, inline = false }: { before?: ReactNode; className?: string; inline?: boolean }) {
  const { s } = useStore()
  const lib = s.files[FILE] ?? ""
  const line = msgLine(lib)
  const rows = lib.split("\n")
  // The line and one either side: the function it sits in, and its end
  const shown = [line - 1, line, line + 1].filter((n) => n >= 1 && n <= rows.length)
  // The shared indent goes, so the peek's narrow box spends its width on the code
  const indent = Math.min(
    ...shown
      .map((n) => rows[n - 1])
      .filter((l) => l.trim())
      .map((l) => l.match(/^\s*/)?.[0].length ?? 0)
  )

  const [open, setOpen] = useState(false)
  // Opened by a click, it stays when the pointer leaves; opened by hover, it goes with the pointer
  const [pinned, setPinned] = useState(false)
  const timer = useRef(0)
  useEffect(() => () => window.clearTimeout(timer.current), [])
  const later = (fn: () => void, ms: number) => {
    window.clearTimeout(timer.current)
    timer.current = window.setTimeout(fn, ms)
  }
  const enter = (e: PointerEvent) => {
    if (e.pointerType !== "mouse") return
    // A short wait, so passing over the log on the way somewhere doesn't flash it
    later(() => setOpen(true), open ? 0 : 150)
  }
  const leave = (e: PointerEvent) => {
    if (e.pointerType !== "mouse" || pinned) return
    later(() => setOpen(false), 200)
  }

  return (
    <Popover
      open={open}
      onOpenChange={(to) => {
        window.clearTimeout(timer.current)
        setOpen(to)
        setPinned(to)
      }}
    >
      <PopoverAnchor asChild>
        <div className={className}>
          {before}
          <PopoverTrigger asChild>
            <button
              type="button"
              onPointerEnter={enter}
              onPointerLeave={leave}
              onClick={(e) => {
                // Already open from hover: the click keeps it, rather than closing what it points at
                if (open && !pinned) {
                  e.preventDefault()
                  setPinned(true)
                }
              }}
              // A plain string, not cn: cn would drop text-caption next to the colour
              className={`flex items-center gap-1.5 font-sans text-caption text-muted-foreground underline-offset-4 hover:text-foreground hover:underline ${inline ? "shrink-0 pointer-coarse:-my-3 pointer-coarse:min-h-11" : "mb-0.5 pointer-coarse:min-h-11"}`}
            >
              {/* Inline it sits beside the log line it explains, so it needs no arrow pointing back up */}
              {!inline && (
                <span aria-hidden="true" className="font-mono no-underline">
                  ↳
                </span>
              )}
              {inline ? "msg!" : "from msg!"} · {FILE}:{line}
            </button>
          </PopoverTrigger>
        </div>
      </PopoverAnchor>
      <PopoverContent
        side="top"
        align="start"
        // A peek to read, not a form: the focus stays where it was, so the log keeps its place
        onOpenAutoFocus={(e) => e.preventDefault()}
        onPointerEnter={() => window.clearTimeout(timer.current)}
        onPointerLeave={(e) => leave(e)}
        aria-label={`${FILE}, line ${line}`}
        className="w-80 max-w-[calc(100vw-2rem)] gap-0 overflow-hidden p-0"
      >
        <div className="flex items-center justify-between gap-3 border-b border-border px-3 py-2 text-caption">
          <span className="font-mono text-foreground">{FILE}</span>
          <span className="text-muted-foreground">Read only</span>
        </div>
        <pre className="m-0 py-1.5 font-mono text-code">
          {shown.map((n) => {
            const code = rows[n - 1].slice(indent)
            return (
              <div key={n} className={cn("flex border-l-2 border-transparent pr-3", n === line && "border-brand-purple bg-brand-purple/12")}>
                <span className="w-9 shrink-0 pr-2.5 text-right text-subtle select-none">{n}</span>
                <code style={hang(code)} className="min-w-0 flex-1 break-words whitespace-pre-wrap text-syntax-plain">
                  {highlight(code)}
                </code>
              </div>
            )
          })}
        </pre>
        <p className="border-t border-border px-3 py-2 text-caption text-muted-foreground">
          <Prose text="`msg!` wrote this line to the program log, and the transaction brought it back." />
        </p>
      </PopoverContent>
    </Popover>
  )
}

/** The line the program logged, lit in the terminal's log, with where it came from under it */
export function HelloLine({ text }: { text: string }) {
  return (
    <HelloSource
      before={
        // Lit, with a purple edge: your hello, back from the network
        <div className="relative -mx-4 bg-brand-purple/12 px-4 text-foreground before:absolute before:inset-y-0 before:left-0 before:w-0.5 before:bg-brand-purple">{text}</div>
      }
    />
  )
}
