import { holds } from "../check"
import type { State } from "../store"
import { LIB, shortKey } from "./common"
import { SYSTEM_CPI, inUse, initWithoutSpace, noSystemProgram, payerNotMut, sentSoFar, signatureOf } from "./records"
import type { Lesson, Rec, RecSend, Step, Tx } from "./types"

// Counter PDA Tutorial: one counter account per wallet, at a PDA made from "counter" and the wallet's
// key. Step 1 sizes the account (the planned failure: `init` without `space`), step 2 creates it and
// meets the PDA when devnet refuses a second one, step 3 counts with `mut`. After cleon's Counter PDA
// tutorial. It draws the records card the Data family shares, in its simplest case: one account, one field

const PROGRAM_ID = "MASi45ub7Qe4ZE36UT5G6cU4ud8Fhhe4deS4F3cw9KTA"
const IDL_ACCOUNT = "5jGqVfMz8Kcq3BkNhXpJYb2uTdW7eRaL4sHxCnPmQoFv"
/** The counter's address: the PDA from "counter" and the learner's wallet */
export const COUNTER_PDA = "b8dLcukC7edhDQ7cn5d4gEYkbUrMWeWQLGsCmrG6dLaY"
const CREATE_SIGNATURE = "4CnTRPK9wCmhpuK8iXzNuhMDqAWp2gkTkpp6Q2Xn5tZ3BvsZ8fBbsGdBEqWTqf2JXQuzz2nW1iuRw9JUVPJuo3bt"

/** The counter's rent: 16 bytes, 1,002,240 lamports */
const RENT = 0.001

// The program, piece by piece, in the order it sits in lib.rs

const BOIL = `use anchor_lang::prelude::*;

declare_id!("11111111111111111111111111111111");`

const CREATE_FN = `    pub fn create_counter(_ctx: Context<CreateCounter>) -> Result<()> {
        msg!("Counter created at 0");
        Ok(())
    }`

const INCREMENT_FN = `    pub fn increment(ctx: Context<Increment>) -> Result<()> {
        let counter = &mut ctx.accounts.counter;
        counter.count += 1;
        msg!("Count is {}", counter.count);
        Ok(())
    }`

const SPACE = `        space = 8 + Counter::INIT_SPACE,`

const createAccounts = (space: boolean) => `#[derive(Accounts)]
pub struct CreateCounter<'info> {
    #[account(
        init,
        payer = authority,${space ? `\n${SPACE}` : ""}
        seeds = [b"counter", authority.key().as_ref()],
        bump,
    )]
    pub counter: Account<'info, Counter>,
    #[account(mut)]
    pub authority: Signer<'info>,
    pub system_program: Program<'info, System>,
}`

const INCREMENT_ACCOUNTS = `#[derive(Accounts)]
pub struct Increment<'info> {
    #[account(
        mut,
        seeds = [b"counter", authority.key().as_ref()],
        bump,
    )]
    pub counter: Account<'info, Counter>,
    pub authority: Signer<'info>,
}`

const COUNTER = `#[account]
#[derive(InitSpace)]
pub struct Counter {
    pub count: u64,
}`

type Parts = { module?: boolean; inc?: boolean; create?: "broken" | "fixed"; incAccounts?: boolean; data?: boolean }

/** lib.rs with the pieces written so far, each in its place. Every write is placed by the file as it
 * stands right after it, so the pieces still to come never pull their lines in: both accounts structs
 * repeat `bump,`, `)]` and the seeds */
function lib(p: Parts) {
  const fns = [CREATE_FN, ...(p.inc ? [INCREMENT_FN] : [])]
  const module = `#[program]\nmod counter {\n    use super::*;\n\n${fns.join("\n\n")}\n}`
  return [BOIL, p.module && module, p.create && createAccounts(p.create === "fixed"), p.incAccounts && INCREMENT_ACCOUNTS, p.data && COUNTER].filter(Boolean).join("\n\n")
}

const S1 = { module: true, create: "fixed", data: true } as const
const LIB_BROKEN = lib({ ...S1, create: "broken" })
const LIB_S1 = lib(S1)
const LIB_S3 = lib({ ...S1, inc: true, incAccounts: true })

