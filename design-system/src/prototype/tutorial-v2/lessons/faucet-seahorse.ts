import { holds, lineOf, straightQuotes, uncomment } from "../check"
import type { State } from "../store"
import { shortKey } from "./common"
import { SYSTEM_CPI, inUse, sentSoFar, signatureOf } from "./records"
import { GENERATED, SEAHORSE_CHECKS } from "./seahorse"
import { initWithoutEmpty, seahorseError } from "./todo-app-seahorse"
import { ATA_PROGRAM, MINT_RENT, TOKEN_ACCOUNT_RENT, tokenCpi } from "./tokens"
import type { Lesson, Rec, RecSend, SpecialCheck, Step, Tx } from "./types"

// Faucet Seahorse: a faucet account at a PDA that owns the Bitcorn mint, so only the faucet's seeds can
// mint it; a drip that pays one Bitcorn per dollar of Bitcoin, read from Pyth's BTC/USD account and
// trusted only after its address is checked; and a limit of one drip every 30 seconds, an `assert` on
// the cluster's clock. After lostin's Faucet Seahorse. The token card, with the price and the limit as
// its strip

/** The program's file: Playground names a Seahorse program after it */
const MAIN = "src/faucet.py"

const PROGRAM_ID = "ndT7Em5RMK5VwbhsyVbPP17oq73DdRdDBF51P9yN582T"
const IDL_ACCOUNT = "Gq4FcToHPdP9uDqR579BqDhjfDFDhf1PB9fmsMw8BvRn"
/** The faucet: the PDA from 'faucet' */
const FAUCET = "J8sWqaBBwM9qK7dTBXhFd5wVFHs1VRfHZwsRh7m3TyLp"
/** The Bitcorn mint: the PDA from 'bitcorn' */
const BITCORN = "Pd5vNeXBRMFMMKFqu1sj1DoBoPdXhwh1hhfy31c9KzQb"
/** The learner's Bitcorn account, at the associated address */
const USER_ACCOUNT = "rTJeaGhMK7hj7XbPZ17q3P5j7M5qMFy9doPKsb7CHhp4"
/** Pyth's BTC/USD price account on devnet, as Seahorse's Pyth list has it */
const PYTH_BTC = "HovQMDrbAgAYPCmHVSrezcSmkMtXSSUsLDFANExrZh2J"
const CREATE_SIGNATURE = signatureOf(701)

/** The faucet's rent: 24 bytes, 1,057,920 lamports */
const FAUCET_RENT = 0.0011
/** Example prices, in cents, one per drip: the cents move, the whole dollars stay */
const PRICES = [6741235, 6741288, 6741207, 6741263, 6741219, 6741274]
const LIMIT_MS = 30_000

const MAINTAINED =
  "Seahorse hasn't had a release since January 2024. It's a good way into Solana if you know Python; for programs you'll ship, Anchor is the standard."

// The program, piece by piece, in the order it sits in faucet.py

const PYTH_IMPORT = "from seahorse.pyth import *"

const boil = (pyth: boolean) => `from seahorse.prelude import *${pyth ? `\n${PYTH_IMPORT}` : ""}

declare_id('11111111111111111111111111111111')`

const FAUCET_CLASS = `class BitcornFaucet(Account):
    bump: u8
    last_drip: i64`

const INIT_FN = `@instruction
def init_faucet(signer: Signer, faucet: Empty[BitcornFaucet], mint: Empty[TokenMint]):
    bump = faucet.bump()
    faucet = faucet.init(
        payer = signer,
        seeds = ['faucet']
    )
    mint.init(
        payer = signer,
        seeds = ['bitcorn'],
        decimals = 0,
        authority = faucet
    )
    faucet.bump = bump`

const SIGNER = "        signer = ['faucet', bump]"
const SEEDS_BROKEN = "        seeds = ['faucet', bump]"
const PRICE_LINE = "    price_feed = bitcoin_price_account.validate_price_feed('devnet-BTC/USD')"
const ASSERT_LINE = "    assert now - faucet.last_drip >= 30, 'Wait 30 seconds between drips'"

/** `mint()` signed by the faucet: with `seeds` (the planned failure), with `signer`, for a set amount or
 * for the price */
