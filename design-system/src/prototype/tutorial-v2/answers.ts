import { LESSON, STEPS, type Act, type Chip, type Follow } from "./data"

// What the composer understands. The prototype has no model: a word that names the live action
// runs it, a few intents get their own turns, the rest is matched against canned answers. A free
// answer never changes a file or runs anything (spec 7.7)

/** The one action word a message can be, alone or with "please": build, deploy, run, call, send,
 * chop, next, explain. What it does depends on the live card, so the store decides */
export type Word = "build" | "deploy" | "run" | "call" | "send" | "chop" | "grow" | "next" | "explain"

export function actionWord(text: string): Word | null {
  const t = text
    .trim()
    .toLowerCase()
    .replace(/[.!?]+$/, "")
    .replace(/^(please\s+)|(\s+please)$/g, "")
    .trim()
  const words: Word[] = ["build", "deploy", "run", "call", "send", "chop", "grow", "next", "explain"]
  return (words as string[]).includes(t) ? (t as Word) : null
}

/** Which act a word stands for, given the act that's live */
export function wordFits(word: Word, act: Act | null): boolean {
  if (!act) return false
  if (word === "build") return act === "build" || act === "buildDeploy"
  if (word === "deploy") return act === "deploy" || act === "buildDeploy"
  if (word === "run") return act === "run"
  if (word === "call" || word === "send") return act === "call" || act === "send"
  if (word === "chop") return act === "chop"
  if (word === "grow") return act === "grow"
  return false
}

/** Jonas's story: change what hello says */
export const CHANGE_TEXT = /\b(change|make|let)\b.*\b(say|says|text|message|log|story)\b/i
export const CHANGE_CHIP = "Change what hello says"

export const STUCK = "I'm stuck"
export const EXPLAIN_STEP = "Explain this step"
export const NEXT_CHIP = "What should I build next?"

export type Answer = { text: string; follow?: Follow }

/** A question as a chip's label is compared with it: case, punctuation and "what's" aside */
const plain = (t: string) =>
  t
    .toLowerCase()
    .replace(/\bwhat'?s\b/g, "what is")
    .replace(/[^a-z0-9! ]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()

// The phone has no rail, no editor pane and no keyboard shortcuts: the same places are its Code space and sheets
const WHERE = /where.*(menu|nav|files?|terminal|everything)|^(the\s+)?(menu|files?|terminal)\??$/i
const WHERE_DESKTOP: Answer = {
  text: "Everything's still here. The menu is folded into the icons on the left (⌘B). Files open from the arrow next to the file name (⌘E). The terminal is under the editor (⌘J).",
  follow: "showMenu",
}
const WHERE_PHONE: Answer = {
  text: "Everything's still here. Your code is in Code: tap Code at the top right or swipe left. The file name there shows every file, and the strip at the bottom opens what a build or a run printed. The arrow at the top left goes back to the tutorials.",
}

const GLOBAL: { match: RegExp; answer: Answer }[] = [
  // Every lesson deploys an IDL and draws the Call panel from it, so every lesson can say what it is
  {
    match: /\bidl\b/i,
    answer: {
      text: "The IDL is your program's interface, written by the build: its instructions, their arguments and accounts. Clients read it to know how to call you, and the Call panel is built from it.",
      follow: "openTest",
    },
  },
  {
    match: /(create|build|make|start).*(project|app)/i,
    answer: {
      text: "I can't set up a new project from here yet. Finish this one first: you'll know the pieces every project needs. Afterwards, New project in the menu is where to start.",
    },
  },
]

// The prototype has no model behind the composer, so a question past the canned answers is said to
// be the prototype's limit, not the assistant's
export const FALLBACK =
  "That one's past this prototype: in the product, the model behind the assistant answers it. Here, ask about this step, pick a suggestion, or use Hint on the question."
/** The same, with no question open to give a hint */
export const FALLBACK_NO_ASK = "That one's past this prototype: in the product, the model behind the assistant answers it. Here, ask about this step or pick a suggestion."

/** What to build next: the lesson's own pointer to the tutorial after it */
export const nextAnswer = (): Answer => (LESSON.next ? { text: LESSON.nextLine, follow: "nextTutorial" } : { text: LESSON.nextLine })

/** The situation an answer depends on: the step, whether a question or a failure is live, whether
 * the program is deployed yet */
export type Context = { step: number; hint: string | null; writes: boolean; failed: boolean; deployed: boolean; chips: Chip[]; phone: boolean }

/** "I'm stuck": the live question's hint, the way out of a failure, or what the step is about */
export function stuckAnswer(c: Context): Answer {
  if (c.hint) return { text: `${c.hint} Or press Skip and I'll ${c.writes ? "write it" : "tell you"}.` }
  if (c.failed) return { text: "Press Explain the error and I'll walk you through it." }
  return { text: STEPS[c.step].explainStep }
}

/** The canned answer to a question typed or picked, in the order of spec 7.7 after the action words
 * and the change text intent, which the store handles */
export function answerFor(c: Context, text: string): Answer {
  const step = STEPS[c.step]
  const t = text.trim()
  // Follow ups that open the Call panel only make sense once there is one
  const fit = (a: Answer): Answer => (a.follow === "openTest" && !c.deployed ? { text: a.text } : a)
  if (t === STUCK) return stuckAnswer(c)
  if (t === EXPLAIN_STEP) return { text: step.explainStep }
  if (t === NEXT_CHIP) return nextAnswer()
  const chips = [...c.chips, ...STEPS.flatMap((s) => [...s.chips, ...(s.errorChips ?? [])])]
  const chip = chips.find((x) => plain(x.label) === plain(t))
  if (chip) return fit({ text: chip.answer, follow: chip.follow })
  const own = step.answers?.find((a) => a.match.test(t))
  if (own) return fit({ text: own.answer, follow: own.follow })
  if (/(do it|write it).*(for me|yourself)/i.test(t))
    return c.hint ? { text: "Pick an answer and I'll write it, or press Skip and I'll write it straight away." } : { text: step.explainStep }
  if (WHERE.test(t)) return c.phone ? WHERE_PHONE : WHERE_DESKTOP
  const global = GLOBAL.find((g) => g.match.test(t))
  if (global) return fit(global.answer)
  // A question in other words still finds its answer by its subject, this step's first, then the lesson's
  const named = chips.find((x) => x.match?.test(t)) ?? STEPS.flatMap((s) => (s.answers ?? []).filter((a) => !a.local)).find((a) => a.match.test(t))
  if (named) return fit({ text: named.answer, follow: named.follow })
  return { text: c.hint ? FALLBACK : FALLBACK_NO_ASK }
}
