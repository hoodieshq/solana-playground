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
  /** The instruction data as it travels, in hex with its length, for a lesson that sends raw bytes:
   * `41 6c 65 78 · 4 bytes` */
  data?: string
  /** The whole log of a transaction that never reaches the lesson's program: a System Program transfer
   * from your wallet to another (Tic-tac-toe's Add Player O) */
  log?: string[]
}

/** `chop` and `grow` are moves: they call the program again and again from the same card. `send` sends
 * one instruction of a memory lesson from the chat, the one its beat names */
export type Act = "build" | "deploy" | "buildDeploy" | "run" | "call" | "chop" | "grow" | "send" | "move"
/** `ref` is the code the block is placed by, when it isn't the step's target: a block the planned
 * failure leaves a line out of, say */
export type Write = { file: string; block: string; ref?: string; start?: string }
/** `code` is the quoted line as it was when quoted, kept for an error so the history shows what was wrong.
 * `generated` quotes the lesson's generated file, which opens read only rather than shows in the editor */
export type Quote = {
  file: string
  line: number
  mark?: string
  tone: "lit" | "error"
  code?: string
  generated?: boolean
  /** Lines shown dimmed before and after the quoted one, so a line that is part of a call or a block
   * shows what it belongs to */
  around?: [number, number]
}

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
export type ActBeat = {
  kind: "act"
  id: string
  act: Act
  say?: string
  title: string
  context: string
  button: string
  ix?: string
  record?: string
  /** What a `move` card offers: its buttons, each sending an instruction from the same card again and
   * again (Increment, Add expense, Deposit and Withdraw), and the row buttons (Edit, Delete) */
  moves?: Move[]
  /** "Until" beside the card's first move, offered once it was made by hand */
  until?: Until
  /** Values typed on a `send` card before it sends (the holder's name) */
  fields?: MoveField[]
  /** A `send` card's stages instead of "Sending ix to devnet", for a wallet act that isn't the program's
   * (Create your token): "Funding your wallet" goes first while the wallet is empty */
  stages?: string[]
  /** A `send` card signed by a key that isn't the learner's: its refusal is the answer, so the script goes on */
  signer?: "stranger"
}

/** One button of a `move` card. `row` names the kind of record it sits on, as a row button, and the
 * record is its target (Edit, Delete, Mark done); without it, it's the card's own (Add expense).
 * `fields` are typed beside it, or in the row once its button opens them; `signer` sends it signed by
 * a key that isn't the learner's. `{name}` in the button is the argument's default: "Add #{id}" */
export type Move = { ix: string; button: string; fields?: MoveField[]; row?: string; signer?: "stranger" }

/** A value typed on a card. `dollars` shows dollars and sends cents; `tokens` shows whole tokens and
 * sends base units, with the mint's `decimals`; `max` is in bytes, for text; `required` keeps the button
 * off while it's empty, otherwise an empty field sends the lesson's default */
export type MoveField = { name: string; label: string; kind: "text" | "number" | "dollars" | "tokens"; decimals?: number; placeholder?: string; max?: number; required?: boolean }

/** The card's first move made again and again: `times` more sends, or until one is refused (`stop`),
 * or until the step passes (`"passed"`: the boss falls, the game is won). Lumberjack's "Chop until out
 * of energy" and Zero Copy's "Grow until out of memory" are the same idea, kept in their own cards */
export type Until = { label: string; times?: number; stop?: "refused" | "passed" }

export type Beat =
  | { kind: "say"; id: string; text: string; quote?: Quote }
  | { kind: "write"; id: string; text: string; writes: Write | { create: string } }
  | Ask
  | ActBeat

/** The step's win: the headline, a line under it and three stat pills. `{took}` in a pill is the
 * step's own time. `extra` is the quiet link beside Next */
export type Win = {
  id: string
  /** A heading, so no period at the end */
  headline: string
  line: string
  stats: { icon: StatIcon; text: string }[]
  extra?: "openTest"
}

export type StatIcon = "hammer" | "braces" | "clock" | "rocket" | "coins" | "cpu" | "timer" | "zap" | "trees" | "alert" | "heart" | "flame"

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

/** The game card's screens: Tiny Adventure's tiles, Two's tiles with the chest, the boss, the board */
export type GameView = "world" | "chest" | "boss" | "board"

/** One account a records lesson keeps on devnet, as the client last read it: its type (`kind`), its
 * address, its fields as the program stores them (cents, ids, flags) and its rent, in SOL */
export type Rec = { id: string; kind: string; pda: string; values: Record<string, string | number | boolean>; rent: number }

/** The accounts around one send, for a card that draws them: before and after it, what a refusal
 * means in words, and `read` for a client that only read them back */
export type RecSnap = { before: Rec[]; after: Rec[]; refused?: string; read?: boolean }

