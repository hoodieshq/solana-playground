import { cn } from "@/lib/utils"

// " --> src/lib.rs:9:30": where the compiler points
const POINTER = /-->\s*\S+?:(\d+)/

/** With `onJump`, a line that points into the file is a link: it takes the editor to that line, as an IDE does.
 * `wrapErrors` lets the compiler's `error[...]` line wrap, for a phone, where it would run far past the edge */
export function BuildLog({
  log,
  empty = "Nothing built yet. The build runs after you apply a patch.",
  onJump,
  wrapErrors = false,
}: {
  log: string[]
  empty?: string
  onJump?: (line: number) => void
  wrapErrors?: boolean
}) {
  if (log.length === 0) return <p className="flex-1 px-4 py-6 text-caption text-muted-foreground">{empty}</p>
  return (
    // A log line doesn't wrap: it scrolls and fades at the edge, like code in the lesson, so a key never
    // leaves its last character alone on the next line
    <pre className="min-h-0 flex-1 overflow-auto bg-surface-well px-4 py-3 font-mono text-code whitespace-pre [mask-image:linear-gradient(to_right,#000_calc(100%-1.5rem),transparent)]">
      {log.map((line, i) => {
        const tone = cn(
          "text-muted-foreground",
          line.startsWith("$") && "text-muted-foreground",
          line.startsWith("error") && "text-error",
          /successful|finished$/i.test(line) && "text-success",
          // The one line that says what's wrong wraps whole, clear of the fade at the edge. The rest
          // keep their columns
          wrapErrors && line.startsWith("error") && "pr-6 break-words whitespace-pre-wrap"
        )
        const to = onJump && line.match(POINTER)
        return to ? (
          <button
            key={i}
            type="button"
            title="Show in the editor"
            onClick={() => onJump(Number(to[1]))}
            className={cn(tone, "block text-left underline decoration-dotted underline-offset-4 hover:text-foreground")}
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