/** The line of `init,` in the first build, which the planned failure points at */
const INIT_LINE = LIB_BROKEN.split("\n").findIndex((l) => l.trim() === "init,") + 1

const EXPLAIN_ERROR = `\`init\` on line ${INIT_LINE} creates the counter's account. An account is a fixed number of bytes, and you pay rent for every one of them, so Anchor won't guess the number. \`init\` needs a \`space\`.`

const UPGRADES = `Upgrades ${shortKey(PROGRAM_ID).replace("…", "…⁠")} in place · from your wallet`

const PDA_CHIP = {
  label: "What is a PDA?",
  match: /\bpdas?\b|program derived/i,
  answer:
    "A Program Derived Address: an address made from seeds and the program id instead of a key pair. Nobody holds a private key for it, so only your program can sign for it, and anyone can find it again from the same seeds.",
}

const STEPS: Step[] = [
  {
    id: "account",
    title: "Counter account",
    short: "Account",
    objective: "Describe the counter and what creating it takes",
    learned: "An account holds a program's data, sized in bytes you pay rent for",
    file: LIB,
    start: "",
    target: LIB_S1,
    goal: "build",
    beats: [
      {
        kind: "write",
        id: "s1.boil",
        text: "Same opening as Hello Anchor: the import and the program's id. They're routine, so I've written them.",
        writes: { file: LIB, block: BOIL, ref: lib({}) },
      },
      {
        kind: "write",
        id: "s1.data",
        text: "A program forgets everything between calls, so the count has to live in an account. This is its shape: one number. `#[account]` makes it account data, and `InitSpace` counts the bytes its fields take.",
        writes: { file: LIB, block: COUNTER, ref: lib({ data: true }) },
      },
      {
        kind: "write",
        id: "s1.accounts",
        text: '`CreateCounter` lists what creating a counter takes. `init` makes the account, your wallet pays for it, and `seeds` set its address: the word `"counter"` and your wallet\'s key. More on that address in step 2.',
        writes: { file: LIB, block: createAccounts(false), ref: lib({ create: "broken", data: true }) },
      },
      {
        kind: "write",
        id: "s1.fn",
        text: "And `create_counter` itself. `init` does the work before it runs, so all it does is log a line.",
        writes: { file: LIB, block: `#[program]\nmod counter {\n    use super::*;\n\n${CREATE_FN}\n}`, ref: LIB_BROKEN },
      },
      {
        kind: "act",
        id: "s1.build",
        act: "build",
        say: "That's a whole program. Let's compile it.",
        title: "Build lib.rs",
        context: "Compiles lib.rs on Playground's build server",
        button: "Build",
      },
    ],
    planned: "This one's on purpose. Everyone who creates their first account meets it, so let's meet it now.",
    plannedShort: `\`init\` on line ${INIT_LINE} creates an account, and nothing says how big it is.`,
    onFail: [
      { kind: "say", id: "f1.explain", text: EXPLAIN_ERROR, quote: { file: LIB, line: INIT_LINE, mark: "init", tone: "error" } },
      {
        kind: "ask",
        id: "f1.q",
        kicker: "Fix it",
        question: "So how much space does the counter need?",
        options: ["space = 100,", "space = Counter::INIT_SPACE,", "space = 8 + Counter::INIT_SPACE,"],
        code: true,
        answer: 2,
        right: "Right. 8 bytes for the discriminator, Anchor's tag for the account's type, and 8 for `count`: 16 bytes. I've put it under `payer`.",
        why: [
          "Big enough, but you'd pay rent for 84 bytes nobody uses, on every counter. The original tutorial did this.",
          "Close. That's the 8 bytes of `count`, but every Anchor account starts with an 8 byte tag too, and the account would be too small to write.",
          null,
        ],
        hint: "Count what goes into the account: Anchor's own 8 byte tag first, then your fields.",
        writes: { file: LIB, block: SPACE, ref: LIB_S1 },
        key: "space = 8 + Counter::INIT_SPACE,",
        typed: "That's the line: the tag plus your fields, 16 bytes.",
      },
      {
        kind: "act",
        id: "f1.build",
        act: "build",
        say: "Build again. This time it should pass.",
        title: "Build lib.rs",
        context: "Same build, now with `space`",
        button: "Build",
      },
    ],
    win: {
      id: "s1.win",
      headline: "Your program can make counters",
      line: "The build wrote the IDL: one instruction, `create_counter`, and an account of 16 bytes.",
      stats: [
        { icon: "hammer", text: "Built in 1.6 s" },
        { icon: "braces", text: "16 bytes" },
        { icon: "clock", text: "{took}" },
      ],
    },
    explainStep:
      "This step writes the counter's account and `create_counter`, which creates it. I write the pieces and explain them. The first build fails on purpose, on the size every new account needs, and you pick it.",
    chips: [
      {
        label: "What is a discriminator?",
        match: /\bdiscriminator\b/i,
        answer: "Anchor puts 8 bytes in front of every account it creates: a tag made from the account's type name. Reading an account, it checks the tag first, so a `Counter` can't be read as something else.",
      },
      {
        label: "What is rent?",
        match: /\brent\b/i,
        answer: "Every account holds a deposit of SOL for the bytes it takes, about 0.0010 SOL for these 16. It isn't spent: close the account and it comes back.",
      },
    ],
    errorChips: [
      {
        label: "Why can't Anchor guess the size?",
        match: /\bguess\b|\bsize\b/i,
        answer: "It could for `Counter`, but not for a `String` or a list, which can grow. So `init` always asks, and `InitSpace` does the counting.",
      },
      {
        label: "Where is this in the docs?",
        match: /\b(docs?|documentation)\b/i,
        answer: "The Anchor docs cover it in [Account Constraints](https://www.anchor-lang.com/docs/references/account-constraints), under `init` and `space`.",
      },
    ],
    answers: [{ match: /why.*(fail|error)/i, answer: EXPLAIN_ERROR, local: true }],
  },
  {
    id: "create",
    title: "Create at a PDA",
    short: "Create",
    objective: "Deploy, and create your counter at an address made from seeds",
    learned: "An account's address as a PDA: one counter per wallet, found again from its seeds",
    file: LIB,
    start: LIB_S1,
    target: LIB_S1,
    goal: "send",
    beats: [
      {
        kind: "act",
        id: "s2.deploy",
        act: "deploy",
        say: "Your program is built, but devnet doesn't have it yet. Deploy it.",
        title: "Deploy to devnet",
        context: "From your Playground wallet · free devnet SOL",
        button: "Deploy",
      },
      {
        kind: "say",
        id: "s2.pda",
        text: 'Your counter\'s address comes from its seeds: `"counter"` and your wallet\'s key, run through the program id. That\'s a PDA, a Program Derived Address. Nobody writes it down: anyone with the seeds finds it again.',
      },
      {
        kind: "ask",
        id: "s2.q1",
        kicker: "Question",
        n: 1,
        question: "Press Create a second time. What does devnet do?",
        options: ["Makes a second counter next to the first", "Refuses: that address is already in use", "Resets your counter to 0"],
        code: false,
        answer: 1,
        right: "Right. Same seeds, same address, and `init` can't create what's already there. One counter per wallet, with no list to check. Let's see it.",
        why: ['A second counter needs a second address, and the seeds give the same one: `"counter"` and your key.', null, "`init` only creates. It never writes over an account that exists."],
        hint: "The seeds don't change between presses. Where would a second counter go?",
        skipped: "No problem. The seeds give the same address every time, so devnet will refuse the second one. Let's see it.",
      },
      {
        kind: "act",
        id: "s2.create",
        act: "send",
        ix: "create_counter",
        say: "Create yours.",
        title: "Create your counter",
        context: "Sends `create_counter` · about 0.0010 SOL of rent",
        button: "Create",
        record: "Created your counter",
      },
      {
        kind: "act",
        id: "s2.again",
        act: "send",
        ix: "create_counter",
        say: "Now press it again.",
        title: "Create it again",
        context: "Same seeds, same address",
        button: "Create",
        record: "Tried to create it again",
      },
    ],
    win: {
      id: "s2.win",
      headline: "One counter per wallet, at its PDA",
      line: `Your counter is at \`${shortKey(COUNTER_PDA)}\`, made from \`"counter"\` and your key. The second create was refused: that address is taken.`,
      stats: [
        { icon: "rocket", text: "Live on devnet" },
        { icon: "coins", text: "Rent 0.0010 SOL" },
        { icon: "alert", text: "Already in use" },
      ],
      extra: "openTest",
    },
    testWin: "You created your counter from the Call panel, then tried again and devnet refused: the address is taken.",
    explainStep: "This step puts the program on devnet and creates your counter at its PDA. Then it creates it again, and devnet refuses: the same seeds give the same address.",
    chips: [
      PDA_CHIP,
      {
        label: "How does a client find it?",
        match: /\b(find|client)\b/i,
        answer:
          'From the same seeds: `PublicKey.findProgramAddressSync([Buffer.from("counter"), wallet.toBuffer()], programId)`. Anchor\'s client reads the seeds from the IDL, so the Call panel fills the address in for you.',
      },
      {
        label: "Does a failed call cost?",
        match: /\b(fee|fees|cost)\b/i,
        answer: "The fee, 0.000005 SOL. Nothing else: a failed transaction changes nothing.",
      },
    ],
  },
  {
    id: "increment",
    title: "Increment",
    short: "Increment",
    objective: "Change the counter on devnet and read it back",
    learned: "Changing an account with mut, for anyone to read on devnet",
    file: LIB,
    start: LIB_S1,
    target: LIB_S3,
    goal: "move",
    beats: [
      {
        kind: "say",
        id: "s3.why",
        text: "Now the counter has to count. `increment` adds one to `count`, at the same address, from the same seeds. The account is already there, so this time nothing is created.",
      },
      {
        kind: "ask",
        id: "s3.q2",
        kicker: "Question",
        n: 2,
        question: "What does `Increment` need so the new count is saved?",
        options: ["mut,", "init,", "payer = authority,"],
        code: true,
        answer: 0,
        right: "Yes. `mut` passes the account as writable and has Anchor save it when `increment` returns. I've written `Increment` around it, with the same seeds.",
        why: [null, "`init` creates the account, and yours exists: the call would fail the way your second Create did.", "A payer pays rent for a new account. Nothing is created here, so there's nothing to pay."],
        hint: "The account exists. What tells Anchor it's going to change?",
        writes: { file: LIB, block: INCREMENT_ACCOUNTS, ref: lib({ ...S1, incAccounts: true }) },
        key: "mut,",
        typed: "That's it. I've written the rest of `Increment` around it.",
      },
      {
        kind: "write",
        id: "s3.fn",
        text: "And `increment`: one line that adds, one that logs. Only your wallet can call it on your counter, because your key is in the seeds.",
        writes: { file: LIB, block: INCREMENT_FN, ref: LIB_S3 },
      },
      {
        kind: "act",
        id: "s3.ship",
        act: "buildDeploy",
        say: "Devnet still runs the program without `increment`. Build and deploy: it keeps its address, and your counter keeps its 0.",
        title: "Build and deploy",
        context: UPGRADES,
        button: "Build and deploy",
      },
      {
        kind: "act",
        id: "s3.inc",
        act: "move",
        say: "Now count.",
        title: "Increment your counter",
        context: "Sends `increment` · fee from your wallet",
        button: "Increment",
        moves: [{ ix: "increment", button: "Increment" }],
        until: { label: "Increment 10 times", times: 10 },
        record: "Counted",
      },
    ],
    win: {
      id: "s3.win",
      headline: "Your counter counts on devnet",
      line: "Each press was a transaction that changed your account, and the card read it back. Nothing else holds the number.",
      stats: [
        { icon: "zap", text: "Count 1" },
        { icon: "cpu", text: "2,914 CU" },
        { icon: "clock", text: "{took}" },
      ],
    },
    testWin: "You sent `increment` from the Call panel, and the count on devnet went up.",
    explainStep: "This step adds `increment`, marked `mut` so the new count is saved, then counts on devnet from the card.",
    chips: [
      {
        label: "What if I leave out mut?",
        match: /\bmut\b/i,
        answer: "The call would go through and the count would stay 0: Anchor only saves accounts marked `mut`. Your change would be thrown away when `increment` returns.",
      },
      {
        label: "Can someone else increment mine?",
        match: /\b(someone|else|other|another)\b/i,
        answer: "They'd sign with their own key, and their key in the seeds gives their counter's address, not yours. Yours only moves when your wallet signs.",
      },
    ],
  },
]

