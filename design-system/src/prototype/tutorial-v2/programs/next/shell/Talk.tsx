import { ArrowUpRight, CircleCheck, Code, GraduationCap, Info, LogIn, Pencil, Send } from "lucide-react"

import { CopyButton } from "@/components/ui/copy-button"
import { cn } from "@/lib/utils"

import { Prose } from "../../../ui/Prose"
import { FOCUS, READ, READ_CODE, TITLE } from "../../../ui/type"
import { programBySlug, type ProgramMeta } from "../../data"
import { LANDING_CHIPS } from "../../read"
import { Sep } from "../catalog-parts"
import { ask, ixsOf, openFile, say, setPane, firstIx, type Project, type Turn } from "../../store"
import { soon } from "../../../desktop/Catalog"
import { useOpenTutorial } from "../../../host"
import { useNavState } from "../../../navStates"
import { CHIP_BUTTON, NextRow, Well } from "./parts"
import { Chips, landingOpen } from "./Read"
import { view } from "../../../view"
import { baseName, focusEditor, isLast, mainFile, reveal, saidLines, shortKey } from "./util"

/** Where the code is: beside the Guide on a wide screen, a tap away on a phone and an upright tablet */
const CODE_AT = view === "phone" || view === "portrait" ? "under Code at the top" : "on the right"

type T<K extends Turn["k"]> = Extract<Turn, { k: K }>

const FRAMEWORK: Record<Project["framework"], string> = { anchor: "Anchor", native: "native Rust", seahorse: "Seahorse", "ts-client": "TypeScript" }

/** The first words in the feed: what the project is, where its code is, and what the steps do. A
 * catalog program opens straight here, no preview page before it (Almaz, 6 Nov), so it is met with
 * what the program does, its facts and where it comes from */
export function Intro({ p }: { p: Project }) {
  const file = baseName(mainFile(p))
  const meta = p.slug ? programBySlug(p.slug) : undefined
  if (meta && p.framework !== "ts-client") return <ProgramIntro p={p} meta={meta} file={file} />
  const text =
    p.framework === "ts-client"
      ? `${p.name} is a TypeScript client. Its code is ${CODE_AT}, in \`client.ts\`: it calls the Memo program on devnet and prints what comes back. Run it, then change it and run it again.`
      : p.source === "example" || p.slug
        ? `${p.name} is in your projects. Its code is ${CODE_AT}, starting with \`${file}\`. Three steps take it to a first call on devnet.`
        : `${p.name} is a working ${FRAMEWORK[p.framework]} program to start from. Its code is ${CODE_AT}, in \`${file}\`. Build it first, then make it yours.`
  return (
    <p className={READ}>
      <Prose text={text} {...READ_CODE} />
    </p>
  )
}

/** Read mode's closing line: why it's for reading and where the code is. The stops are the strip's to count */

/** On a phone there's no workspace head, so Solana's devnet id sits in the facts with Copy */
const PHONE = view === "phone" || view === "portrait"

function ProgramIntro({ p, meta, file }: { p: Project; meta: ProgramMeta; file: string }) {
  const read = !!p.read
  return (
    <div className="flex flex-col">
      {/* The program's name and what it does lead, as a lesson's card leads the tutorial's chat */}
      <h2 className={TITLE}>{meta.name}</h2>
      <p className={cn(READ, "mt-2")}>{meta.about}</p>
      {/* The facts as one quiet line, not a boxed grid: the deploy cost is the Deploy card's to say and
          devnet the workspace chip's (the phone, with no head, keeps the id here with Copy) */}
      <p className="mt-3 flex flex-wrap items-center gap-x-1.5 text-[0.8125rem] leading-5 text-muted-foreground tabular-nums">
        <span>{meta.framework === "Native" ? "Native Rust" : meta.framework}</span>
        <Sep />
        <span>{meta.level}</span>
        <Sep />
        <span>{meta.minutes} min</span>
        <Sep />
        {/* "GitHub", not the repo's name: a long name broke the line and left a dot at its end */}
        <a
          href={`https://github.com/${meta.repo}/tree/master/${meta.path}`}
          target="_blank"
          rel="noreferrer"
          title={`${meta.repo}/${meta.path}`}
          aria-label={`Source on GitHub: ${meta.repo}`}
          className={cn("relative inline-flex items-center gap-1 rounded-[4px] text-foreground/80 hover:text-foreground pointer-coarse:after:absolute pointer-coarse:after:-inset-y-3 pointer-coarse:after:inset-x-0 pointer-coarse:after:content-['']", FOCUS)}
        >
          GitHub
          <ArrowUpRight aria-hidden="true" className="size-3.5 shrink-0" />
        </a>
        {read && PHONE && meta.devnetId && (
          <span className="flex items-center gap-1">
            <Sep />
            <code className="font-mono text-foreground/80">{shortKey(meta.devnetId)}</code>
            <CopyButton value={meta.devnetId} label="Copy program id" className="-my-2.5 size-11 shrink-0" />
          </span>
        )}
      </p>
      {/* The needs line is about the first call's setup, which read mode doesn't have. Why a program is
          read only is the head's Read only chip, not a second line here */}
      {!read && meta.needs && (
        <p className="mt-3 flex gap-2 text-[0.875rem] leading-5 font-read text-muted-foreground">
          <Info aria-hidden="true" className="mt-[3px] size-3.5 shrink-0" />
          <span>{meta.needs}</span>
        </p>
      )}
      <p className={cn(READ, "mt-4")}>
        <Prose text={`Its code is ${CODE_AT}, starting with \`${file}\`.`} {...READ_CODE} />
      </p>
      {read && !p.opening && landingOpen(p) && (
        <div className="mt-4">
          <Chips p={p} chips={LANDING_CHIPS} />
        </div>
      )}
    </div>
  )
}

