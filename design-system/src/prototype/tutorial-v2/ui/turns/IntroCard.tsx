import { ArrowRight } from "lucide-react"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

import { LESSON, STEPS, thumb } from "../../data"
import { useStore } from "../../store"
import { PixelCover, hasPixelCover } from "../PixelCover"
import { Thumb } from "../Thumb"
import { ACTION, ACTION_FILL, HEADING, READ, TITLE } from "../type"

/** The tutorial's start, as the assistant's first message. In the order other guided lessons use
 * (GitHub Skills, Codelabs, Speedrun Ethereum): what you end with, made concrete by the log line it
 * prints; how a piece goes, since a lesson run as a chat is new to most people; then what it costs.
 * The steps aren't listed again: the step bar above is the one list of them. No icons on sentences,
 * only figures. Once started the header names the tutorial and this card isn't shown */
// The loop is true of the tutorial as a whole, not of every step: Deploy's question writes nothing
const LOOP = ["I explain a piece", "You pick an answer", "I write the code", "You build and run it"]

// Deploys go from the learner's own Playground wallet on devnet, topped up from the faucet: no real money
const COST = "A devnet wallet is set up for you with free test SOL. Your progress stays in this browser"

/* The chat's scale (../type): the title at 24, How it goes at 20, the reading text at 16 (the promise,
   the loop) and one grey note at 13 for everything said on the side. The log line is code, so it's
   mono at the note's size. NOTE is joined as a plain string, never through cn: cn takes
   text-caption and a text colour for the same group and drops the size, which left the notes at 16 */
const NOTE = "text-caption text-muted-foreground"

export function IntroCard({ phone = false }: { phone?: boolean }) {
  const { dispatch } = useStore()

  return (
    // On the phone it's the feed's own text, as the win and the finish are: a frame there cost 32px of a
    // 358px column and broke the log line in two, and its head repeated the screen's header right above.
    // No padding of its own there: the text starts at the feed's 26, where a step's heading starts too
    <section data-live-card aria-labelledby="intro-title" className={phone ? undefined : "rounded-panel border border-border bg-(--card-ground) p-5"}>
      {phone && (
        <h2 id="intro-title" className="sr-only">
          {LESSON.card.name}
        </h2>
      )}
      <div className={cn("flex items-center gap-3", phone && "hidden")}>
        {hasPixelCover(LESSON.card.slug) ? (
          <PixelCover slug={LESSON.card.slug} square className="rounded-lg" />
        ) : (
          <Thumb src={thumb(LESSON.card.slug, LESSON.card.ext)} className="size-10 shrink-0 after:ring-foreground/[0.1]" />
        )}
        <div className="min-w-0">
          <h2 id={phone ? undefined : "intro-title"} className={cn(TITLE, "truncate")}>
            {LESSON.card.name}
          </h2>
          <p className={`${NOTE} truncate`}>
            {LESSON.card.level} · {STEPS.length} steps · {LESSON.minutes} min
          </p>
        </div>
      </div>

      {/* 24 under the head, not the 15 between paragraphs, so the name and its meta read as the card's
          head and not as the first line of the text. Practicum's 40 under a page title is too much in a
          card padded 20 */}
      <p className={cn(READ, !phone && "mt-6")}>{LESSON.intro}</p>
      {/* The end, as the log will print it, so the promise is a thing you'll see, not a claim. One
          tone: the code face is difference enough */}
      <p aria-label="What your program prints at the end" className="mt-[9px] rounded-lg bg-foreground/[0.05] px-3 py-2.5 font-mono text-[0.8125rem] leading-[1.5] text-foreground/90">
        {LESSON.proof}
      </p>

      {/* A heading over the beats, 30 above and 9 under, so it belongs to the list it heads */}
      <h3 className={cn(HEADING, "mt-[30px]")}>How it goes</h3>
      {/* One beat a line, in reading order: two columns broke the longer beats in two */}
      <ol className="mt-[9px] flex flex-col gap-1.5">
        {LOOP.map((beat, i) => (
          <li key={beat} className={cn(READ, "flex items-baseline gap-2.5")}>
            <span className={`${NOTE} w-3 shrink-0 tabular-nums`}>{i + 1}</span>
            {beat}
          </li>
        ))}
      </ol>

      {/* Before Start the editor holds the finished program; Start clears it, which reads as lost
          work unless it's said here first. On the phone the code is only read. 24 above, as after a
          listing: the note is said on the side, so it stands off the list rather than continuing it */}
      <p className={`${NOTE} mt-6`}>
        {/* Kept as three text nodes: one joined string moves the desktop's glyphs by a subpixel */}
        {phone ? "Swipe left for the code as we write it. You read, I type." : "On the right is the finished program. After Start the editor clears and we write it together."}{" "}
        {COST}.
      </p>

      {/* On the phone Start sits at the foot of the screen, under the thumb (screens/StepScreen). On
          the desktop it keeps the same 24 above, so the card's last three blocks share one beat */}
      {!phone && (
        <Button className={cn(ACTION, ACTION_FILL, "mt-6", "px-5")} onClick={() => dispatch({ type: "start" })}>
          Start step 1
          <ArrowRight className="size-4" aria-hidden="true" />
        </Button>
      )}
    </section>
  )
}