// The planned failure, `init` without `space`, then the two slips a first account struct meets
const CHECKS = [initWithoutSpace(EXPLAIN_ERROR), noSystemProgram, payerNotMut]

// ---- The counter: what the program does with it, worked out the way it would

const counterOf = (s: State) => s.records?.find((r) => r.id === "counter") ?? null

/** Whether the program on devnet has `increment` yet */
const counts = (s: State) => s.deployedLib !== null && holds(s.deployedLib, "pub fn increment(ctx: Context<Increment>) -> Result<()> {")

/** One send, from a card or the Call panel. A second `create_counter` is sent, not stopped: the
 * refusal from devnet is what step 2 is about */
function send(s: State, ix: string): RecSend | { note: string } {
  const counter = counterOf(s)
  const signature = signatureOf(sentSoFar(s) + 3)
  const records = s.records ?? []
  if (ix === "create_counter") {
    if (counter) return { tx: inUse("create_counter", COUNTER_PDA, signature), records, refused: "Already in use · your counter stayed as it was" }
    const created: Rec = { id: "counter", kind: "Counter", pda: COUNTER_PDA, values: { count: 0 }, rent: RENT }
    const tx: Tx = { instruction: "create_counter", said: "Counter created at 0", signature: records.length ? signature : CREATE_SIGNATURE, compute: 6820, inner: SYSTEM_CPI }
    return { tx, records: [...records, created] }
  }
  if (ix === "increment") {
    if (!counter) return { note: "Create your counter first, with `create_counter`." }
    if (!counts(s)) return { note: "Devnet still runs the program without `increment`. Build and deploy it first." }
    const count = Number(counter.values.count) + 1
    const tx: Tx = { instruction: "increment", said: `Count is ${count}`, signature, compute: 2914 }
    return { tx, records: records.map((r) => (r.id === "counter" ? { ...r, values: { ...r.values, count } } : r)) }
  }
  return { note: "That call has no card here." }
}

