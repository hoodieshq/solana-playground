import { useEffect, useRef } from "react"

import { cn } from "@/lib/utils"

import { highlight } from "./CodeView"

/* The banner's picture: the line the tutorial writes and the line devnet sends back. The two
   strings sit in one column, so the log's "Hello, World!" lands right under the one in msg!, and
   a thread in Solana's two colours runs between them by way of devnet. Every size is in rem and ch,
   so a larger font scales the whole picture and the column still lines up */

// Lines 9 to 12 of src/lib.rs as the first step leaves them, a level out so they fit the banner
const CODE: [number, string][] = [
  [9, "pub fn hello(_ctx: Context<Hello>) -> Result<()> {"],
  [10, '    msg!("Hello, World!");'],
  [11, "    Ok(())"],
  [12, "}"],
]

// The line number takes 3ch, so the H of "Hello" is the 14th character on both lines: 3 + `    msg!("`
// is 13, and so is `Program log: `. The thread runs down the middle of that column
const THREAD_X = "ml-[calc(1rem+13.5ch)]"

// The ease-out and slow duration from the motion tokens, as numbers for the Web Animations API
const EASE_OUT = "cubic-bezier(0.22, 0.61, 0.24, 1)"
const SLOW = 620

// Once per page load: coming back to the gallery shouldn't replay it
let played = false

/** The hello's trip, played once in the fresh state: the thread runs down from msg! through
 * devnet, then the log line arrives and its words glow for a moment. Nothing waits on it, and
 * with reduced motion it's simply all there */
function useArrival(on: boolean) {
  const thread = useRef<HTMLDivElement>(null)
  const dot = useRef<HTMLDivElement>(null)
  const log = useRef<HTMLDivElement>(null)
  const word = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    if (!on || played || !thread.current || !dot.current || !log.current || !word.current) return
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return
    // backwards fill hides each part only until its turn comes; if anything fails it all stays visible
    const runs = [
      thread.current.animate([{ transform: "scaleY(0)" }, { transform: "scaleY(1)" }], { duration: SLOW, delay: 500, easing: EASE_OUT, fill: "backwards" }),
      dot.current.animate(
        // The dot is hidden by its own style before and after, so the run leaves nothing behind
        [
          { top: "0%", opacity: 0 },
          { top: "8%", opacity: 1, offset: 0.1 },
          { top: "100%", opacity: 1, offset: 0.85 },
          { top: "100%", opacity: 0 },
        ],
        { duration: SLOW + 120, delay: 500, easing: EASE_OUT }
      ),
      log.current.animate([{ opacity: 0, transform: "translateY(0.375rem)" }, { opacity: 1, transform: "none" }], { duration: 320, delay: 1050, easing: EASE_OUT, fill: "backwards" }),
      word.current.animate([{ backgroundColor: "rgb(20 241 149 / 0.22)" }, { backgroundColor: "rgb(20 241 149 / 0)" }], { duration: 1400, delay: 1250, easing: "ease-out", fill: "backwards" }),
    ]
    // Marked as played only once it has run to the end. React's dev mode mounts twice, and the
    // first, cancelled run mustn't use up the only one
    runs[2].finished.then(() => (played = true)).catch(() => {})
    return () => runs.forEach((r) => r.cancel())
  }, [on])

  return { thread, dot, log, word }
}

/** `compact` is the phone's: only the msg! line and its echo, as a strip across the banner's top.
 * `done` draws the thread whole instead of dashed: the round trip has been made */
export function StartHereArt({ compact = false, fresh, done }: { compact?: boolean; fresh: boolean; done: boolean }) {
  const { thread, dot, log, word } = useArrival(fresh)
  const lines = compact ? CODE.filter(([n]) => n === 10) : CODE

  return (
    <div
      aria-hidden="true"
      className={cn(
        "pointer-events-none grid font-mono text-[0.75rem] select-none [--lh:1.25rem]",
        compact
          ? // top pad, the msg! line, the trip, the log line, bottom pad
            "grid-rows-[0.875rem_var(--lh)_1.75rem_var(--lh)_0.875rem] text-[0.6875rem]"
          : // the file's tab, pad, four lines, pad, the trip, then the log strip with its pads
            "grid-rows-[2rem_0.5rem_repeat(4,var(--lh))_0.75rem_2.25rem_0.5rem_var(--lh)_0.5rem]"
      )}
    >
      {/* The cards blur the pixels behind them, and a blur paints above plain blocks, so everything
          drawn over the cards is positioned to stay on top */}
      {!compact && (
        <>
          {/* The editor and the terminal, as two cards the thread crosses between */}
          <div className="col-start-1 rounded-panel border border-border bg-surface-well/75 backdrop-blur-[6px] [grid-row:1/8]" />
          <div className="col-start-1 rounded-control border border-border bg-surface-well/75 backdrop-blur-[6px] [grid-row:9/12]" />
          <div className="relative col-start-1 row-start-1 flex items-center border-b border-border px-4 text-muted-foreground">src/lib.rs</div>
        </>
      )}

      {lines.map(([n, code], i) => (
        <div
          key={n}
          style={{ gridRow: (compact ? 2 : 3) + i }}
          className={cn(
            "relative col-start-1 overflow-hidden px-4 leading-(--lh) whitespace-pre text-syntax-plain",
            // The signature line runs past the picture's edge, so it fades out rather than stopping at a cut
            n === 9 && "mask-[linear-gradient(to_right,#000_calc(100%-2.5rem),transparent)]"
          )}
        >
          <span className="text-syntax-comment">{String(n).padStart(2)} </span>
          {highlight(code)}
        </div>
      ))}

      {/* The trip: from under msg! to the top of the log line, past devnet on the way */}
      <div className={cn("relative col-start-1 w-px", THREAD_X, compact ? "[grid-row:3/4]" : "[grid-row:5/10]")}>
        <div
          ref={thread}
          className={cn(
            "absolute inset-0 origin-top bg-linear-to-b from-brand-purple to-brand-green",
            // Dashed until the tutorial is done: a 3px dash every 6px, cut out of the gradient
            !done && "mask-[repeating-linear-gradient(to_bottom,#000_0_3px,transparent_3px_6px)]"
          )}
        />
        <div ref={dot} className="absolute left-1/2 size-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-brand-green opacity-0 shadow-[0_0_8px_var(--brand-green)]" />
      </div>
      <div className={cn("relative col-start-1 flex items-center gap-2 text-muted-foreground", compact ? "row-start-3" : "row-start-8", "ml-[calc(1rem+13.5ch-3.5px)]")}>
        <span className="size-2 shrink-0 rounded-full border border-brand-periwinkle/70 bg-surface-well" />
        {/* A backing of its own, so the word reads over the pixels behind it */}
        <span className="-ml-1 rounded-sm bg-surface-well/85 px-1">devnet</span>
      </div>

      <div
        ref={log}
        style={{ gridRow: compact ? 4 : 10 }}
        className="relative col-start-1 overflow-hidden px-4 leading-(--lh) whitespace-pre text-muted-foreground"
      >
        Program log:{" "}
        <span ref={word} className="rounded-[2px] text-success">
          Hello, World!
        </span>
      </div>
    </div>
  )
}
