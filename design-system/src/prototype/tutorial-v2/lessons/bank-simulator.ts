import { holds, lineOf } from "../check"
import type { State } from "../store"
import { LIB, shortKey } from "./common"
import { SYSTEM_CPI, bytes, clockWithoutTry, dollars, inUse, isU64, landed, noSystemProgram, payerNotMut, sentSoFar, signatureOf, stringWithoutMaxLen, tooLong } from "./records"
import type { Lesson, Rec, RecSend, Step, Tx } from "./types"

// Bank Simulator: a bank account at a PDA from "bank" and the holder's key, money as whole cents, a
// withdrawal the program refuses by name, and interest worked out from the cluster's clock whenever the
// account is touched. After Bolt / Syed Aabis Akhtar's Bank Simulator, whose Clockwork thread no longer
// runs (Clockwork shut down in 2023): its interest is the nearest live idea, as Lumberjack's energy is.
// The records card with one row, and the interest so far as a line the client works out every second

const PROGRAM_ID = "PM6oQ2NcWVn2RNagKZ58sFy76HJ3zrCJq9uUwkuHSAbZ"
const IDL_ACCOUNT = "Hq4ZmV8sXcT2nRkLp7WbJdG5yFuE9aNoKt3iBvQh6Mzr"
/** The account's address: the PDA from "bank" and the learner's wallet */
export const BANK_PDA = "dYmM6J4tmCUz5J2h6tH6fwF5Hx8W1NcTJg93anG8BH4C"
const OPEN_SIGNATURE = "2pXvGt8KcWm4ZbRqLs7NdHy3JfTu9AeBk5oPiMw6VxQz1CnDrFgSh8YtUaE4LjK2mWb7RcXvNq3PsTd9GyHf5BzA"

/** The account's rent: 60 bytes, 1,308,480 lamports */
const RENT = 0.0013
/** What `open_account` puts in: $100, in cents */
const FIRST_DEPOSIT = 10000
/** 5% a minute, in basis points, as the program's constant */
const BPS_PER_MINUTE = 500

// The program, piece by piece, in the order it sits in lib.rs

const BOIL = `use anchor_lang::prelude::*;

declare_id!("11111111111111111111111111111111");`

const OPEN_FN = `    pub fn open_account(ctx: Context<OpenAccount>, holder_name: String, deposit: u64) -> Result<()> {
        let account = &mut ctx.accounts.bank_account;
        account.holder_name = holder_name;
        account.balance = deposit;
        account.last_update = Clock::get()?.unix_timestamp;
        msg!("Opened for {} with {} cents", account.holder_name, account.balance);
        Ok(())
    }`

const WIRE = `        add_interest(account)?;`

const depositFn = (wired: boolean) => `    pub fn deposit(ctx: Context<UpdateBalance>, amount: u64) -> Result<()> {
        let account = &mut ctx.accounts.bank_account;${wired ? `\n${WIRE}` : ""}
        account.balance += amount;
        msg!("Deposited {} cents. Balance: {}", amount, account.balance);
        Ok(())
    }`

const GUARD = `        require!(amount <= account.balance, BankError::InsufficientFunds);`

const withdrawFn = (wired: boolean) => `    pub fn withdraw(ctx: Context<UpdateBalance>, amount: u64) -> Result<()> {
        let account = &mut ctx.accounts.bank_account;${wired ? `\n${WIRE}` : ""}
${GUARD}
        account.balance -= amount;
        msg!("Withdrew {} cents. Balance: {}", amount, account.balance);
        Ok(())
    }`

/** The constant sits right over the function that uses it, so the two are written as one block */
const ADD_INTEREST = `/// 5% a minute, in basis points: fast, so you can watch it grow
const INTEREST_BPS_PER_MINUTE: u128 = 500;

fn add_interest(account: &mut BankAccount) -> Result<()> {
    let now = Clock::get()?.unix_timestamp;
    let seconds = (now - account.last_update).max(0) as u128;
    let interest = (account.balance as u128 * INTEREST_BPS_PER_MINUTE * seconds / (10_000 * 60)) as u64;
    account.balance += interest;
    account.last_update = now;
    msg!("Interest: {} cents for {} s", interest, seconds);
    Ok(())
}`

