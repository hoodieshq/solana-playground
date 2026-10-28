import type { State } from "../store"

// What every lesson is made of. A lesson is one tutorial in the chat flow: its script, its code at
// each step and the few things its program does differently. The store and the screens are shared;
// `data.ts` hands them the lesson that's open

export type Pass = { ok: true; log: string[]; note: string }
/** `column` and `span` mark the token the compiler points at, for the underline under it. Without
 * them the whole line is the one to look at */
export type Fail = { ok: false; log: string[]; line: number; reason: string; column?: number; span?: number }
export type BuildResult = Pass | Fail

/** What a build of hand-written code finds. `planned` marks the lesson's planned failure: the one
 * error the script meets on purpose, which isn't a miss on the learner's first try */
export type OwnCheck = { ok: true } | (Fail & { explain: string; planned?: boolean })

/** A compiler error a lesson knows by name, checked before the generic ones. `bare` is the code
 * without comments, `head` the log's first lines and `failed` the word every reason starts with */
export type SpecialCheck = (c: { code: string; bare: string; target: string; file: string; head: string[]; failed: string }) => OwnCheck | null

/** `match` is the subject the chip answers, for a question typed in other words: "what is an IDL?" */
export type Chip = { label: string; answer: string; follow?: Follow; match?: RegExp }

/** A quiet button that may follow an answer. It only opens or shows something, never runs a build */
export type Follow = "openTest" | "showMenu" | "showFix" | "writeClient" | "nextTutorial"

export type TutorialCard = {
  slug: string
  name: string
  level: "Beginner" | "Intermediate" | "Advanced"
  framework: "Anchor" | "Seahorse" | "Native"
  ext: "jpg" | "png"
}

/** One transaction, as the receipt and the program's log show it. Fee, compute and timing are
 * example values: nothing here runs on devnet */
export type Tx = {
  /** The instruction as the receipt names it: `hello`, `hello(name)`, `chop_tree` */
  instruction: string
  /** The line the program's `msg!` wrote, as it came back in the transaction's logs. Empty when it
   * logs nothing of its own */
  said: string
  signature: string
  compute: number
  /** Lines the runtime adds between the instruction and the program's own line: a call into the
   * System Program, say */
  inner?: string[]
  /** An error the program returned: the transaction failed, and this is why. `log` replaces Anchor's
   * line for an error the runtime raises (out of memory), and `failed` the reason on the last line */
  error?: { name: string; number: number; message: string; line: number; log?: string[]; failed?: string }
}

/** `chop` and `grow` are moves: they call the program again and again from the same card. `send` sends
 * one instruction of a memory lesson from the chat, the one its beat names */
export type Act = "build" | "deploy" | "buildDeploy" | "run" | "call" | "chop" | "grow" | "send"
/** `ref` is the code the block is placed by, when it isn't the step's target: a block the planned
 * failure leaves a line out of, say */
export type Write = { file: string; block: string; ref?: string; start?: string }
/** `code` is the quoted line as it was when quoted, kept for an error so the history shows what was wrong */
export type Quote = { file: string; line: number; mark?: string; tone: "lit" | "error"; code?: string }

/** A question with three options. A right pick writes `writes` into the file, if it has one; a
 * wrong one gets its own reason and the question stays open. The right one sits at a different
 * place in each, so its place gives nothing away */
export type Ask = {
  kind: "ask"
  id: string
  kicker: "Question" | "Fix it"
  /** Its place among the tutorial's questions, about one a step. The fix after the planned failure
   * has none: it's a repair, not one of the four */
  n?: number
  question: string
  options: [string, string, string]
  /** Options are code, shown highlighted, or prose */
  code: boolean
  answer: 0 | 1 | 2
  right: string
  /** Why each option is wrong, by index; null for the right one */
  why: [string | null, string | null, string | null]
  hint: string
  /** The code a right pick or a Skip writes. A question with none (Deploy's) checks a prediction the
   * act that follows then shows */
  writes?: Write
  /** What Skip says, where the default "Here's the line" doesn't fit */
  skipped?: string
  /** The one line that answers it when typed by hand, for Type it myself. A code question's is its
   * right option; a question in words names it here */
  key?: string
  /** What the assistant says when the learner typed the key line, before it fills in the rest */
  typed?: string
}

/** `ix` is the instruction a `send` or a `grow` sends, `init_map` or `grow_big`; `record` what the card
 * says once it's done, before the time it took: "Created your map" */
export type ActBeat = { kind: "act"; id: string; act: Act; say?: string; title: string; context: string; button: string; ix?: string; record?: string }

export type Beat =
  | { kind: "say"; id: string; text: string; quote?: Quote }
  | { kind: "write"; id: string; text: string; writes: Write | { create: string } }
  | Ask
  | ActBeat

/** The step's win: the headline, a line under it and three stat pills. `{took}` in a pill is the
 * step's own time. `extra` is the quiet link beside Next */
export type Win = {
  id: string
  headline: string
  line: string
  stats: { icon: StatIcon; text: string }[]
  extra?: "openTest"
}

export type StatIcon = "hammer" | "braces" | "clock" | "rocket" | "coins" | "cpu" | "timer" | "zap" | "trees" | "alert"

