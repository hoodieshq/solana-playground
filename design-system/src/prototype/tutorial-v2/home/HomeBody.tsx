import { ArrowRight, ArrowUp, Check, CirclePlay } from "lucide-react"
import { useEffect, useLayoutEffect, useRef, useState, type ComponentType } from "react"
import { toast } from "sonner"

import { BrandButton, BrandButtonIcon } from "@/components/ui/brand-button"
import { Spinner } from "@/components/ui/spinner"
import { cn } from "@/lib/utils"

import { LIT_ICONS, LIT_STROKE } from "../desktop/navLit/icons"
import { LimitNotice } from "../desktop/navLit/LimitNotice"
import { TutorialThumb } from "../desktop/TutorialList"
import { LADDER, useFeatured, useOpenTutorial, useProgress, useStartedLessons } from "../host"
import { LESSONS } from "../lessons"
import { useNavState } from "../navStates"
import { describeUnavailable, useEnv } from "../newProject/next/model"
import { describeCreate, expressCreate, openFirstLight } from "../newProject/next/open"
import { GitHubMark } from "../newProject/next/SourceRail"
import { YourPrograms } from "../programs/next/YourPrograms"
import { soleAsk } from "../programs/store"
import { setCatShown } from "../settings/store"
import { useStore } from "../store"
import { CATALOG, shownName } from "../ui/catalog"
import { FOCUS } from "../ui/type"

/* Home (Almaz, 10 Nov): the page you land on. Three things, in the order a visit needs them: what to
   carry on with, a way to start something new, the path of tutorials. No banner and no picture, which
   Tutorials and Programs have: Home is told from them at a glance, and comes alive in how it arrives */

// The levels by size, every heading at the headline weight 400 (the team's weights: 320, 380, 400, 440):
// the page 36 (40 until 25 Nov), a section 17, a card's name 15, its meta 13. At 20/500 a section stood heavier than the
// page's title and a step from the cards' 17 (Almaz, 20 Nov)
const H2 = "font-heading text-20 leading-6 font-headline text-foreground"

/** What leads the page: the first tutorial of the path not finished yet, in the words of its own state */
function useLead() {
  const slug = useFeatured()
  const lesson = LESSONS[slug]
  const p = useProgress(slug)
  const openTutorial = useOpenTutorial()
  const at = lesson.steps.findIndex((_, i) => !p.passed[i])
  const [, nav] = useNavState()
  const first = nav.account?.session === "in" ? nav.account.primary.split(" ")[0] : null
  const started = p.started && !p.finished
  // Back, once any lesson was opened or the account holds a project: "your first" is said to nobody else
  const lessons = useStartedLessons().length
  const back = lessons > 0 || (Array.isArray(nav.projects) && nav.projects.length > 0)
  return {
    entry: CATALOG.find((c) => c.slug === slug),
    name: lesson.card.name,
    state: p.finished ? ("done" as const) : started ? ("started" as const) : ("fresh" as const),
    title: back ? (first ? `Welcome back, ${first}` : "Welcome back") : "Build your first Solana program",
    next: at === -1 ? "One more tap to finish" : lesson.steps[at].objective,
    // On a first visit the title already says "your first program", so the line says how, not what again
    sub: back ? `${lesson.line} · ${lesson.minutes} min` : `Write it, deploy it to devnet and call it. About ${lesson.minutes} minutes.`,
    line: lesson.line,
    open: () => openTutorial(slug),
  }
}

/** The top of the page: the greeting, what to carry on with and its one brand button. Words alone: the
 * mark's sculpture stood beside them and only got in their way (Almaz, 10 Nov) */