const OPEN_ACCOUNTS = `#[derive(Accounts)]
pub struct OpenAccount<'info> {
    #[account(
        init,
        payer = holder,
        space = 8 + BankAccount::INIT_SPACE,
        seeds = [b"bank", holder.key().as_ref()],
        bump,
    )]
    pub bank_account: Account<'info, BankAccount>,
    #[account(mut)]
    pub holder: Signer<'info>,
    pub system_program: Program<'info, System>,
}`

const MAX_LEN = `    #[max_len(32)]`

const bankAccount = (maxLen: boolean) => `#[account]
#[derive(InitSpace)]
pub struct BankAccount {${maxLen ? `\n${MAX_LEN}` : ""}
    pub holder_name: String,
    pub balance: u64,
    pub last_update: i64,
}`

const UPDATE = `#[derive(Accounts)]
pub struct UpdateBalance<'info> {
    #[account(
        mut,
        seeds = [b"bank", holder.key().as_ref()],
        bump,
    )]
    pub bank_account: Account<'info, BankAccount>,
    pub holder: Signer<'info>,
}

#[error_code]
pub enum BankError {
    #[msg("Not enough money in the account")]
    InsufficientFunds,
}`

type Parts = { module?: boolean; money?: boolean; wired?: boolean; interest?: boolean; open?: boolean; data?: "broken" | "fixed"; update?: boolean }

/** lib.rs with the pieces written so far, each in its place. Every write is placed by the file as it
 * stands right after it: `deposit` and `withdraw` repeat their first lines, and both structs their seeds */
function lib(p: Parts) {
  const fns = [OPEN_FN, ...(p.money ? [depositFn(!!p.wired), withdrawFn(!!p.wired)] : [])]
  const module = `#[program]\nmod bank_simulator {\n    use super::*;\n\n${fns.join("\n\n")}\n}`
  return [BOIL, p.module && module, p.interest && ADD_INTEREST, p.open && OPEN_ACCOUNTS, p.data && bankAccount(p.data === "fixed"), p.update && UPDATE].filter(Boolean).join("\n\n")
}

const S1 = { module: true, open: true, data: "fixed" } as const
const S2 = { ...S1, money: true, update: true }
const LIB_BROKEN = lib({ ...S1, data: "broken" })
const LIB_S1 = lib(S1)
const LIB_S2 = lib(S2)
const LIB_S3 = lib({ ...S2, interest: true, wired: true })

/** The line of `holder_name` in the first build, which the planned failure points at */
const NAME_LINE = LIB_BROKEN.split("\n").findIndex((l) => l.trim() === "pub holder_name: String,") + 1

const EXPLAIN_ERROR = `\`InitSpace\` sizes the account by adding up its fields: 8 bytes for \`balance\`, 8 for \`last_update\`. A \`String\` can be any length, so it can't count \`holder_name\` on line ${NAME_LINE}, and asks you for the longest one you'll store.`

const UPGRADES = `Upgrades ${shortKey(PROGRAM_ID).replace("…", "…⁠")} in place · from your wallet`

const AMOUNT = { name: "amount", label: "Amount", kind: "dollars" } as const
const MONEY_MOVES = [
  { ix: "deposit", button: "Deposit", fields: [AMOUNT] },
  { ix: "withdraw", button: "Withdraw", fields: [AMOUNT] },
]