export type Step = {
  id: string
  title: string
  /** The step bar's label: Program, Deploy, Client, Name */
  short: string
  objective: string
  learned: string
  file: string
  start: string
  target: string
  /** The lib.rs or client.ts the step ends with, when it changes the file that isn't its own `file` */
  lib?: string
  client?: string
  beats: Beat[]
  /** What follows the planned failure: the explanation, the fixing question, the second build */
  onFail?: Beat[]
  /** The assistant's line inside the planned failure's card */
  planned?: string
  /** What "I'll fix it myself" says about the planned failure, before the fixing question */
  plannedShort?: string
  /** What passes the step: an act of this kind landing (or a call from the Call panel). A chop
   * step passes on what the chop shows: see the lesson's `chopPasses` */
  goal: Act
  win: Win
  explainStep: string
  chips: Chip[]
  errorChips?: Chip[]
  /** `local` answers only on its own step: it's about that step's moment */
  answers?: { match: RegExp; answer: string; follow?: Follow; local?: boolean }[]
  /** The win's line when the step passed through the Call panel */
  testWin?: string
}

/** The player account Lumberjack's program keeps on devnet, as the client last read it. `last` is
 * `last_login`, in ms: when the energy was last worked out */
export type Player = { wood: number; energy: number; last: number }

/** A memory lesson's accounts on devnet, in bytes: the map, and the zero copy one once it's made.
 * `painted` is where the last paint wrote into the big one, and `text` what it wrote; `board` that the
 * board from step 1 was created, from the Call panel */
export type Memory = { map: number; big: number | null; painted?: number; text?: string; board?: boolean }

/** One press of Grow, as its card lists it: the size after it, and the heap it took */
export type Grow = { ok: boolean; at: number; size: number; heap: number; tx: Tx }

/** One chop, as its card lists it: what came back, and the account after it */
export type Chop = { ok: boolean; at: number; wood: number; energy: number; refilled: number; tx: Tx; wait?: number }

export type Lesson = {
  card: TutorialCard
  minutes: number
  by: string
  /** The crate, as builds, receipts and the Call panel name it */
  program: string
  /** What you'll do, for the gallery and the banner */
  line: string
  /** The intro card's paragraph, before the step list */
  intro: string
  /** The line the intro card promises will come back, set in the terminal's type */
  proof: string
  /** The finish card's badge, headline and the line under it */
  badge: string
  headline: string
  proofLine: (tx: Tx, s: State) => string
  /** The tutorial the finish points to, by slug: the next one of its level. None for the last */
  next?: string
  /** The canned answer to "What should I build next?" */
  nextLine: string
  steps: Step[]
  /** The files the lesson starts with, empty */
  files: Record<string, string>
  /** The finished program, shown read only before Start */
  preview: string
  programId: string
  idlAccount: string
  txSignature: string
  /** Errors the lesson's own code can run into, named the way the compiler names them */
  checks: SpecialCheck[]
  /** Whether "Change what hello says" is offered: Hello Anchor's story */
  story: boolean
  /** What running client.ts sends */
  runTx: (s: State) => Tx
  /** A run worked out by the lesson: what it sends (nothing, when it only reads), what the client
   * prints and the accounts after it */
  run?: (s: State) => { tx: Tx | null; out: string[]; memory: Memory }
  /** What the chat's Call sends, with the name typed in its field. Only lessons with a `call` act */
  callTx?: (s: State, name: string) => Tx
  /** A lesson that's a game keeps a player account on devnet, which `chop` acts on: what one chop
   * does, which chop passes a step, the energy cap and the account's address */
  game?: {
    chop: (s: State) => { player: Player; chop: Chop; tx: Tx }
    chopPasses: (s: State, i: number, c: Chop) => boolean
    max: number
    pda: string
  }
  /** A lesson about memory keeps a map account that `grow` acts on, and which press passes a step */
  memory?: {
    /** One press of Grow on the map, or with `grow_big` on the zero copy one. `args` are what the Call
     * panel was given; without them, the next 10 KB */
    grow: (s: State, ix?: string, args?: Record<string, string>) => { memory: Memory; row: Grow; tx: Tx }
    growPasses: (s: State, i: number, row: Grow) => boolean
    /** A grow card that isn't its step's goal is done once the account is as big as the step needs */
    grownEnough: (s: State, row: Grow) => boolean
    /** What a call of `ix` sends, from the Call panel or a `send` card, or why it isn't sent: the panel
     * shows the note instead. `out` is what the chat's card prints after it: the account's size */
    panel: (s: State, ix: string, args?: Record<string, string>) => { tx: Tx; memory: Memory; out?: string[] } | { note: string }
    /** Whether a call of `ix`, from the panel or a `send` card, passes step `i` */
    panelPasses: (i: number, ix: string) => boolean
    /** The values the panel fills in for `ix`'s arguments, which the learner can change */
    args: (s: State, ix: string) => Record<string, string>
    /** Why what was typed can't be sent, or null: a u32 that isn't a whole number, say */
    check: (given: Record<string, string>) => string | null
    pda: string
    bigPda: string
  }
}