export function User({ t }: { t: T<"user"> }) {
  return <p className="ml-auto w-fit max-w-[85%] rounded-panel bg-surface-raised px-3 py-2 text-[1rem] leading-[1.5rem] break-words">{t.text}</p>
}

export function Assistant({ p, t }: { p: Project; t: T<"assistant"> }) {
  const last = isLast(p, t)
  return (
    <div className="flex flex-col gap-3">
      <p className={READ}>
        <Prose text={t.text} {...READ_CODE} />
      </p>
      {last && !!t.chips?.length && (
        <div className="flex flex-wrap gap-1.5">
          {t.chips.map((c) => (
            <button key={c} type="button" className={CHIP_BUTTON} onClick={() => (c === "Show me the line" ? showFailLine(p, c) : ask(p.id, c))}>
              {c}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

/** "Show me the line": asked in the thread, and the failed line opened and lit in the neutral tint */
function showFailLine(p: Project, c: string) {
  ask(p.id, c)
  const fail = [...p.feed].reverse().find((x): x is T<"build-fail"> => x.k === "build-fail")
  if (!fail?.file || !fail.line) return
  openFile(p.id, fail.file)
  reveal(fail.file, fail.line, { lit: true })
}

/** The first call came back: one card says it, shows what the program logged as the proof, where it
 * lives and the ways on. It was a display size heading and a second "Deployed to devnet" card under it,
 * the deploy said three times (Almaz, 6 Nov) */
/** A starter's first change: the msg! line, and the tutorial of its own framework */
const LEARN: Partial<Record<Project["framework"], { slug: string; label: string }>> = {
  native: { slug: "hello-solana", label: "Learn Native step by step" },
  anchor: { slug: "hello-anchor", label: "Learn Anchor step by step" },
  seahorse: { slug: "hello-seahorse", label: "Learn Seahorse step by step" },
}

export function MilestoneTurn({ p }: { p: Project }) {
  const openTutorial = useOpenTutorial()
  const [, nav] = useNavState()
  const ixs = ixsOf(p)
  const other = ixs.find((i) => i.name !== firstIx(p))
  const call = [...p.feed].reverse().find((x): x is T<"call-ok"> => x.k === "call-ok")
  // A project made from a starter gets one concrete first change, not "change the code": the line its
  // program logs, which comes back changed after an upgrade and a run. Catalog programs keep their rows
  const main = mainFile(p)
  const msgLine = (p.files[main] ?? "").split("\n").findIndex((l) => l.includes("msg!(")) + 1
  const starter = !p.slug && msgLine > 0
  const learn = !p.slug ? LEARN[p.framework] : undefined
  const signedOut = (nav.account?.session ?? "out") === "out"
  return (
    <section aria-label="Program on devnet" className="flex flex-col overflow-hidden rounded-panel border border-border bg-(--card-ground)">
      {/* What happened, with the log as the proof, then the ways on. No program id rows: the workspace chip
          holds the id with Copy, and the deploy's card has Copy id and Explorer */}
      <div className="flex flex-col p-4">
        <div className="flex items-center gap-2.5">
          <CircleCheck aria-hidden="true" className="size-5 shrink-0 text-success" />
          <h3 className="font-heading text-[1.125rem] leading-6 font-medium text-foreground">{p.name} runs on devnet</h3>
        </div>
        {call && <Well lines={saidLines(call.log)} className="mt-3 border border-border bg-surface-panel" />}
      </div>
      <div className="flex flex-col border-t border-border bg-surface-panel p-1.5">
        {starter ? (
          <NextRow
            icon={Pencil}
            label="Make it say your name"
            onClick={() => {
              openFile(p.id, main)
              reveal(main, msgLine, { lit: true })
              focusEditor()
              say(p.id, `Change the words inside \`msg!\` on line ${msgLine} to your name. Then Build and deploy, and run \`client.ts\` again: your words come back from devnet.`)
            }}
          />
        ) : (
          <NextRow
            icon={Code}
            label="Change the code and upgrade"
            onClick={() => {
              openFile(p.id, main)
              focusEditor()
            }}
          />
        )}
        {other && <NextRow icon={Send} label="Call another instruction" onClick={() => setPane(p.id, "call", other.name)} />}
        {learn && <NextRow icon={GraduationCap} label={learn.label} onClick={() => openTutorial(learn.slug)} />}
        {/* Only while the work lives in this browser alone: losing it is a real risk, not an upsell */}
        {signedOut && <NextRow icon={LogIn} label={`Sign in to keep ${p.name}`} onClick={soon} />}
      </div>
    </section>
  )
}