const STEPS: Step[] = [
  {
    id: "account",
    title: "Open account",
    short: "Account",
    objective: "Keep a holder's name, balance and last change in an account",
    learned: "Money as whole cents, and a size for every field, a name included",
    file: LIB,
    start: "",
    target: LIB_S1,
    goal: "build",
    beats: [
      {
        kind: "write",
        id: "s1.boil",
        text: "The usual opening: the import and the program's id. I've written them.",
        writes: { file: LIB, block: BOIL, ref: lib({}) },
      },
      {
        kind: "write",
        id: "s1.data",
        text: "The account keeps the holder's name, the balance and when it last changed. Money is a whole number of cents in a `u64`: a float rounds, and a bank can't. `InitSpace` counts the bytes, as in Lumberjack.",
        writes: { file: LIB, block: bankAccount(false), ref: lib({ data: "broken" }) },
      },
      {
        kind: "write",
        id: "s1.accounts",
        text: '`OpenAccount` creates it at a PDA from `"bank"` and your key, so every wallet gets one account and only that wallet can reach it. Your wallet pays the rent.',
        writes: { file: LIB, block: OPEN_ACCOUNTS, ref: lib({ open: true, data: "broken" }) },
      },
      {
        kind: "write",
        id: "s1.fn",
        text: "And `open_account` fills it in: your name, the first deposit, and the time from the cluster's clock.",
        writes: { file: LIB, block: `#[program]\nmod bank_simulator {\n    use super::*;\n\n${OPEN_FN}\n}`, ref: LIB_BROKEN },
      },
      {
        kind: "act",
        id: "s1.build",
        act: "build",
        say: "That's a bank that can open accounts. Let's compile it.",
        title: "Build lib.rs",
        context: "Compiles lib.rs on Playground's build server",
        button: "Build",
      },
    ],
    planned: "This one's on purpose. Everyone who stores their first `String` with `InitSpace` meets it.",
    plannedShort: `\`InitSpace\` can't count \`holder_name\` on line ${NAME_LINE}: a \`String\` has no fixed length.`,
    onFail: [
      { kind: "say", id: "f1.explain", text: EXPLAIN_ERROR, quote: { file: LIB, line: NAME_LINE, mark: "String", tone: "error" } },
      {
        kind: "ask",
        id: "f1.q",
        kicker: "Fix it",
        question: "So what does `holder_name` need?",
        options: ["space = 1000,", "pub holder_name: &'info str,", "#[max_len(32)]"],
        code: true,
        answer: 2,
        right: "Right. 32 bytes at most, plus 4 for the length: now `InitSpace` can count it. I've put it above `holder_name`.",
        why: [
          "The derive still can't count the `String`, so the error stays, and you'd pay rent for bytes nobody uses.",
          "An account has to own its bytes. A borrowed `&str` can't be stored in it, so it stays a `String`.",
          null,
        ],
        hint: "The compiler names the attribute it wants.",
        writes: { file: LIB, block: MAX_LEN, ref: LIB_S1 },
        key: "#[max_len(32)]",
        typed: "That's it. 32 bytes is plenty for a name.",
      },
      {
        kind: "act",
        id: "f1.build",
        act: "build",
        say: "Build again.",
        title: "Build lib.rs",
        context: "Same build, now with `max_len`",
        button: "Build",
      },
    ],
    win: {
      id: "s1.win",
      headline: "Your bank can open accounts",
      line: "The build wrote the IDL: `open_account(holder_name, deposit)`, and a `BankAccount` of 60 bytes, name included.",
      stats: [
        { icon: "hammer", text: "Built in 1.6 s" },
        { icon: "braces", text: "60 bytes" },
        { icon: "clock", text: "{took}" },
      ],
    },
    explainStep: "This step writes the bank account, with money in whole cents, and `open_account`, which creates it at a PDA. The first build fails on purpose: `InitSpace` can't size a `String` until you say how long it gets.",
    chips: [
      {
        label: "Why cents, not dollars?",
        match: /\b(cents?|float|f64|dollars?)\b/i,
        answer: "A `f64` can't hold 0.1 exactly, so sums drift by fractions of a cent. Whole cents in a `u64` add up exactly; the card shows them as dollars.",
      },
      {
        label: "Why 32 bytes?",
        match: /32 bytes|max_len/i,
        answer: "Any name you'll type fits, and every byte is rent. A longer name fails when the account is saved, with `AccountDidNotSerialize`.",
      },
    ],
    errorChips: [
      {
        label: "Why can't InitSpace count a String?",
        match: /initspace|string/i,
        answer: "A `String` holds its length, 4 bytes, then the text, and the text can be any length. `InitSpace` adds up fixed sizes, so it needs the longest text you'll store: `#[max_len(32)]` makes the field 36 bytes.",
      },
      {
        label: "Where is this in the docs?",
        match: /\b(docs?|documentation)\b/i,
        answer: "The Anchor docs cover it in [Space Reference](https://www.anchor-lang.com/docs/references/space), under `InitSpace`.",
      },
    ],
    answers: [{ match: /why.*(fail|error)/i, answer: EXPLAIN_ERROR, local: true }],
  },
  {
    id: "money",
    title: "Deposit & withdraw",
    short: "Money",
    objective: "Move money in and out, and refuse what the account can't cover",
    learned: "The program guards the money: an error of its own, before anything changes",
    file: LIB,
    start: LIB_S1,
    target: LIB_S2,
    goal: "move",
    beats: [
      {
        kind: "say",
        id: "s2.what",
        text: "Now money in and out. `deposit` adds to the balance. `withdraw` takes from it, and has to refuse when there isn't enough, so the app can tell the holder why.",
      },
      {
        kind: "ask",
        id: "s2.q1",
        kicker: "Question",
        n: 1,
        question: "Which line guards `withdraw`?",
        options: [
          "account.balance = account.balance.saturating_sub(amount);",
          "require!(amount <= account.balance, BankError::InsufficientFunds);",
          "account.balance -= amount;",
        ],
        code: true,
        answer: 1,
        right: "Yes. `require!` checks first and returns your error by name, so nothing changes and the app knows why. I've written `withdraw` around it, and `deposit`.",
        why: ["That stops at 0 and lets the withdrawal through: $1,000 out of a $100 account.", null, "Below 0 a `u64` can't go: the program panics. The withdrawal fails, but nobody can tell why."],
        hint: "Check before you take, and say why when you can't.",
        writes: { file: LIB, block: `${depositFn(false)}\n\n${withdrawFn(false)}`, ref: lib({ ...S1, money: true }) },
        key: "require!(amount <= account.balance, BankError::InsufficientFunds);",
        typed: "That's the guard. I've written the rest.",
      },
      {
        kind: "write",
        id: "s2.rest",
        text: "And the error itself, with its message, plus `UpdateBalance`: your account from the same seeds, marked `mut`, and your signature. Someone else's key would give someone else's address.",
        writes: { file: LIB, block: UPDATE, ref: LIB_S2 },
      },
      {
        kind: "act",
        id: "s2.deploy",
        act: "deploy",
        say: "Your bank is built. Deploy it and open an account.",
        title: "Deploy to devnet",
        context: "From your Playground wallet · free devnet SOL",
        button: "Deploy",
      },
      {
        kind: "act",
        id: "s2.open",
        act: "send",
        ix: "open_account",
        say: "Open your account. It starts with $100.",
        title: "Open your account",
        context: "Sends `open_account` with $100 · about 0.0013 SOL of rent",
        button: "Open",
        fields: [{ name: "holder_name", label: "Name", kind: "text", max: 32, placeholder: "Your name", required: true }],
        record: "Opened your account",
      },
      {
        kind: "act",
        id: "s2.moves",
        act: "move",
        say: "Move some money: deposit a little, withdraw a little. Then try to take out more than you have.",
        title: "Deposit and withdraw",
        context: "Amounts in dollars, sent as cents: $10 is `1000`",
        button: "Deposit",
        moves: MONEY_MOVES,
        record: "Moved money",
      },
    ],
    win: {
      id: "s2.win",
      headline: "The bank said no, by name",
      line: "`InsufficientFunds` came back from devnet as error 6000, and your balance stayed as it was. An app turns that into \"Not enough money\".",
      stats: [
        { icon: "alert", text: "Error 6000" },
        { icon: "coins", text: "Rent 0.0013 SOL" },
        { icon: "clock", text: "{took}" },
      ],
      extra: "openTest",
    },
    testWin: "You withdrew more than the balance from the Call panel, and `InsufficientFunds` came back as error 6000.",
    explainStep: "This step adds `deposit` and `withdraw`, with `require!` guarding the withdrawal. Then you open an account on devnet and try to take out more than it holds.",
    chips: [
      {
        label: "Is this real money?",
        match: /\breal\b|\bsol\b/i,
        answer: "No, it's a simulator: the balance is a number in your account, and no SOL moves. SPL Token Vault is where a program holds real tokens.",
      },
      {
        label: "Can someone else withdraw?",
        match: /\b(someone|else|other|another|steal)\b/i,
        answer: "They'd sign with their own key, and the seeds would point at their account, not yours.",
      },
    ],
  },
  {
    id: "interest",
    title: "Interest",
    short: "Interest",
    objective: "Pay interest from the time on chain, with nothing running in between",
    learned: "Time on chain: interest worked out from the cluster's clock whenever the account is touched",
    file: LIB,
    start: LIB_S2,
    target: LIB_S3,
    goal: "move",
    beats: [
      {
        kind: "say",
        id: "s3.why",
        text: "The original Bank Simulator paid interest with Clockwork, a service that called the program on a schedule. Clockwork shut down in 2023, and nothing on Solana runs by itself. So interest is worked out whenever someone touches the account, the same trick as Lumberjack's energy, with money: 5% a minute, fast enough to watch.",
      },
      {
        kind: "ask",
        id: "s3.q2",
        kicker: "Question",
        n: 2,
        question: "Where does `add_interest` get the minutes from?",
        options: ["The cluster's clock, minus `last_update`", "A `now` argument the client sends", "The number of transactions since the account opened"],
        code: false,
        answer: 0,
        right: "Right. `Clock::get()` gives the time every validator agrees on, and `last_update` says when interest was last added. I've written `add_interest`.",
        why: [null, "Then anyone could send a date next year and collect a year of interest. The time has to come from the chain.", "Time passes without transactions. An account nobody touches for an hour still earns an hour."],
        hint: "Who would you trust to say what time it is: the holder, or the chain?",
        writes: { file: LIB, block: ADD_INTEREST, ref: lib({ ...S2, interest: true }) },
        key: "let now = Clock::get()?.unix_timestamp;",
        typed: "That's where the time comes from. I've written the rest.",
      },
      {
        kind: "write",
        id: "s3.wire",
        text: "And both moves call it first, so every touch starts from the balance with its interest in. A withdrawal can spend interest it just earned.",
        writes: { file: LIB, block: `${depositFn(true)}\n\n${withdrawFn(true)}`, ref: LIB_S3 },
      },
      {
        kind: "act",
        id: "s3.ship",
        act: "buildDeploy",
        say: "Build and deploy. Your account keeps its balance and its `last_update`: only the program changes.",
        title: "Build and deploy",
        context: UPGRADES,
        button: "Build and deploy",
      },
      {
        kind: "act",
        id: "s3.touch",
        act: "move",
        say: "Your card now shows interest adding up: that's the client doing the program's math, no transaction. Deposit something and the program books it.",
        title: "Touch your account",
        context: "Each move books the interest since `last_update` first",
        button: "Deposit",
        moves: MONEY_MOVES,
        record: "Booked interest",
      },
    ],
    win: {
      id: "s3.win",
      headline: "Interest adds up with nothing running",
      line: "Your move booked {interest} for the {time} since your account last changed. The number on your card is the client doing the same math.",
      stats: [
        { icon: "zap", text: "5% a minute" },
        { icon: "cpu", text: "0 extra transactions" },
        { icon: "clock", text: "{took}" },
      ],
    },
    testWin: "You touched your account from the Call panel, and the interest since the last change was booked.",
    explainStep: "This step adds `add_interest`, which works the interest out from the cluster's clock and `last_update`. Both moves call it first, so nothing has to run in between.",
    chips: [
      {
        label: "Can I earn more by touching it often?",
        match: /often|compound/i,
        answer: "A little: each touch adds the interest to the balance, and the next one earns on that. A real bank fixes when it compounds; this one compounds whenever you touch it.",
      },
      {
        label: "Where do fractions of a cent go?",
        match: /fraction|round/i,
        answer: "Integer math rounds them down, in the bank's favour. A real bank writes its rounding rule down.",
      },
      {
        label: "Why not a timer on chain?",
        match: /\b(timer|cron|schedul\w*|clockwork)\b/i,
        answer: "Programs don't run on their own: every instruction runs inside a transaction someone sent. So the time is counted lazily, when the next call comes.",
      },
    ],
  },
]