const mintCall = (amount: string, broken = false) => `    bump = faucet.bump
    mint.mint(
        authority = faucet,
        to = user_account,
        amount = ${amount},
${broken ? SEEDS_BROKEN : SIGNER}
    )`

/** `drip` as each step leaves it: 1,000 a press (with `seeds`, then `signer`), the price, the clock
 * written in, and the limit */
function dripFn(v: "broken" | "fixed" | "price" | "clock" | "limit") {
  if (v === "broken" || v === "fixed")
    return `@instruction
def drip(faucet: BitcornFaucet, mint: TokenMint, user_account: TokenAccount):
${mintCall("u64(1000)", v === "broken")}`
  const timed = v !== "price"
  return `@instruction
def drip(
    faucet: BitcornFaucet,
    mint: TokenMint,
    user_account: TokenAccount,
    bitcoin_price_account: PriceAccount${timed ? ",\n    clock: Clock" : ""}
):${timed ? "\n    now = clock.unix_timestamp()" : ""}${v === "limit" ? `\n${ASSERT_LINE}` : ""}${timed ? "\n" : ""}
${PRICE_LINE}
    amount = u64(price_feed.get_price().num())
    print(f'BTC is {amount} USD, so you get {amount} Bitcorn')

${mintCall("amount")}${v === "limit" ? "\n    faucet.last_drip = now" : ""}`
}

type Parts = { pyth?: boolean; data?: boolean; init?: boolean; drip?: Parameters<typeof dripFn>[0] }

/** faucet.py with the pieces written so far, each in its place: every write is placed by the file as it
 * stands right after it, since the two instructions repeat `payer = signer,`, `)` and `bump` */
function py(p: Parts) {
  return [boil(!!p.pyth), p.data && FAUCET_CLASS, p.init && INIT_FN, p.drip && dripFn(p.drip)].filter(Boolean).join("\n\n")
}

const S1: Parts = { data: true, init: true, drip: "fixed" }
const S2: Parts = { ...S1, pyth: true, drip: "price" }
const PY_BROKEN = py({ ...S1, drip: "broken" })
const PY_S1 = py(S1)
const PY_S2 = py(S2)
const PY_S3 = py({ ...S2, drip: "limit" })

/** Where the planned failure points: the `mint.mint(` call, and the `seeds` it didn't take */
const MINT_LINE = PY_BROKEN.split("\n").findIndex((l) => l.trim() === "mint.mint(") + 1
const SEEDS_LINE = PY_BROKEN.split("\n").findIndex((l) => l === SEEDS_BROKEN) + 1

const EXPLAIN_ERROR = "`mint()` takes `authority`, `to`, `amount` and one more, and it got a `seeds` it doesn't know. `seeds` belongs to `init`, where an account is created at them. Signing for a PDA is a different job."

/** The Rust a build writes from faucet.py, trimmed to the accounts structs Seahorse makes of your
 * instructions: `Empty[...]` with `.init` becomes Anchor's `init`, and the System and Token programs
 * come in without being asked for */
function rustOf(src: string): string {
  const code = uncomment(straightQuotes(src))
  const has = (fn: string) => new RegExp(`def\\s+${fn}\\s*\\(`).test(code)
  const init = has("init_faucet")
    ? `#[derive(Accounts)]
pub struct InitFaucet<'info> {
    #[account(mut)]
    pub signer: Signer<'info>,
    #[account(init, space = std::mem::size_of::<dot::program::BitcornFaucet>() + 8, payer = signer, seeds = ["faucet".as_bytes().as_ref()], bump)]
    pub faucet: Box<Account<'info, dot::program::BitcornFaucet>>,
    #[account(init, payer = signer, seeds = ["bitcorn".as_bytes().as_ref()], bump, mint::decimals = 0, mint::authority = faucet)]
    pub mint: Box<Account<'info, Mint>>,
    pub rent: Sysvar<'info, Rent>,
    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token>,
}`
    : null
  const drip = has("drip")
    ? `#[derive(Accounts)]
pub struct Drip<'info> {
    #[account(mut)]
    pub faucet: Box<Account<'info, dot::program::BitcornFaucet>>,
    #[account(mut)]
    pub mint: Box<Account<'info, Mint>>,
    #[account(mut)]
    pub user_account: Box<Account<'info, TokenAccount>>,${
      /PriceAccount/.test(code) ? "\n    /// CHECK: checked against Pyth's address in the handler\n    pub bitcoin_price_account: UncheckedAccount<'info>," : ""
    }${/clock\s*:\s*Clock/.test(code) ? "\n    pub clock: Sysvar<'info, Clock>," : ""}
    pub token_program: Program<'info, Token>,
}`
    : null
  return ["// Seahorse wrote this from faucet.py on your last build. Read only: edit faucet.py instead.\n// Trimmed to the accounts structs: the handlers, imports and Seahorse's helper module are left out.", init, drip]
    .filter(Boolean)
    .join("\n\n")
}

