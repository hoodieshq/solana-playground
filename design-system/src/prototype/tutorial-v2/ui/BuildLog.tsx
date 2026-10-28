import { cn } from "@/lib/utils"

import { HelloLine } from "./HelloPeek"

// " --> src/lib.rs:9:32": where the compiler points
const POINTER = /-->\s*\S+?:(\d+)/

/** A line the program itself logged, other than Anchor's own "Instruction:" line: what msg! said */
// A program's own error is the runtime's line, not a msg!, so it isn't lit as one
const said = (line: string) => line.startsWith("Program log: ") && !line.startsWith("Program log: Instruction:") && !line.startsWith("Program log: AnchorError")

/** With `onJump`, a line that points into the file is a link: it takes the editor to that line, as an IDE does.
 * `onPoint` says which line of the file the pointer is over that link, and `lit` lights the link for
 * a line hovered in the editor, so the two read as one error.
 * `wrapErrors` lets the compiler's `error[...]` line wrap, for a phone, where it would run far past the edge.
 * `wrap` wraps every line, for the phone's terminal, where a program id cut at the edge can't be read.
 * `bare` is the log inside a card's details: no well, smaller, every line wrapped under a hanging
 * indent, and msg! lines lit without a second peek (the card has one) */
export function BuildLog({
  log,
  empty = "Nothing built yet. The build runs after you apply a patch.",
  onJump,
  onPoint,
  lit = null,
  wrapErrors = false,
  wrap = false,
  bare = false,
  className,
}: {
  log: string[]
  empty?: string
  onJump?: (line: number) => void
  onPoint?: (line: number | null) => void
  lit?: number | null
  wrapErrors?: boolean
  wrap?: boolean
  bare?: boolean
  className?: string
}) {
  if (log.length === 0) return <p className="flex-1 px-4 py-6 text-caption text-muted-foreground">{empty}</p>
  return (
    // A log line doesn't wrap: it scrolls and fades at the edge, like code in the lesson, so a key never
    // leaves its last character alone on the next line
    <pre
      className={
        bare
          ? // A plain string, not cn: cn would read the size next to the colours as one of them
            `font-mono text-[0.75rem] leading-5 whitespace-pre-wrap wrap-anywhere [&>div]:pl-4 [&>div]:-indent-4 ${className ?? ""}`
          : cn(
              "min-h-0 flex-1 overflow-auto bg-surface-well px-4 py-3 font-mono text-code",
              wrap ? "whitespace-pre-wrap wrap-anywhere" : "whitespace-pre [mask-image:linear-gradient(to_right,#000_calc(100%-1.5rem),transparent)]",
              className
            )
      }
    >
      {log.map((line, i) => {
        const tone = cn(
          "text-muted-foreground",
          line.startsWith("$") && "text-muted-foreground",
          line.startsWith("error") && "text-error",
          /successful|finished$|success$/i.test(line) && "text-success",
          // The one line that says what's wrong wraps whole, clear of the fade at the edge. The rest
          // keep their columns
          wrapErrors && line.startsWith("error") && "pr-6 break-words whitespace-pre-wrap"
        )
        if (said(line))
          return bare ? (
            <div key={i} className="text-foreground">
              {line}
            </div>
          ) : (
            <HelloLine key={i} text={line} />
          )
        const to = onJump && line.match(POINTER)
        return to ? (
          <button
            key={i}
            type="button"
            title="Show in the editor"
            onClick={() => onJump(Number(to[1]))}
            onPointerEnter={() => onPoint?.(Number(to[1]))}
            onPointerLeave={() => onPoint?.(null)}
            onFocus={() => onPoint?.(Number(to[1]))}
            onBlur={() => onPoint?.(null)}
            className={cn(
              tone,
              // Full width, so the tint lit from the editor runs across the log as the editor's does
              "-mx-4 block w-[calc(100%+2rem)] px-4 text-left underline decoration-dotted underline-offset-4 transition-colors duration-150 ease-standard hover:text-foreground motion-reduce:transition-none",
              lit === Number(to[1]) && "bg-error/15 text-foreground"
            )}
          >
            {line}
          </button>
        ) : (
          <div key={i} className={tone}>
            {line}
          </div>
        )
      })}
    </pre>
  )
}