const CHECKS = [stringWithoutMaxLen(EXPLAIN_ERROR, true), noSystemProgram, payerNotMut, clockWithoutTry]

// ---- The bank: what the program does with the account, worked out the way it would

const accountOf = (s: State) => s.records?.find((r) => r.id === "bank") ?? null

/** Whether the program on devnet works interest out on every touch */
const pays = (s: State) => s.deployedLib !== null && holds(s.deployedLib, WIRE)

/** The interest since `last_update`, rounded down to the cent, as `add_interest` works it out */
function interestOf(r: Rec, now: number) {
  const seconds = Math.max(0, Math.floor((now - Number(r.values.last)) / 1000))
  return { seconds, cents: Math.floor((Number(r.values.balance) * BPS_PER_MINUTE * seconds) / (10_000 * 60)) }
}

const time = (ms: number) => new Date(ms).toLocaleTimeString("en-GB", { hour12: false })

/** One send, from a card or the Call panel, answered as devnet would: a second account is already in use,
 * a name past 32 bytes can't be saved, a withdrawal past the balance is refused by the program's own error */
function send(s: State, ix: string, given?: Record<string, string>): RecSend | { note: string } {
  const a = { ...args(s, ix), ...given }
  const account = accountOf(s)
  const records = s.records ?? []
  const signature = records.length === 0 && ix === "open_account" ? OPEN_SIGNATURE : signatureOf(sentSoFar(s) + 40)
  const now = Date.now()
  if (ix === "open_account") {
    if (account) return { tx: inUse("open_account", BANK_PDA, signature), records, refused: "Already in use · your account stayed as it was" }
    if (bytes(a.holder_name) > 32) return { tx: tooLong("open_account", signature, "bank_account"), records, refused: "AccountDidNotSerialize · 3004 · the name is past 32 bytes" }
    const deposit = Number(a.deposit)
    const rec: Rec = { id: "bank", kind: "BankAccount", pda: BANK_PDA, values: { holder_name: a.holder_name, balance: deposit, last: now }, rent: RENT }
    const tx: Tx = { instruction: "open_account", said: `Opened for ${a.holder_name} with ${deposit} cents`, signature, compute: 8940, inner: SYSTEM_CPI }
    return { tx, records: [rec] }
  }
  if (ix === "deposit" || ix === "withdraw") {
    if (!account) return { note: "Open your account first, with `open_account`." }
    const amount = Number(a.amount)
    const on = pays(s)
    const i = on ? interestOf(account, now) : { seconds: 0, cents: 0 }
    const inner = on ? [`Program log: Interest: ${i.cents} cents for ${i.seconds} s`] : undefined
    const before = Number(account.values.balance) + i.cents
    const compute = on ? (ix === "deposit" ? 5310 : 5350) : ix === "deposit" ? 3980 : 4020
    if (ix === "withdraw" && amount > before) {
      const tx: Tx = {
        instruction: "withdraw",
        said: "",
        signature,
        compute,
        inner,
        error: { name: "InsufficientFunds", number: 6000, message: "Not enough money in the account", line: lineOf(s.deployedLib ?? "", "require!") },
      }
      return { tx, records, refused: "InsufficientFunds · 6000 · the balance stayed as it was" }
    }
    const balance = ix === "deposit" ? before + amount : before - amount
    const tx: Tx = { instruction: ix, said: `${ix === "deposit" ? "Deposited" : "Withdrew"} ${amount} cents. Balance: ${balance}`, signature, compute, inner }
    return { tx, records: records.map((r) => (r.id === "bank" ? { ...r, values: { ...r.values, balance, last: on ? now : r.values.last } } : r)) }
  }
  return { note: "That call has no card here." }
}