/** The mint Seahorse wrote, with the faucet as its authority, for step 2's quote */
const GENERATED_MINT_LINE = rustOf(PY_S1).split("\n").findIndex((l) => l.includes("mint::authority = faucet")) + 1

const UPGRADES = `Upgrades ${shortKey(PROGRAM_ID).replace("…", "…⁠")} in place · from your wallet`

const STEPS: Step[] = [
  {
    id: "faucet",
    title: "Faucet",
    short: "Faucet",
    objective: "Make the faucet: a PDA that owns its token",
    learned: "Signing for a PDA in Seahorse",
    file: MAIN,
    start: "",
    target: PY_S1,
    goal: "build",
    beats: [
      {
        kind: "write",
        id: "s1.boil",
        text: "A Seahorse program is Python in `src/faucet.py`. It opens with the prelude import and the program's id, which Playground fills in. Routine, so I've written them.",
        writes: { file: MAIN, block: boil(false), ref: py({}) },
      },
      {
        kind: "write",
        id: "s1.data",
        text: "The faucet keeps two things in an account: its bump, to sign with later, and when it last dripped. `last_drip` is for step 3, but it goes in now: an account's size is fixed when it's created.",
        writes: { file: MAIN, block: FAUCET_CLASS, ref: py({ data: true }) },
      },
      {
        kind: "write",
        id: "s1.init",
        text: "`init_faucet` creates the faucet and the Bitcorn mint, both `Empty`, as in Todo App Seahorse. The faucet is the mint's authority, so only the faucet can make Bitcorn. You don't list the token program: Seahorse adds it.",
        writes: { file: MAIN, block: INIT_FN, ref: py({ data: true, init: true }) },
      },
      {
        kind: "write",
        id: "s1.drip",
        text: "And `drip`, for now 1,000 Bitcorn a press. The faucet is a PDA, so the program signs `mint()` for it with its seeds: `'faucet'` and the bump.",
        writes: { file: MAIN, block: dripFn("broken"), ref: PY_BROKEN },
      },
      {
        kind: "act",
        id: "s1.build",
        act: "build",
        say: "That's the faucet. Let's compile it.",
        title: "Build faucet.py",
        context: "Seahorse compiles it to Anchor, then Playground builds that",
        button: "Build",
      },
    ],
    planned: "This one's on purpose. It's the slip everyone makes going from creating a PDA to signing with one.",
    plannedShort: `\`mint()\` on line ${MINT_LINE} got a \`seeds\` it doesn't take.`,
    onFail: [
      { kind: "say", id: "f1.explain", text: EXPLAIN_ERROR, quote: { file: MAIN, line: SEEDS_LINE, mark: "seeds", tone: "error" } },
      {
        kind: "ask",
        id: "f1.q",
        kicker: "Fix it",
        question: "So how does the faucet sign `mint()`?",
        options: ["`signer = ['faucet', bump]`: the faucet's seeds, given as its signature", "Drop `seeds`: the program owns the faucet, so it can mint", "Make your wallet the `authority`"],
        code: false,
        answer: 0,
        right: "Exactly. `signer` takes the seeds a PDA signs with: the same `'faucet'` it was created at, plus the bump. Seahorse turns it into Anchor's signed call. I've changed the line.",
        why: [
          null,
          "Owning the faucet's account isn't signing for it. The token program wants the mint authority's signature, and a PDA gives it through its seeds.",
          "Your wallet isn't the mint's authority, the faucet is: `init_faucet` made it so. The token program would refuse.",
        ],
        hint: "The faucet has no key. What do you give in place of a signature?",
        writes: { file: MAIN, block: SIGNER, start: PY_BROKEN },
        key: SIGNER.trim(),
        typed: "That's the line. The faucet signs with its seeds now.",
      },
      {
        kind: "act",
        id: "f1.build",
        act: "build",
        say: "Build again. This time it should pass.",
        title: "Build faucet.py",
        context: "Same build, `signer` instead of `seeds`",
        button: "Build",
      },
    ],
    win: {
      id: "s1.win",
      headline: "Your Python is an Anchor program",
      line: "Seahorse wrote the `init` constraints, added the System and Token programs, and turned `mint()` into a call signed with the faucet's seeds.",
      stats: [
        { icon: "hammer", text: "Built in 1.6 s" },
        { icon: "braces", text: "2 instructions" },
        { icon: "clock", text: "{took}" },
      ],
    },
    explainStep: "This step writes the faucet account, `init_faucet`, which makes it and the Bitcorn mint, and `drip`, which mints signed by the faucet. The first build fails on purpose: a PDA signs a call with `signer`, not `seeds`.",
    chips: [
      {
        label: "Why is the faucet the mint authority?",
        match: /authority/i,
        answer: "So nobody else can make Bitcorn: not you, not the caller. Every Bitcorn comes out of `drip`, under its rules.",
      },
      {
        label: "What does Seahorse add?",
        match: /seahorse add|generated|anchor/i,
        answer: "The accounts Anchor needs and you didn't write: the System Program for `init`, the Token program for the mint, `rent`. The generated tab shows them after the build.",
      },
    ],
    errorChips: [
      {
        label: "seeds or signer?",
        match: /\bseeds?\b|\bsigner\b/i,
        answer: "`seeds` says where a new account is created. `signer` says which PDA signs a call. They're often the same list, used for two jobs.",
      },
      {
        label: "Where is this in the docs?",
        match: /\b(docs?|documentation)\b/i,
        answer: "The Seahorse docs cover it under SPL tokens: `TokenMint.mint(authority, to, amount, signer)`.",
      },
    ],
    answers: [
      { match: /why.*(fail|error)/i, answer: EXPLAIN_ERROR, local: true },
      { match: /maintain|still (alive|used|supported)|deprecated|abandon/i, answer: MAINTAINED },
    ],
  },
  {
    id: "price",
    title: "Price",
    short: "Price",
    objective: "Drip as many Bitcorn as Bitcoin is worth in dollars",
    learned: "Reading a price from an oracle",
    file: MAIN,
    start: PY_S1,
    target: PY_S2,
    goal: "move",
    beats: [
      {
        kind: "say",
        id: "s2.rust",
        text: "Here's the Anchor your last build made of `init_faucet`: `init` with the seeds, the faucet as the mint's authority, and the System and Token programs you never typed.",
        quote: { file: GENERATED, line: GENERATED_MINT_LINE, tone: "lit", generated: true },
      },
      {
        kind: "say",
        id: "s2.oracle",
        text: "A drip should pay one Bitcorn per dollar of Bitcoin's price. A program can't fetch a web page: prices come from Pyth, an oracle that keeps them in accounts on chain. Whoever calls `drip` passes that account in, like any other.",
      },
      {
        kind: "ask",
        id: "s2.q1",
        kicker: "Question",
        n: 1,
        question: "Anyone can pass any account as the price. What stops a fake one?",
        options: ["Nothing needs to: a price account can't be faked", "Pyth signs every transaction that reads a price", "`validate_price_feed('devnet-BTC/USD')` checks the account's address against Pyth's"],
        code: false,
        answer: 2,
        right: "Yes. Seahorse knows Pyth's address for every feed, and the drip stops if the account isn't that one. I've written `drip` around it: the price, rounded down to whole dollars, is the amount.",
        why: [
          "Anyone can create an account with bytes shaped like a price. Only its address tells Pyth's from a copy.",
          "Pyth isn't in your transaction at all. It updates its accounts, and whoever calls you passes one in.",
          null,
        ],
        hint: "What's the one thing about an account that only its creator controls?",
        writes: { file: MAIN, block: dripFn("price"), ref: py({ ...S1, drip: "price" }) },
        key: PRICE_LINE.trim(),
        typed: "That's the line. I've written the rest: the price, in whole dollars, becomes the amount.",
      },
      {
        kind: "write",
        id: "s2.import",
        text: "And `from seahorse.pyth import *` at the top, where `PriceAccount` comes from.",
        writes: { file: MAIN, block: PYTH_IMPORT, ref: PY_S2 },
      },
      {
        kind: "act",
        id: "s2.ship",
        act: "buildDeploy",
        say: "Build and deploy: the faucet goes to devnet.",
        title: "Build and deploy",
        context: "First deploy · about 1.27 devnet SOL from your wallet",
        button: "Build and deploy",
      },
      {
        kind: "act",
        id: "s2.create",
        act: "send",
        ix: "init_faucet",
        say: "Create the faucet. It makes the faucet account and the Bitcorn mint.",
        title: "Create the faucet",
        context: "Calls `init_faucet` · rent from your wallet",
        button: "Create",
        record: "Created the faucet · Bitcorn, supply 0",
      },
      {
        kind: "act",
        id: "s2.account",
        act: "send",
        ix: "create_account",
        say: "Drips land in a token account of yours. Seahorse has no `init_if_needed`, so `drip` can't make it on the first press: Playground opens it from your wallet, as `spl-token create-account` does.",
        title: "Open your Bitcorn account",
        context: "Associated Token Program · rent 0.0020 devnet SOL",
        button: "Open",
        stages: ["Opening your Bitcorn account"],
        record: "Opened your Bitcorn account · 0",
      },
      {
        kind: "act",
        id: "s2.drip",
        act: "move",
        say: "Now drip.",
        title: "Drip",
        context: "Sends `drip`: one Bitcorn for every dollar Bitcoin costs",
        button: "Drip",
        moves: [{ ix: "drip", button: "Drip" }],
        record: "Dripped",
      },
    ],
    win: {
      id: "s2.win",
      headline: "The faucet pays what Bitcoin is worth",
      line: "Pyth's BTC/USD account said {price}, so `drip` minted {amount} Bitcorn into your account. The price came in as an account, checked by its address.",
      stats: [
        { icon: "coins", text: "67,412 Bitcorn" },
        { icon: "zap", text: "BTC/USD from Pyth" },
        { icon: "clock", text: "{took}" },
      ],
      extra: "openTest",
    },
    testWin: "You dripped from the Call panel with Pyth's BTC/USD account. The amount followed the price.",
    explainStep: "This step reads Bitcoin's price from Pyth's BTC/USD account, checked by its address, and mints that many Bitcorn. Then the faucet goes to devnet, you open your Bitcorn account and drip.",
    chips: [
      {
        label: "What if I pass another price?",
        match: /another price|other (feed|price)|fake|sol\/usd/i,
        answer: "Then the check stops the drip: Seahorse's code panics with `Pyth PriceAccount validation failed: expected devnet-BTC/USD`, and nothing is minted.",
      },
      {
        label: "Is this price live?",
        match: /\blive\b|real price|current/i,
        answer: "In this lesson it's an example, like everything here. On devnet, Seahorse reads Pyth's older price accounts, which Pyth replaced with its pull oracle in 2024, so a real drip would read whatever price that account last held.",
      },
      {
        label: "What is num()?",
        match: /num\(\)|exponent|expo/i,
        answer: "Pyth stores the price as a whole number and an exponent: 6,741,235,000,000 and −8 for $67,412.35. `num()` puts them together as a decimal number, and `u64(...)` drops the cents.",
      },
    ],
    answers: [{ match: /maintain|still (alive|used|supported)|deprecated|abandon/i, answer: MAINTAINED }],
  },
  {
    id: "limit",
    title: "Limit",
    short: "Limit",
    objective: "One drip every 30 seconds",
    learned: "Refusing a call with assert",
    file: MAIN,
    start: PY_S2,
    target: PY_S3,
    goal: "move",
    beats: [
      {
        kind: "say",
        id: "s3.why",
        text: "Right now `drip` pays on every press, and the supply grows as fast as anyone can click. A faucet needs a limit: one drip every 30 seconds, by the cluster's clock.",
      },
      {
        kind: "write",
        id: "s3.clock",
        text: "`Clock` is one more parameter: the cluster's clock, the time every validator agrees on. I've added it, and `now` at the top of `drip`.",
        writes: { file: MAIN, block: "    bitcoin_price_account: PriceAccount,\n    clock: Clock\n):\n    now = clock.unix_timestamp()", ref: py({ ...S2, drip: "clock" }) },
      },
      {
        kind: "ask",
        id: "s3.q2",
        kicker: "Question",
        n: 2,
        question: "What should `drip` do when the last drip was less than 30 seconds ago?",
        options: [
          "if now - faucet.last_drip < 30: return",
          "assert now - faucet.last_drip >= 30, 'Wait 30 seconds between drips'",
          "if now - faucet.last_drip < 30: print('Wait 30 seconds between drips')",
        ],
        code: true,
        answer: 1,
        right: "Right. A failed `assert` stops the drip and rolls the whole transaction back, with your message in the log. I've added it, and the line at the end that records the drip's time.",
        why: ['Then the drip "works": the caller pays the fee, gets nothing and can\'t tell why.', null, "That writes a line to the log and drips anyway: `print` doesn't stop anything."],
        hint: "The drip has to stop, and the caller should learn why.",
        writes: { file: MAIN, block: dripFn("limit"), ref: PY_S3 },
        key: ASSERT_LINE.trim(),
        typed: "That's the line. I've added the one that records the time at the end of `drip`.",
      },
      {
        kind: "act",
        id: "s3.ship",
        act: "buildDeploy",
        say: "Build and deploy the limit.",
        title: "Build and deploy",
        context: UPGRADES,
        button: "Build and deploy",
      },
      {
        kind: "act",
        id: "s3.drip",
        act: "move",
        say: "Drip twice in a row.",
        title: "Drip",
        context: "Sends `drip` · the limit is checked first",
        button: "Drip",
        moves: [{ ix: "drip", button: "Drip" }],
        record: "Dripped",
      },
    ],
    win: {
      id: "s3.win",
      headline: "One drip every 30 seconds",
      line: "The second drip came back refused with your message, and nothing was minted. The timer on the card is the client doing the program's math, with no transaction.",
      stats: [
        { icon: "alert", text: "Refused by assert" },
        { icon: "timer", text: "30 s limit" },
        { icon: "clock", text: "{took}" },
      ],
    },
    testWin: "You dripped twice from the Call panel, and the second came back refused with your message.",
    explainStep: "This step adds the cluster's `Clock` to `drip` and an `assert` that refuses a drip less than 30 seconds after the last one. Then you drip twice in a row.",
    chips: [
      {
        label: "Why no error number?",
        match: /number|code/i,
        answer: "Seahorse turns a failed `assert` into a panic: the transaction fails and the message is in the log, but there's no error code like Anchor's 6000. A client reads the log line.",
      },
      {
        label: "Why one clock for everyone?",
        match: /everyone|per wallet|shared/i,
        answer: "`last_drip` lives in the faucet, so the limit is shared: one drip every 30 seconds for all callers. A limit per wallet would keep a small account per wallet, at its own PDA.",
      },
      {
        label: "Can someone fake the time?",
        match: /fake|time/i,
        answer: "No: `Clock` is the cluster's, not the caller's.",
      },
    ],
    answers: [{ match: /maintain|still (alive|used|supported)|deprecated|abandon/i, answer: MAINTAINED }],
  },
]