function Hero({ phone }: { phone: boolean }) {
  const l = useLead()
  const box = useRef<HTMLElement>(null)
  const [wide, setWide] = useState(!phone)
  useEffect(() => {
    const el = box.current
    if (!el) return
    const ro = new ResizeObserver(([e]) => setWide(e.contentRect.width >= 640))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  return (
    <section ref={box} aria-labelledby="home-title" className={cn(wide ? "pt-12 pb-6" : "pt-3 pb-4")}>
      {/* The words keep a reading width; the card under them runs the page's, as the cards below do */}
      <div className={cn("min-w-0", l.state !== "started" && "max-w-[34rem]")}>
        <h1 id="home-title" className={cn("font-heading font-normal tracking-tight text-balance text-foreground", wide ? "text-36 leading-10" : "text-28 leading-8")}>
          {l.title}
        </h1>
        {/* Back to what you were doing, as one card: what it is and what comes next, with the button in it.
            No progress here: that's the lesson's own bar; this only has to get you back in (Almaz, 25 Nov) */}
        {l.state === "started" && (
          <div className={cn("mt-6 flex gap-3.5 rounded-panel border border-border bg-surface-panel p-3", wide ? "items-center pr-3.5" : "flex-col")}>
            <div className="flex min-w-0 flex-1 items-center gap-3.5">
              {l.entry && <TutorialThumb t={l.entry} />}
              <div className="min-w-0 flex-1">
                <p className="truncate font-heading text-16 leading-5 font-normal tracking-tight text-foreground">{l.name}</p>
                <p className="mt-1 text-13 leading-5 text-muted-foreground">{`Next: ${l.next}`}</p>
              </div>
            </div>
            <BrandButton className={cn(GO, "shrink-0", !wide && "h-12 w-full")} onClick={l.open}>
              Continue
              <BrandButtonIcon />
            </BrandButton>
          </div>
        )}
        {/* One line under the title, not three: the lesson's name is on the button, and its level and steps said
            little a first visit needs (Almaz, 20 Nov). Its time stays, as how long the yes costs */}
        {l.state === "fresh" && <p className="mt-4 max-w-[44ch] text-16 leading-6 text-muted-foreground">{l.sub}</p>}
        {l.state === "done" && (
          <p className="mt-4 flex max-w-[40ch] items-start gap-2 text-16 leading-5 text-foreground/78">
            <span aria-hidden="true" className="mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-full bg-brand-green/15 text-brand-green">
              <Check strokeWidth={2.5} className="size-2.5" />
            </span>
            You finished the path. The next program is your own.
          </p>
        )}
        {l.state !== "started" && (
          <div className={cn("mt-6 flex", !wide && "[&>button]:h-12 [&>button]:w-full [html.portrait_&>button]:w-auto [html.portrait_&>button]:min-w-60")}>
            {l.state === "done" ? (
              <BrandButton className={GO} onClick={() => openFirstLight({ entry: "home-tile" })}>
                New project
                <BrandButtonIcon />
              </BrandButton>
            ) : (
              <BrandButton className={GO} onClick={l.open}>
                {`Start ${l.name}`}
                <BrandButtonIcon />
              </BrandButton>
            )}
          </div>
        )}
      </div>
    </section>
  )
}

/* The play ring cut from the mark trails the words of the main Start: taken off once, the art director asked for it back (11 Nov) */
const GO = "h-10 font-heading text-16 font-act tracking-normal pointer-coarse:h-11"

/** A way to start, in the box's foot: an icon and its words, no box of its own. A step under the field (13 to its
 * 16), so the field reads first and the ways as the alternatives (Almaz, 20 Nov) */
function Way({ icon: Icon, label, onClick }: { icon: ComponentType<{ className?: string; strokeWidth?: number }>; label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "group/way flex h-8 items-center gap-1.5 rounded-lg px-2 text-13 leading-5 whitespace-nowrap text-muted-foreground transition-colors duration-100 hover:bg-foreground/[0.06] hover:text-foreground motion-reduce:transition-none pointer-coarse:h-11 [html.phone_&]:h-11 [html.touch_&]:h-11",
        FOCUS
      )}
    >
      <Icon aria-hidden="true" strokeWidth={LIT_STROKE} className="size-3.5 shrink-0" />
      {label}
    </button>
  )
}

/** The field's hint, one line that stays: examples swapped every few seconds still read as the field
 * writing by itself (design lead, 20 Nov) */
const PROMPT = "Describe the program you want to build…"

/** Build your own, as one box: tell the assistant what to build, or take one of the ready ways in
 * its foot. The field takes text, as Claude's, ChatGPT's and Gemini's do (design lead, 20 Nov; replaces
 * 4.4, the launcher that took no text): Enter makes an Anchor project and opens it with the words sent
 * to its assistant, Shift+Enter is a new line. With the assistant off or out of messages, Enter opens
 * New project's Describe it with the words in it, where the reason is said */