/** What a card and the Call panel start at: $100 to open with, $10 in, $50 out, and $1,000 out once a
 * withdrawal has gone through, so the next one meets the guard */
function args(s: State, ix: string): Record<string, string> {
  if (ix === "open_account") return { holder_name: "Alex", deposit: String(FIRST_DEPOSIT) }
  if (ix === "deposit") return { amount: "1000" }
  if (ix === "withdraw") return { amount: landed(s, "withdraw") ? "100000" : "5000" }
  return {}
}

function check(_ix: string, given: Record<string, string>): string | null {
  for (const [name, v] of Object.entries(given)) if (name !== "holder_name" && !isU64(v)) return `\`${name}\` is a \`u64\`, in cents: a whole number from 0.`
  return null
}

/** The interest a move booked, from its log line: cents and seconds */
const booked = (tx: Tx) => {
  const m = (tx.inner ?? []).join("\n").match(/Interest: (\d+) cents for (\d+) s/)
  return m ? { cents: Number(m[1]), seconds: Number(m[2]) } : null
}

/** Step 2 passes on the refused withdrawal, step 3 on a move that booked interest */
const passes = (_s: State, i: number, ix: string, tx: Tx) =>
  i === 1 ? ix === "withdraw" && tx.error?.name === "InsufficientFunds" : i === 2 ? !tx.error && (booked(tx)?.cents ?? 0) > 0 : false