/** `seeds =` in a `mint()` call: `seeds` belongs to `init`, a PDA signs a call with `signer` */
const seedsInSignedCall: SpecialCheck = (c) => {
  const rows = c.bare.split("\n")
  for (const [i, row] of rows.entries()) {
    const call = row.match(/(\w+)\.mint\(\s*$/)
    if (!call) continue
    const end = rows.findIndex((r, k) => k > i && /^\s*\)/.test(r))
    if (!rows.slice(i + 1, end === -1 ? undefined : end).some((r) => /^\s*seeds\s*=/.test(r))) continue
    const line = i + 1
    const column = row.indexOf(`${call[1]}.mint`) + 1
    return seahorseError(
      c,
      line,
      column,
      `${call[1]}.mint`.length,
      "too many function args.",
      "this function's parameters should look like (authority, to, amount, signer)",
      `\`mint()\` on line ${line} got a \`seeds\` it doesn't take.`,
      EXPLAIN_ERROR,
      true
    )
  }
  return null
}

/** `.init` on an account typed as one that exists: Todo App Seahorse's planned failure, a slip here */
const initNotEmpty: SpecialCheck = (c) => {
  const found = initWithoutEmpty(c)
  return found && !found.ok ? { ...found, planned: false } : found
}

const CHECKS: SpecialCheck[] = [seedsInSignedCall, initNotEmpty, ...SEAHORSE_CHECKS]