/** Step 2 passes on the refused second create, step 3 on the first increment that lands */
const passes = (_s: State, i: number, ix: string, tx: Tx) => (i === 1 ? ix === "create_counter" && !!tx.error : i === 2 ? ix === "increment" && !tx.error : false)

export const COUNTER_PDA_TUTORIAL: Lesson = {
  card: { slug: "counter-pda-tutorial", name: "Counter PDA Tutorial", level: "Beginner", framework: "Anchor", ext: "jpg" },
  minutes: 8,
  by: "cleon",
  program: "counter",
  line: "Keep a counter on chain at an address made from your wallet",
  intro: "You'll keep a number on chain: a counter account at an address worked out from your wallet, created once, then counted up from the chat.",
  proof: "Program log: Count is 1",
  badge: "Counter on chain",
  headline: "You keep a number on chain",
  proofLine: (_tx, s) => `Your counter is at \`${shortKey(COUNTER_PDA)}\` with a count of ${counterOf(s)?.values.count ?? 0}, and only your wallet can move it.`,
  // The next Beginner one in Anchor: the same init, seeds and mut on an account every player shares
  next: "tiny-adventure",
  nextLine: "Tiny Adventure is a good next one: one account every player shares, moved by instructions and drawn as a game.",
  steps: STEPS,
  // No client.ts: every call goes from the card, or the Call panel
  files: { [LIB]: "" },
  preview: LIB_S3,
  programId: PROGRAM_ID,
  idlAccount: IDL_ACCOUNT,
  txSignature: CREATE_SIGNATURE,
  checks: CHECKS,
  story: false,
  runTx: () => ({ instruction: "create_counter", said: "Counter created at 0", signature: CREATE_SIGNATURE, compute: 6820, inner: SYSTEM_CPI }),
  records: {
    title: "Counter",
    one: "counter",
    empty: "No accounts yet. Create sends `create_counter`.",
    show: (r) => ({ label: "Counter", seeds: '"counter" · your wallet', fields: [["count", String(r.values.count)]] }),
    send: (s, ix) => send(s, ix),
    passes,
    args: () => ({}),
    check: () => null,
  },
}
