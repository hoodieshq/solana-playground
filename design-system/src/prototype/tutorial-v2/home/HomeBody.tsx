import { ArrowRight, ArrowUp, Check, CirclePlay } from "lucide-react"
import { useEffect, useLayoutEffect, useRef, useState, type ComponentType } from "react"

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
import { useStore } from "../store"
import { CATALOG, shownName } from "../ui/catalog"
import { FOCUS } from "../ui/type"

/* Home (Almaz, 10 Nov): the page you land on. Three things, in the order a visit needs them: what to
   carry on with, a way to start something new, the path of tutorials. No banner and no picture, which
   Tutorials and Programs have: Home is told from them at a glance, and comes alive in how it arrives */

const H2 = "font-heading text-[1.25rem] leading-[1.5rem] font-medium text-foreground"

/** What leads the page: the first tutorial of the path not finished yet, in the words of its own state */
function useLead() {
  const slug = useFeatured()
  const lesson = LESSONS[slug]
  const p = useProgress(slug)
  const openTutorial = useOpenTutorial()
  const n = lesson.steps.length
  const at = lesson.steps.findIndex((_, i) => !p.passed[i])
  const [, nav] = useNavState()
  const first = nav.account?.session === "in" ? nav.account.primary.split(" ")[0] : null
  const started = p.started && !p.finished
  // Back, once any lesson was opened or the account holds a project: "your first" is said to nobody else
  const lessons = useStartedLessons().length
  const back = lessons > 0 || (Array.isArray(nav.projects) && nav.projects.length > 0)
  return {
    name: lesson.card.name,
    state: p.finished ? ("done" as const) : started ? ("started" as const) : ("fresh" as const),
    title: back ? (first ? `Welcome back, ${first}` : "Welcome back") : "Build your first Solana program",
    steps: n,
    at: at === -1 ? n : at,
    next: at === -1 ? "One more tap to finish" : lesson.steps[at].objective,
    // On a first visit the title already says "your first program", so the line says how, not what again
    sub: back ? `${lesson.line} · ${lesson.minutes} min` : `Write it, deploy it to devnet and call it. About ${lesson.minutes} minutes.`,
    line: lesson.line,
    open: () => openTutorial(slug),
  }
}

/** The lesson's steps as a row of short bars: passed ones lit in one sweep of the brand's light, the one
 * you're on in white, the rest in the border's grey */
function StepTrack({ at, of }: { at: number; of: number }) {
  return (
    <span role="img" aria-label={`Step ${Math.min(of, at + 1)} of ${of}`} className="flex w-full max-w-60 gap-1">
      {Array.from({ length: of }, (_, i) => (
        <span
          key={i}
          className={cn("h-1 flex-1 rounded-full", i === at ? "bg-foreground/55" : i > at && "bg-border-strong")}
          style={i < at ? { background: "linear-gradient(90deg,#9945ff,#14f195)", backgroundSize: `${of * 100}% 100%`, backgroundPosition: `${(i / Math.max(1, of - 1)) * 100}% 0` } : undefined}
        />
      ))}
    </span>
  )
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
    <section ref={box} aria-labelledby="home-title" className={cn(wide ? "pt-12 pb-1" : "pt-3")}>
      <div className="max-w-[34rem] min-w-0">
        <h1 id="home-title" className={cn("font-heading font-normal tracking-[-0.02em] text-balance text-foreground", wide ? "text-[2.5rem] leading-[1.1]" : "text-[1.75rem] leading-[1.15]")}>
          {l.title}
        </h1>
        {l.state === "started" && (
          <>
            <p className="mt-4 text-[0.9375rem] leading-[1.35] text-foreground/78">
              <span className="text-foreground">{l.name}</span>
              {` · Step ${Math.min(l.steps, l.at + 1)} of ${l.steps}`}
              <span className="mt-0.5 block text-muted-foreground">{`Next: ${l.next}`}</span>
            </p>
            <div className="mt-3.5">
              <StepTrack at={l.at} of={l.steps} />
            </div>
          </>
        )}
        {/* One line under the title, not three: the lesson's name is on the button, and its level and steps said
            little a first visit needs (Almaz, 20 Nov). Its time stays, as how long the yes costs */}
        {l.state === "fresh" && <p className="mt-4 max-w-[44ch] text-[0.9375rem] leading-[1.4] text-muted-foreground">{l.sub}</p>}
        {l.state === "done" && (
          <p className="mt-4 flex max-w-[40ch] items-start gap-2 text-[0.9375rem] leading-[1.35] text-foreground/78">
            <span aria-hidden="true" className="mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-full bg-brand-green/15 text-brand-green">
              <Check strokeWidth={2.5} className="size-2.5" />
            </span>
            You finished the path. The next program is your own.
          </p>
        )}
        <div className={cn("mt-6 flex", !wide && "[&>button]:h-12 [&>button]:w-full [html.portrait_&>button]:w-auto [html.portrait_&>button]:min-w-60")}>
          {l.state === "done" ? (
            <BrandButton className={GO} onClick={() => openFirstLight({ entry: "home-tile" })}>
              New project
              <BrandButtonIcon />
            </BrandButton>
          ) : (
            <BrandButton className={GO} onClick={l.open}>
              {l.state === "started" ? "Continue" : `Start ${l.name}`}
              <BrandButtonIcon />
            </BrandButton>
          )}
        </div>
      </div>
    </section>
  )
}