// ---- The faucet: what the program does with it, worked out the way it would

const find = (s: State, id: string) => s.records?.find((r) => r.id === id) ?? null
const amountOf = (s: State) => Number(find(s, "mine")?.values.amount ?? 0)

/** Whether the program on devnet reads the price, and whether it keeps the limit */
const priced = (s: State) => s.deployedLib !== null && holds(s.deployedLib, PRICE_LINE)
const limited = (s: State) => s.deployedLib !== null && holds(s.deployedLib, ASSERT_LINE)

const dollars = (cents: number) => `$${(cents / 100).toLocaleString("en-US", { minimumFractionDigits: 2 })}`
const set = (rows: Rec[], id: string, values: Rec["values"]) => rows.map((r) => (r.id === id ? { ...r, values: { ...r.values, ...values } } : r))

/** One send, from a card or the Call panel, answered as devnet would: the faucet is made once, a drip
 * pays the price in whole dollars, and once the limit is on, a drip within 30 seconds of the last one
 * panics on the `assert` */
function send(s: State, ix: string): RecSend | { note: string } {
  const rows = s.records ?? []
  const faucet = find(s, "faucet")
  const mint = find(s, "bitcorn")
  const mine = find(s, "mine")
  const signature = rows.length === 0 ? CREATE_SIGNATURE : signatureOf(sentSoFar(s) + 700)
  if (ix === "init_faucet") {
    if (faucet) return { tx: inUse("init_faucet", FAUCET, signature), records: rows, refused: "Already in use · your faucet stayed as it was" }
    const made: Rec[] = [
      { id: "faucet", kind: "Faucet", pda: FAUCET, values: { last_drip: 0, drips: 0 }, rent: FAUCET_RENT },
      { id: "bitcorn", kind: "Mint", pda: BITCORN, values: { supply: 0 }, rent: MINT_RENT },
    ]
    return { tx: { instruction: "init_faucet", said: "", signature, compute: 18240, inner: [...SYSTEM_CPI, ...SYSTEM_CPI, ...tokenCpi("InitializeMint2")] }, records: made }
  }
  if (ix === "create_account") {
    if (!mint) return { note: "Create the faucet first, with `init_faucet`: it makes the Bitcorn mint." }
    if (mine) return { note: "Your Bitcorn account is already open." }
    const rec: Rec = { id: "mine", kind: "TokenAccount", pda: USER_ACCOUNT, values: { amount: 0 }, rent: TOKEN_ACCOUNT_RENT }
    const log = [`$ spl-token create-account ${BITCORN}`, `Program ${ATA_PROGRAM} invoke [1]`, `Program ${ATA_PROGRAM} success`, `Creating account ${USER_ACCOUNT}`, `Signature: ${signature}`]
    return { tx: { instruction: "create_account", said: "", signature, compute: 21950, inner: tokenCpi("InitializeAccount3") }, records: [...rows, rec], log }
  }
  if (ix === "drip") {
    if (!faucet || !mint) return { note: "Create the faucet first, with `init_faucet`." }
    if (!mine) return { note: "Open your Bitcorn account first: drips land in it." }
    const now = Date.now()
    const last = Number(faucet.values.last_drip)
    if (limited(s) && last > 0 && now - last < LIMIT_MS) {
      const line = lineOf(s.deployedLib ?? "", "assert now - faucet.last_drip")
      const message = "Wait 30 seconds between drips"
      const tx: Tx = { instruction: ix, said: "", signature, compute: 2140, error: { name: "Panic", number: 0, message, line, log: [`Program log: panicked at src/dot/program.rs:88:13: ${message}`], failed: "SBF program panicked" } }
      return { tx, records: rows, refused: `Refused · ${message}` }
    }
    const drips = Number(faucet.values.drips)
    const amount = priced(s) ? Math.floor(PRICES[drips % PRICES.length] / 100) : 1000
    const tx: Tx = { instruction: ix, said: priced(s) ? `BTC is ${amount} USD, so you get ${amount} Bitcorn` : "", signature, compute: limited(s) ? 14830 : 13960, inner: tokenCpi("MintTo") }
    const after = set(set(set(rows, "faucet", { drips: drips + 1, last_drip: limited(s) ? now : 0 }), "bitcorn", { supply: Number(mint.values.supply) + amount }), "mine", { amount: amountOf(s) + amount })
    return { tx, records: after }
  }
  return { note: "That call has no card here." }
}