/** One send of a `move` card, as the card lists it: what came back, and the accounts after it */
export type Sent = { ok: boolean; at: number; ix: string; tx: Tx; snap: RecSnap; via?: "test" }

/** What a send of a records lesson does: the transaction, the accounts after it (as they were, on a
 * refusal), `refused` in words for the card, and `out` what the chat's card prints after the logs */
export type RecSend = { tx: Tx; records: Rec[]; refused?: string; out?: string[]; log?: string[] }

/** A token lesson's accounts as the token card draws them (the Tokens family): the mint, the token
 * accounts that hold it, and a strip above them for the lesson's own account (Battle Coins' player,
 * Faucet Seahorse's price and limit). Amounts are base units; `authority` reads "the program", "your
 * wallet" or "the faucet"; `metadata` is whether Token Metadata names the mint */
export type TokenView = {
  mint: { name: string; symbol?: string; key: string; supply: number; decimals: number; authority: string; metadata: boolean } | null
  holders: { id: string; label: string; key: string; owner: string; amount: number }[]
  strip?: { label: string; key: string; meter?: { value: number; max: number }; lines: string[] }
}

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
  /** A heading, so no period at the end */
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
  /** The program's own file, when it isn't `src/lib.rs`: a Seahorse lesson's `src/hello.py` */
  main?: string
  /** A file the build writes and the learner only reads: the Rust a Seahorse build makes of the Python.
   * `of` works it out from the main file as built; it opens beside it, read only */
  generated?: { file: string; of: (main: string) => string }
  /** A program whose build writes no IDL (Native). The build says `line` instead of the IDL's, and the
   * Call panel has one raw form: the program id, no accounts, data as text. `ix` is the function every
   * call lands in, as receipts name it; `reads` whether the program as deployed reads the data, so a
   * send with data passes the step that teaches it */
  raw?: { ix: string; line: (lib: string) => string; reads: (lib: string) => boolean }
  /** What running client.ts sends */
  runTx: (s: State) => Tx
  /** A run worked out by the lesson: what it sends (nothing, when it only reads), what the client
   * prints and the accounts after it */
  run?: (s: State) => { tx: Tx | null; out: string[]; memory?: Memory; records?: Rec[] }
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
  /** A lesson that keeps records (the Data family): accounts at PDAs, drawn as the records card and
   * changed by `send` and `move` cards and the Call panel. See lessons/README.md, "Records" */
  records?: {
    /** The card's head: the program's word for its accounts, "Counter", "Expenses" */
    title: string
    /** One of them, for "Read 3 expenses": "expense" */
    one: string
    /** What the card says before there is any: "No accounts yet. Create sends `create_counter`." */
    empty: string
    /** How a row reads: its label, its seeds in words, its fields as name and value in order. `line`
     * sets it on one line with its values only, its seeds shown when it's opened (a list's rows) */
    show: (r: Rec) => { label: string; seeds: string; fields: [string, string][]; line?: boolean }
    /** What one send of `ix` does, from a card or the Call panel: `args` as typed (else `args` below),
     * `row` the record a row button acts on, `signer` a key that isn't the learner's. Or a note why it
     * isn't sent, which the panel and the row button show instead */
    send: (s: State, ix: string, args?: Record<string, string>, row?: string, signer?: "stranger") => RecSend | { note: string }
    /** Whether a send that came back passes step `i`. `s` is the state after it */
    passes: (s: State, i: number, ix: string, tx: Tx) => boolean
    /** The values a card and the Call panel start `ix`'s arguments at */
    args: (s: State, ix: string, row?: string) => Record<string, string>
    /** Why what was typed can't be encoded, or null: an amount that isn't a whole number */
    check: (ix: string, given: Record<string, string>) => string | null
    /** A value the client works out between transactions, as a muted line under the row (Bank
     * Simulator's interest), or null. The card ticks once a second while one shows */
    live?: (s: State, r: Rec, now: number) => string | null
    /** A token lesson draws its records as the token card instead (the Tokens family). `now` is the
     * time on a live card, which ticks once a second, and null on a record */
    tokens?: (rows: Rec[], now: number | null) => TokenView
    /** A game draws its records as the game card in this view instead (the Games family): see
     * `games.ts` for the ids it reads */
    view?: GameView
    /** The wallets a call can be signed with, by the value of its `signer` argument: the Call panel
     * shows them as a Signer field, and the game card as its switch (Tic-tac-toe's X and O) */
    signers?: { value: string; label: string }[]
    /** How a send reads on its move card, when the program's log line isn't enough: "→ tile 2" */
    sentLine?: (s: State, x: Sent) => string | null
  }
  /** Values for `{name}` in a win's line, from the lesson's state: Expense Tracker's `{n}` */
  winVars?: (s: State) => Record<string, string>
}