/* The play ring cut from the mark trails the words of the main Start: taken off once, the art director asked for it back (11 Nov) */
const GO = "h-10 font-heading text-[0.9375rem] font-medium tracking-[-0.005em] pointer-coarse:h-11"

/** A way to start, in the box's foot: an icon and its words, no box of its own. A step under the field (13 to its
 * 16), so the field reads first and the ways as the alternatives (Almaz, 20 Nov) */
function Way({ icon: Icon, label, onClick }: { icon: ComponentType<{ className?: string; strokeWidth?: number }>; label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "group/way flex h-8 items-center gap-1.5 rounded-lg px-2 text-[0.8125rem] leading-5 whitespace-nowrap text-muted-foreground transition-colors duration-100 hover:bg-foreground/[0.06] hover:text-foreground motion-reduce:transition-none pointer-coarse:h-11 [html.phone_&]:h-11 [html.touch_&]:h-11",
        FOCUS
      )}
    >
      <Icon aria-hidden="true" strokeWidth={LIT_STROKE} className="size-3.5 shrink-0" />
      {label}
    </button>
  )
}

const PROMPT = "Describe the program you want to build…"
/** The examples the empty field shows, the same three First Light offers under Describe it */
const IDEAS = ["A counter anyone can increment", "A tip jar that splits what it gets", "A yes or no vote, one per wallet"]

/** The empty field's placeholder: one example after another, swapped while nobody is in the field. A
 * placeholder only: it was typed out with a blinking caret, which read as the field writing by itself
 * and made it look like a field nobody could type in (design lead, 20 Nov). Still for less motion */
function useIdea(paused: boolean) {
  const [i, setI] = useState(-1)
  useEffect(() => {
    if (paused || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return
    const t = window.setInterval(() => setI((n) => (n + 1) % IDEAS.length), 3200)
    return () => window.clearInterval(t)
  }, [paused])
  return i < 0 ? PROMPT : `${IDEAS[i]}…`
}

/** Start something new, as one box: tell the assistant what to build, or take one of the ready ways in
 * its foot. The field takes text, as Claude's, ChatGPT's and Gemini's do (design lead, 20 Nov; replaces
 * 4.4, the launcher that took no text): Enter makes an Anchor project and opens it with the words sent
 * to its assistant, Shift+Enter is a new line. With the assistant off or out of messages, Enter opens
 * New project's Describe it with the words in it, where the reason is said */
function StartBox() {
  const { dispatch } = useStore()
  const env = useEnv()
  const [text, setText] = useState("")
  const [focused, setFocused] = useState(false)
  const [sending, setSending] = useState(false)
  const box = useRef<HTMLTextAreaElement>(null)
  const placeholder = useIdea(focused || !!text)
  const send = async () => {
    const t = text.trim()
    if (!t || sending) return
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
    <section aria-labelledby="home-start" className="flex flex-col gap-2.5">
      <h2 id="home-start" className={H2}>
        Start something new
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
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
                e.preventDefault()
                void send()
              }
            }}
            placeholder={placeholder}
            aria-label="Describe the program you want to build"
            enterKeyHint="send"
            className="min-w-0 flex-1 resize-none bg-transparent text-[1rem] leading-6 text-foreground outline-none placeholder:text-muted-foreground disabled:opacity-60"
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
        <h3 className="truncate font-heading text-[1.0625rem] leading-[1.25] font-normal tracking-[-0.015em] text-foreground">
          <button type="button" onClick={() => open(slug)} className={cn("rounded-sm after:absolute after:inset-0 after:rounded-panel after:content-['']", FOCUS)}>
            {name}
          </button>
        </h3>
        <p className={cn("mt-1 flex items-center gap-1.5 text-[0.8125rem] leading-[1.125rem] tabular-nums", p.finished ? "text-foreground" : "text-muted-foreground")}>
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

/** The path: the three tutorials in the order they build on each other, and the door to the rest */
function Path() {
  const { dispatch } = useStore()
  return (
    <section aria-labelledby="home-path" className="flex flex-col gap-2.5">
      <div className="flex min-h-9 items-center justify-between gap-3">
        <h2 id="home-path" className={H2}>
          Learn by building
        </h2>
        <button
          type="button"
          onClick={() => dispatch({ type: "open", screen: "gallery" })}
          className={cn("group/all -mr-2 flex h-9 items-center gap-1 rounded-lg px-2 text-[0.8125rem] whitespace-nowrap text-muted-foreground tabular-nums transition-colors duration-100 hover:text-foreground motion-reduce:transition-none pointer-coarse:h-11", FOCUS)}
        >
          {`All ${CATALOG.length} tutorials`}
          <ArrowRight aria-hidden="true" strokeWidth={1.75} className="size-3.5 transition-transform duration-150 group-hover/all:translate-x-0.5 motion-reduce:transition-none" />
        </button>
      </div>
      <ol className="grid grid-cols-3 gap-3 max-sm:grid-cols-1">
        {LADDER.map((slug) => (
          <PathCard key={slug} slug={slug} />
        ))}
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