function StartBox() {
  const { dispatch } = useStore()
  const env = useEnv()
  const [text, setText] = useState("")
  const [sending, setSending] = useState(false)
  const box = useRef<HTMLTextAreaElement>(null)
  const send = async () => {
    const t = text.trim()
    if (!t || sending) return
    // "Hide the cat" is a word to the assistant, not a program to build: no project comes of it
    const sole = soleAsk(t.toLowerCase())
    if (sole !== null) {
      setCatShown(sole)
      setText("")
      return void toast(sole ? "Sole is back. It sits on the assistant's field in an empty chat." : "Sole is hidden. Search or Settings bring it back.")
    }
    if (describeUnavailable(env)) return openFirstLight({ entry: "home-tile", source: "describe", text: t })
    setSending(true)
    await describeCreate(t, env)
  }
  // One line until the words need more, up to five, then it scrolls
  useLayoutEffect(() => {
    const el = box.current
    if (!el) return
    el.style.height = "auto"
    el.style.height = `${Math.min(el.scrollHeight, 5 * 24 + 2)}px`
  }, [text])
  return (
    // 16 from a 20px heading to what it heads; "Start something new" under "Start Hello Anchor" was an echo
    <section aria-labelledby="home-start" className="flex flex-col gap-4">
      <h2 id="home-start" className={H2}>
        Build your own
      </h2>
      <div className="overflow-hidden rounded-panel border border-border bg-surface-raised/60 transition-colors duration-150 focus-within:border-border-strong hover:border-border-strong motion-reduce:transition-none">
        <form
          onSubmit={(e) => {
            e.preventDefault()
            void send()
          }}
          onClick={() => box.current?.focus()}
          className="flex min-h-16 w-full cursor-text items-center gap-3 py-3 pr-3 pl-[1.125rem]"
        >
          <textarea
            ref={box}
            rows={1}
            value={text}
            disabled={sending}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
                e.preventDefault()
                void send()
              }
            }}
            placeholder={PROMPT}
            aria-label="Describe the program you want to build"
            enterKeyHint="send"
            className="min-w-0 flex-1 resize-none bg-transparent text-16 leading-6 text-foreground outline-none placeholder:text-muted-foreground disabled:opacity-60"
          />
          <button
            type="submit"
            disabled={!text.trim() || sending}
            aria-label="Create the project and ask the assistant"
            className={cn(
              "flex size-8 shrink-0 items-center justify-center self-end rounded-full transition-colors duration-100 motion-reduce:transition-none pointer-coarse:size-11",
              FOCUS,
              text.trim() ? "bg-foreground text-background hover:bg-foreground/85" : "bg-foreground/[0.08] text-subtle"
            )}
          >
            {sending ? <Spinner className="size-4" /> : <ArrowUp strokeWidth={LIT_STROKE} className="size-4" />}
          </button>
        </form>
        {/* The card's grey foot, as every Oak card sets its actions. Two columns under a thumb */}
        <div className="flex flex-wrap gap-x-1 gap-y-0.5 border-t border-border bg-surface-panel px-2 py-1.5 max-sm:flex-col max-sm:flex-nowrap max-sm:px-1.5">
          <Way icon={CirclePlay} label="Run the Anchor starter" onClick={expressCreate} />
          <Way icon={LIT_ICONS.new} label="New project" onClick={() => openFirstLight({ entry: "home-tile" })} />
          <Way icon={LIT_ICONS.programs} label="Open a program" onClick={() => dispatch({ type: "open", screen: "programs" })} />
          <Way icon={GitHubMark} label="Import from GitHub" onClick={() => openFirstLight({ entry: "home-tile", source: "import" })} />
        </div>
      </div>
      <LimitNotice className="px-1" />
    </section>
  )
}

/** One tutorial of the path: the cover, the name, and where it stands. No 01, 02, 03 in the corner: the
 * row's own order says it, and a number promised an order nobody has to keep (Almaz, 11 Nov) */
function PathCard({ slug }: { slug: string }) {
  const open = useOpenTutorial()
  const p = useProgress(slug)
  const lesson = LESSONS[slug]
  const t = CATALOG.find((c) => c.slug === slug)
  if (!lesson || !t) return null
  const of = lesson.steps.length
  const done = p.passed.filter(Boolean).length
  const started = p.started && !p.finished
  const name = shownName(t)
  return (
    <li className="group/card relative flex min-w-0 flex-col gap-3 rounded-panel border border-border bg-surface-panel p-4 transition-colors duration-100 hover:bg-[color-mix(in_srgb,var(--foreground)_4%,var(--surface-panel))] motion-reduce:transition-none max-sm:flex-row max-sm:items-center">
      <TutorialThumb t={t} />
      <div className="min-w-0 flex-1">
        <h3 className="truncate font-heading text-16 leading-5 font-headline tracking-normal text-foreground">
          <button type="button" onClick={() => open(slug)} className={cn("rounded-sm after:absolute after:inset-0 after:rounded-panel after:content-['']", FOCUS)}>
            {name}
          </button>
        </h3>
        <p className={cn("mt-1 flex items-center gap-1.5 text-13 leading-5 tabular-nums", p.finished ? "text-foreground" : "text-muted-foreground")}>
          {p.finished ? (
            <>
              <span aria-hidden="true" className="size-1.5 rounded-full bg-brand-green" />
              Done
            </>
          ) : started ? (
            `Step ${Math.min(of, done + 1)} of ${of}`
          ) : (
            `${of} steps · ${lesson.minutes} min`
          )}
        </p>
      </div>
    </li>
  )
}

