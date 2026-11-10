
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

import { LESSON, NEXT_TUTORIAL, type Follow, type Quote } from "../../data"
import { useOpenTutorial } from "../../host"
import { useStore, type Turn } from "../../store"
import { highlight } from "../CodeView"
import { emit } from "../events"
import { Prose } from "../Prose"
import { Typed } from "../Typed"
import { READ, READ_CODE } from "../type"

type SayTurn = Extract<Turn, { kind: "say" }>

const FOLLOW: Record<Follow, () => string> = {
  openTest: () => "Open Call",
  showMenu: () => "Show me",
  showFix: () => "Show me the fix",
  writeClient: () => "Write it in client.ts",
  nextTutorial: () => (NEXT_TUTORIAL ? `Next: ${NEXT_TUTORIAL.name}` : "All tutorials"),
}

/** Lines the thread shares with the desktop that point at what a phone doesn't have: an editor to fix
 * the code in, a Call panel beside the chat. The thread keeps the desktop's words, so a switch of view
 * reads true either way; the phone says its own */
const PHONE_SAY: Record<string, string> = {
  "Fix it in the editor and build again, or I can show you the lines this step needs.": "Want me to show you the lines this step needs?",
  "Now call it with your name. Here, or in the Call panel, where `name` just showed up.": "Now call it with your name.",
}

/** The file a quote or a card points into, by its name alone: "lib.rs" */
export const baseName = (file: string) => file.split("/").pop() ?? file

/** The quoted line and the ones around it, out-dented by the indent they share */
function aroundLines(file: string, line: number, [before, after]: [number, number]) {
  const all = file.split("\n")
  const rows = all.slice(Math.max(0, line - 1 - before), line + after).map((text, i) => ({ text, here: i === Math.min(before, line - 1) }))
  const cut = Math.min(...rows.filter((r) => r.text.trim()).map((r) => r.text.length - r.text.trimStart().length))
  return rows.map((r) => ({ ...r, text: r.text.slice(cut).trimEnd() }))
}

/** A line of a file quoted in a message: its path and the way to it, the line lit, or red with the
 * token the compiler named under a wavy line. An error quote goes quiet once the step passes, or
 * once the line it quotes has changed */
export function QuoteBox({ quote, quiet = false, phone = false }: { quote: Quote; quiet?: boolean; phone?: boolean }) {
  const { s, dispatch } = useStore()
  // An error quote shows the line as it was then, so the history still says what was wrong after a fix
  const live = (s.files[quote.file] ?? "").split("\n")[quote.line - 1] ?? ""
  const code = quote.code ?? live
  const shown = code.trim()
  const error = quote.tone === "error" && !quiet && code === live
  // The token to underline, inside the trimmed line
  const at = quote.mark ? shown.indexOf(`<${quote.mark}>`) + 1 : -1
  // With lines around it: the file's lines from before to after, out-dented together so they keep
  // their shape, the quoted one on a soft ground and the rest dimmed
  const block = quote.around && !error ? aroundLines(s.files[quote.file] ?? "", quote.line, quote.around) : null
  return (
    <div className="overflow-hidden rounded-control border border-border bg-surface-well">
      {/* On a phone the head is a thumb's height, so Show in is a target and not a 28px strip */}
      <div className={cn("flex h-7 items-center gap-2 border-b border-border px-3 text-[0.75rem]", phone && "h-11 pr-1")}>
        <span className="font-mono text-muted-foreground">
          {quote.file}:{quote.line}
        </span>
        <button
          type="button"
          onClick={() => {
            // A generated file isn't open until asked for: it opens as a tab of its own, read only
            if (quote.generated) dispatch({ type: "openFile", file: quote.file })
            dispatch({ type: "reveal", file: quote.file, lines: [quote.line] })
          }}
          className={cn("ml-auto flex items-center gap-1 text-muted-foreground underline-offset-[3px] hover:text-foreground hover:underline", phone && "h-11 px-2")}
        >
          {/* Words alone, no corner arrow: the listings dropped theirs, and "Show in lib.rs" says it */}
          {quote.generated ? "Show generated Rust" : `Show in ${baseName(quote.file)}`}
        </button>
      </div>
      <div
        className={cn(
          "px-3 py-1.5 font-mono text-[0.75rem] leading-5 break-words whitespace-pre-wrap text-syntax-plain",
          // A bar at the left only on a live error, beside its red ground: on a plain quote it read as a
          // stray thick line (Almaz, 10 Nov)
          error ? "border-l-2 border-error bg-error/10" : quote.tone !== "error" && !block && "bg-(--card-ground)"
        )}
      >
        {block ? (
          block.map((l, i) => (
            <div key={i} className={cn("-mx-3 px-3", l.here ? "bg-foreground/[0.05]" : "opacity-55")}>
              {l.text ? highlight(l.text) : "\u200b"}
            </div>
          ))
        ) : error && at > 0 ? (
          <>
            {highlight(shown.slice(0, at))}
            <span className="underline decoration-error decoration-wavy decoration-1 underline-offset-[3px] [text-decoration-skip-ink:none]">{quote.mark}</span>
            {highlight(shown.slice(at + (quote.mark?.length ?? 0)))}
          </>
        ) : (
          highlight(shown)
        )}
      </div>
    </div>
  )
}

/** The one quiet button an answer may carry. It opens or shows something, so it stays live in a
 * record, except Show me the fix, which writes and so works once */
export function FollowButton({ turn, phone = false }: { turn: SayTurn; phone?: boolean }) {
  const { s, dispatch } = useStore()
  if (!turn.follow) return null
  const f = turn.follow
  if (f === "openTest" && !s.tabs.includes("test")) return null
  // Show me opens the desktop's rail, which a phone doesn't have: an answer given on the desktop and
  // read on a phone keeps its words but not the button
  if (f === "showMenu" && phone) return null
  const openTutorial = useOpenTutorial()
  const done = f === "showFix" && turn.followDone
  const onClick = () => {
    if (f === "openTest") dispatch({ type: "openTest" })
    else if (f === "showMenu") emit("nav:open")
    else if (f === "showFix") dispatch({ type: "showFix", turn: turn.id })
    else if (f === "nextTutorial") openTutorial(LESSON.next ?? "", LESSON.next ? "step" : "gallery")
  }
  return (
    <Button variant="outline" size="sm" className={cn("w-fit", phone && "h-11 px-4 text-[0.9375rem]")} disabled={done} onClick={onClick}>
      {FOLLOW[f]()}
    </Button>
  )
}

/** The assistant speaking: text on the column's ground, no bubble, with at most one rich block.
 * A nudge carries an amber edge, since it says something changed under you */
export function Say({ turn, typing, onTyped, passed, phone = false }: { turn: SayTurn; typing: boolean; onTyped: () => void; passed: boolean; phone?: boolean }) {
  const text = (phone && PHONE_SAY[turn.text]) || turn.text
  return (
    // The text to the code it quotes 9, as Practicum sets a paragraph over its listing
    <div className="flex flex-col gap-[9px]">
      <p className={cn(READ, "max-w-[66ch]", turn.nudge && "border-l-2 border-warning/60 pl-3")}>
        {typing ? <Typed key={turn.id} text={text} code={READ_CODE} onDone={onTyped} /> : <Prose text={text} {...READ_CODE} />}
      </p>
      {turn.quote && <QuoteBox quote={turn.quote} quiet={passed} phone={phone} />}
      {turn.follow && !typing && <FollowButton turn={turn} phone={phone} />}
    </div>
  )
}