/** Step 2 passes on a drip that landed, step 3 on a drip the limit refused */
const passes = (_s: State, i: number, ix: string, tx: Tx) => (i === 1 ? ix === "drip" && !tx.error : i === 2 ? ix === "drip" && !!tx.error : false)

/** m:ss, for the time to the next drip */
const clock = (ms: number) => {
  const sec = Math.ceil(ms / 1000)
  return `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, "0")}`
}

export const FAUCET_SEAHORSE: Lesson = {
  card: { slug: "faucet-seahorse", name: "Faucet Seahorse", level: "Intermediate", framework: "Seahorse", ext: "jpg" },
  minutes: 12,
  by: "lostin",
  program: "faucet",
  line: "A token faucet in Python that pays what Bitcoin is worth, once every 30 seconds",
  intro: "You'll write a token faucet in Python: it mints one Bitcorn per dollar of Bitcoin's price, read from the Pyth oracle, and lets each drip through only every 30 seconds.",
  proof: "Program log: BTC is 67412 USD, so you get 67412 Bitcorn",
  badge: "Price oracle",
  headline: "You built a faucet that follows Bitcoin",
  proofLine: (_tx, s) => `Your Bitcorn account on devnet holds ${amountOf(s).toLocaleString("en-US")} Bitcorn: one per dollar of BTC, at most one drip every 30 seconds.`,
  // The end of the Seahorse path: All tutorials is the way on
  nextLine: "You've done every Seahorse tutorial. SPL Token Vault takes the same idea, tokens a PDA controls, into Anchor.",
  steps: STEPS,
  // No client: the original used the Test tab, and every call here goes from a card or the Call panel
  files: { [MAIN]: "", [GENERATED]: "" },
  preview: PY_S3,
  programId: PROGRAM_ID,
  idlAccount: IDL_ACCOUNT,
  txSignature: CREATE_SIGNATURE,
  checks: CHECKS,
  story: false,
  main: MAIN,
  generated: { file: GENERATED, of: rustOf },
  runTx: () => ({ instruction: "init_faucet", said: "", signature: CREATE_SIGNATURE, compute: 18240, inner: SYSTEM_CPI }),
  records: {
    title: "Faucet",
    one: "account",
    empty: "No faucet yet. Create sends `init_faucet`.",
    show: (r) => ({ label: r.kind === "Faucet" ? "Faucet" : r.kind === "Mint" ? "Bitcorn" : "Your Bitcorn account", seeds: "", fields: [] }),
    send: (s, ix) => send(s, ix),
    passes,
    args: () => ({}),
    check: () => null,
    tokens: (rows, now) => {
      const faucet = rows.find((r) => r.id === "faucet")
      const mint = rows.find((r) => r.id === "bitcorn")
      const mine = rows.find((r) => r.id === "mine")
      const last = Number(faucet?.values.last_drip ?? 0)
      const left = now !== null && last > 0 ? LIMIT_MS - (now - last) : null
      const price = PRICES[Number(faucet?.values.drips ?? 0) % PRICES.length]
      return {
        mint: mint ? { name: "Bitcorn", key: BITCORN, supply: Number(mint.values.supply), decimals: 0, authority: "the faucet", metadata: false } : null,
        holders: mine ? [{ id: "mine", label: "Your Bitcorn account", key: USER_ACCOUNT, owner: "yours", amount: Number(mine.values.amount) }] : [],
        strip: faucet
          ? {
              label: "BTC/USD",
              key: PYTH_BTC,
              value: dollars(price),
              note: "Pyth · 2 s ago",
              lines: left === null ? [] : [left > 0 ? `Next drip in ${clock(left)}` : "The next drip can go now"],
            }
          : undefined,
      }
    },
  },
  winVars: (s) => {
    const sent = s.thread.flatMap((t) => (t.kind === "act" ? (t.sends ?? []) : [])).filter((x) => x.ix === "drip" && x.ok)
    const m = sent[0]?.tx.said.match(/you get (\d+)/)
    return { price: dollars(PRICES[0]), amount: m ? Number(m[1]).toLocaleString("en-US") : "67,412" }
  },
}