/** The rest of the catalog, as the row's last card where the hero's lesson stepped out: its words alone,
 * on the neighbours' fill (Almaz, 20 Nov: three covers in a heap looked worse than none) */
function AllCard() {
  const { dispatch } = useStore()
  return (
    <li className="group/card relative flex min-w-0 flex-col justify-end gap-3 rounded-panel border border-border bg-surface-panel p-4 transition-colors duration-100 hover:bg-[color-mix(in_srgb,var(--foreground)_4%,var(--surface-panel))] motion-reduce:transition-none max-sm:flex-row max-sm:items-center max-sm:justify-start">
      <h3 className="font-heading text-16 leading-5 font-headline tracking-normal text-foreground">
        <button type="button" onClick={() => dispatch({ type: "open", screen: "gallery" })} className={cn("flex items-center gap-1 rounded-sm after:absolute after:inset-0 after:rounded-panel after:content-['']", FOCUS)}>
          {`All ${CATALOG.length} tutorials`}
          <ArrowRight aria-hidden="true" strokeWidth={1.75} className="size-3.5 text-muted-foreground transition-transform duration-150 group-hover/card:translate-x-0.5 motion-reduce:transition-none" />
        </button>
      </h3>
    </li>
  )
}

/** The path: the tutorials in the order they build on each other, and the door to the rest. The one the
 * hero already offers isn't a card too (Almaz, 20 Nov: Hello Anchor stood on screen twice, as one
 * action): its place goes to the catalog. Once the path is finished the hero offers nothing, so all
 * three show, marked Done */
function Path() {
  const { dispatch } = useStore()
  const featured = useFeatured()
  const finished = useProgress(featured).finished
  const slugs = finished ? LADDER : LADDER.filter((s) => s !== featured)
  const short = slugs.length < LADDER.length
  return (
    <section aria-labelledby="home-path" className="flex flex-col gap-4">
      <div className="flex min-h-6 items-center justify-between gap-3">
        <h2 id="home-path" className={H2}>
          Tutorials
        </h2>
        {!short && <button
          type="button"
          onClick={() => dispatch({ type: "open", screen: "gallery" })}
          // In the heading's own size and colour, as Your projects' Show all (Almaz, 25 Nov)
          className={cn("group/all -my-1.5 -mr-2 flex h-9 items-center gap-1.5 rounded-lg px-2 font-heading text-20 leading-6 font-headline whitespace-nowrap text-foreground tabular-nums transition-opacity duration-100 hover:opacity-75 motion-reduce:transition-none pointer-coarse:h-11", FOCUS)}
        >
          {`All ${CATALOG.length} tutorials`}
          <ArrowRight aria-hidden="true" strokeWidth={1.75} className="size-5 transition-transform duration-150 group-hover/all:translate-x-0.5 motion-reduce:transition-none" />
        </button>}
      </div>
      <ol className="grid grid-cols-3 gap-3 max-sm:grid-cols-1">
        {slugs.map((slug) => (
          <PathCard key={slug} slug={slug} />
        ))}
        {short && <AllCard />}
      </ol>
    </section>
  )
}

/** Home under its frame, the same on every size; `phone` gives the hero a thumb's button */
export function HomeBody({ phone = false }: { phone?: boolean }) {
  return (
    <div className="flex w-full flex-col gap-10 max-sm:gap-8">
      {/* The blocks arrive one after another, top to bottom, a breath apart */}
      {[<Hero key="hero" phone={phone} />, <StartBox key="start" />, <Path key="path" />, <YourPrograms key="yours" />].map((block, i) => (
        <div key={block.key} style={{ animationDelay: `${i * 80}ms` }} className="fill-mode-both duration-500 ease-[cubic-bezier(0.2,0,0,1)] animate-in fade-in slide-in-from-bottom-3 motion-reduce:animate-none empty:hidden">
          {block}
        </div>
      ))}
    </div>
  )
}