/** The last move that booked interest, for step 3's win */
function lastBooked(s: State) {
  const all = [...s.thread.flatMap((t) => (t.kind === "act" ? (t.sends ?? []).map((x) => x.tx) : [])), ...s.thread.flatMap((t) => (t.kind === "result" && t.tx ? [t.tx] : []))]
  return all.map((tx) => (tx.error ? null : booked(tx))).filter((b) => b && b.cents > 0).pop() ?? null
}

export const BANK_SIMULATOR: Lesson = {
  card: { slug: "bank-simulator", name: "Bank Simulator", level: "Intermediate", framework: "Anchor", ext: "png" },
  minutes: 12,
  by: "Bolt / Syed Aabis Akhtar",
  program: "bank_simulator",
  line: "Keep money in an account, guard it, and pay interest from the clock",
  intro: "You'll run a small bank on chain: an account with your name and a balance in cents, a withdrawal the program refuses by name, and interest that adds up from the clock with nothing running.",
  proof: "Program log: Interest: 485 cents for 97 s",
  badge: "Interest on chain",
  headline: "You built a bank that pays interest",
  proofLine: (_tx, s) => {
    const a = accountOf(s)
    return `${a ? `${a.values.holder_name}'s` : "Your"} account holds ${dollars(Number(a?.values.balance ?? 0))} on devnet, and its interest adds up with nothing running.`
  },
  // The next Intermediate one in Anchor: the bank kept a number, the vault keeps real tokens
  next: "spl-token-vault",
  nextLine: "SPL Token Vault is a good next one: a program holds real tokens in an account it owns, and only it can send them back.",
  steps: STEPS,
  // No client.ts: Open, Deposit and Withdraw go from the cards or the Call panel
  files: { [LIB]: "" },
  preview: LIB_S3,
  programId: PROGRAM_ID,
  idlAccount: IDL_ACCOUNT,
  txSignature: OPEN_SIGNATURE,
  checks: CHECKS,
  story: false,
  runTx: () => ({ instruction: "open_account", said: "Opened for Alex with 10000 cents", signature: OPEN_SIGNATURE, compute: 8940, inner: SYSTEM_CPI }),
  records: {
    title: "Bank account",
    one: "account",
    empty: "No account yet. Open sends `open_account`.",
    show: (r) => ({
      label: `${r.values.holder_name}'s account`,
      seeds: '"bank" · your wallet',
      fields: [
        ["balance", dollars(Number(r.values.balance))],
        ["last_update", time(Number(r.values.last))],
      ],
    }),
    send: (s, ix, given) => send(s, ix, given),
    passes,
    args: (s, ix) => args(s, ix),
    check,
    // The interest so far, as the client works it out between transactions, once the program pays it
    live: (s, r, now) => {
      if (!pays(s)) return null
      if (Number(r.values.balance) === 0) return "Nothing to earn on $0.00: deposit first"
      return `Interest so far +${dollars(interestOf(r, now).cents)} · worked out by the client, no transaction`
    },
  },
  winVars: (s) => {
    const b = lastBooked(s)
    return { interest: b ? dollars(b.cents) : "$0.00", time: b ? `${b.seconds} s` : "time" }
  },
}
