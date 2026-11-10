import type { State } from "../store"
import { CLIENT, LIB, shortKey } from "./common"
import { SYSTEM_CPI, bytes, closeNotMut, inUse, isU64, missing, noSystemProgram, payerNotMut, pdaOf, sentSoFar, signatureOf, sol, stringWithoutMaxLen, tooLong } from "./records"
import type { Lesson, Rec, RecSend, SpecialCheck, Step, Tx } from "./types"

// Expense Tracker: one account per expense, at a PDA from "expense", the wallet's key and the
// expense's id. Step 1 puts an argument in the seeds (the planned failure: `#[instruction]` missing),
// step 2 adds expenses from the card and finds them all again with a memcmp filter, step 3 edits one and
// deletes one with `close`, which sends its rent back. After Bolt / Syed Aabis Akhtar's Expense Tracker.
// The records card with many rows: Add on the card, Edit and Delete on each row

const PROGRAM_ID = "yNoVKf58ZTBqNAYT3j5qcdsyuMNmPfYetW5v6JXmj54o"
const IDL_ACCOUNT = "8vHqTrWm3bLzX2kNcQ7sYdP4fJgA9eRuK5tMwVo6Bh1E"
const ADD_SIGNATURE = "3ZqKb7XyWvTnRpL2mFgHcDs8JeA4uN9oPiQk5tYzBxMw6VhGfCr1EaUdLs3XnTq7WpKjYm2Bv8GzHc4RfNuAe9oD"

/** The example addresses for the first three expenses; later ones are made up the same way every time */
const PDAS: Record<number, string> = {
  1: "mLidkuVKnRyjP2WPBg8Y4ErK9pGSSxY6BVScJy9uUxcJ",
  2: "nTPkyRFA6CAFjF1YveCHK1ATbQgdM9mwZgikp4Wzxrxk",
  3: "tcSSSS7XhS4D5EVB8Nf471dAb7Qg25xEgRAhHPfQX88w",
}
const pdaFor = (id: number) => PDAS[id] ?? pdaOf(id)

/** An expense's rent: 92 bytes, 1,531,200 lamports */
const RENT = 0.0015

/** What the card adds when nothing was typed: the first expense, then the two "Add two more" sends */
const EXAMPLES: [string, number][] = [
  ["Coffee", 4],
  ["Lunch", 12],
  ["Books", 30],
  ["Train", 25],
  ["Taxi", 18],
  ["Snacks", 6],
]

// The program, piece by piece, in the order it sits in lib.rs

const BOIL = `use anchor_lang::prelude::*;

declare_id!("11111111111111111111111111111111");`

const ADD_FN = `    pub fn add_expense(ctx: Context<AddExpense>, id: u64, merchant_name: String, amount: u64) -> Result<()> {
        let expense = &mut ctx.accounts.expense_account;
        expense.id = id;
        expense.owner = ctx.accounts.authority.key();
        expense.merchant_name = merchant_name;
        expense.amount = amount;
        msg!("Expense #{}: {}, {}", id, expense.merchant_name, amount);
        Ok(())
    }`

const MODIFY_FN = `    pub fn modify_expense(ctx: Context<ModifyExpense>, _id: u64, merchant_name: String, amount: u64) -> Result<()> {
        let expense = &mut ctx.accounts.expense_account;
        expense.merchant_name = merchant_name;
        expense.amount = amount;
        Ok(())
    }`

const DELETE_FN = `    pub fn delete_expense(_ctx: Context<DeleteExpense>, _id: u64) -> Result<()> {
        Ok(())
    }`

const INSTRUCTION = `#[instruction(id: u64)]`

const SEEDS = `        seeds = [b"expense", authority.key().as_ref(), id.to_le_bytes().as_ref()],`

const addAccounts = (instruction: boolean) => `#[derive(Accounts)]${instruction ? `\n${INSTRUCTION}` : ""}
pub struct AddExpense<'info> {
    #[account(
        init,
        payer = authority,
        space = 8 + ExpenseAccount::INIT_SPACE,
${SEEDS}
        bump,
    )]
    pub expense_account: Account<'info, ExpenseAccount>,
    #[account(mut)]
    pub authority: Signer<'info>,
    pub system_program: Program<'info, System>,
}`

const MODIFY_ACCOUNTS = `#[derive(Accounts)]
${INSTRUCTION}
pub struct ModifyExpense<'info> {
    #[account(
        mut,
${SEEDS}
        bump,
    )]
    pub expense_account: Account<'info, ExpenseAccount>,
    pub authority: Signer<'info>,
}`

const DELETE_ACCOUNTS = `#[derive(Accounts)]
${INSTRUCTION}
pub struct DeleteExpense<'info> {
    #[account(
        mut,
        close = authority,
${SEEDS}
        bump,
    )]
    pub expense_account: Account<'info, ExpenseAccount>,
    #[account(mut)]
    pub authority: Signer<'info>,
}`

const EXPENSE = `#[account]
#[derive(InitSpace)]
pub struct ExpenseAccount {
    pub id: u64,
    pub owner: Pubkey,
    #[max_len(32)]
    pub merchant_name: String,
    pub amount: u64,
}`

type Parts = { module?: boolean; modFn?: boolean; delFn?: boolean; add?: "broken" | "fixed"; modAcc?: boolean; delAcc?: boolean; data?: boolean }

/** lib.rs with the pieces written so far, each in its place. Every write is placed by the file as it
 * stands right after it: the three accounts structs repeat their seeds, `bump,` and `#[instruction]` */
function lib(p: Parts) {
  const fns = [ADD_FN, p.modFn && MODIFY_FN, p.delFn && DELETE_FN].filter(Boolean)
  const module = `#[program]\nmod expense_tracker {\n    use super::*;\n\n${fns.join("\n\n")}\n}`
  return [BOIL, p.module && module, p.add && addAccounts(p.add === "fixed"), p.modAcc && MODIFY_ACCOUNTS, p.delAcc && DELETE_ACCOUNTS, p.data && EXPENSE].filter(Boolean).join("\n\n")
}

const S1 = { module: true, add: "fixed", data: true } as const
const LIB_BROKEN = lib({ ...S1, add: "broken" })
const LIB_S1 = lib(S1)
const LIB_S3 = lib({ ...S1, modFn: true, delFn: true, modAcc: true, delAcc: true })

/** The client: every expense with your key where `owner` sits. Step 2's question writes it */
const CLIENT_LIST = `// Every expense account with your key at byte 16, where \`owner\` sits
const expenses = await pg.program.account.expenseAccount.all([
  { memcmp: { offset: 8 + 8, bytes: pg.wallet.publicKey.toBase58() } },
]);
expenses.sort((a, b) => a.account.id.toNumber() - b.account.id.toNumber());
for (const { publicKey, account } of expenses) {
  console.log(\`#\${account.id} \${account.merchantName}: \${account.amount} at \${publicKey}\`);
}
if (expenses.length === 0) console.log("No expenses yet");`

/** The line of the seeds in the first build, which the planned failure points at */
const ID_LINE = LIB_BROKEN.split("\n").findIndex((l) => l === SEEDS) + 1

const EXPLAIN_ERROR = `Line ${ID_LINE} builds the address from \`id\`, but \`id\` is an argument of \`add_expense\`, not something \`AddExpense\` has. Anchor works out the accounts before the instruction runs, so the struct has to ask for the arguments it uses.`

const UPGRADES = `Upgrades ${shortKey(PROGRAM_ID).replace("…", "…⁠")} in place · from your wallet`

const STEPS: Step[] = [
  {
    id: "expense",
    title: "Expense account",
    short: "Expense",
    objective: "Give every expense an account of its own",
    learned: "Many records of one kind, each at its own address from an id in the seeds",
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
        text: "An expense keeps its id, its owner, where you spent and how much. A `String` can be any length, so `#[max_len(32)]` tells `InitSpace` the longest merchant name you'll store.",
        writes: { file: LIB, block: EXPENSE, ref: lib({ data: true }) },
      },
      {
        kind: "write",
        id: "s1.accounts",
        text: '`AddExpense` creates one. Its seeds are `"expense"`, your key and the expense\'s `id`, so every id gets an address of its own: one account per expense.',
        writes: { file: LIB, block: addAccounts(false), ref: lib({ add: "broken", data: true }) },
      },
      {
        kind: "write",
        id: "s1.fn",
        text: "And `add_expense` fills it in from the instruction's arguments: the id, the merchant, the amount.",
        writes: { file: LIB, block: `#[program]\nmod expense_tracker {\n    use super::*;\n\n${ADD_FN}\n}`, ref: LIB_BROKEN },
      },
      {
        kind: "act",
        id: "s1.build",
        act: "build",
        say: "Let's compile it.",
        title: "Build lib.rs",
        context: "Compiles lib.rs on Playground's build server",
        button: "Build",
      },
    ],
    planned: "This one's on purpose. Everyone who puts an argument in their seeds meets it once.",
    plannedShort: `Line ${ID_LINE} uses \`id\`, and \`AddExpense\` can't see \`add_expense\`'s arguments yet.`,
    onFail: [
      { kind: "say", id: "f1.explain", text: EXPLAIN_ERROR, quote: { file: LIB, line: ID_LINE, mark: "id", tone: "error" } },
      {
        kind: "ask",
        id: "f1.q",
        kicker: "Fix it",
        question: "So how does `AddExpense` get to see `id`?",
        options: ["`#[instruction(id: u64)]` above the struct", "A field `pub id: u64` in `AddExpense`", "Read `id` from the expense account"],
        code: false,
        answer: 0,
        right: "Exactly. `#[instruction]` hands the struct the instruction's arguments, in their order, so the seeds can use `id`. I've put it under `#[derive(Accounts)]`.",
        why: [null, "`AddExpense` lists accounts, and `id` is a number. It has to come from the instruction's arguments.", "The seeds are needed to find the address before the account exists, so there's nothing to read yet."],
        hint: "`id` arrives with the instruction. Which line passes the instruction's arguments to the struct?",
        writes: { file: LIB, block: INSTRUCTION, ref: LIB_S1 },
        key: INSTRUCTION,
        typed: "That's the line. Now the seeds can use `id`.",
      },
      {
        kind: "act",
        id: "f1.build",
        act: "build",
        say: "Build again.",
        title: "Build lib.rs",
        context: "Same build, now with `#[instruction]`",
        button: "Build",
      },
    ],
    win: {
      id: "s1.win",
      headline: "Every expense gets its own address",
      line: "The build wrote the IDL: `add_expense(id, merchant_name, amount)`, and an `ExpenseAccount` of 92 bytes.",
      stats: [
        { icon: "hammer", text: "Built in 1.6 s" },
        { icon: "braces", text: "92 bytes" },
        { icon: "clock", text: "{took}" },
      ],
    },
    explainStep: "This step writes the expense account and `add_expense`, with the expense's id in the seeds. The first build fails on purpose: the struct can't see the instruction's arguments until it asks for them.",
    chips: [
      {
        label: "Why to_le_bytes?",
        match: /to_le_bytes|little/i,
        answer: "Seeds are bytes. `to_le_bytes` writes the `u64` as its 8 bytes, little end first, and the client has to do the same to find the address.",
      },
      {
        label: "What does max_len do?",
        match: /max_len/i,
        answer: "It tells `InitSpace` how long the `String` can get: 4 bytes for the length, 32 for the text. It sizes the account; it doesn't stop a longer name, which fails when the account is saved.",
      },
    ],
    errorChips: [
      {
        label: "Why can't the struct see the arguments?",
        match: /\bargument|\bsee\b/i,
        answer: "Anchor checks the accounts before your function runs, from the accounts struct alone. The arguments come with the instruction, so the struct asks for them with `#[instruction(...)]`, in the order the function takes them.",
      },
      {
        label: "Where is this in the docs?",
        match: /\b(docs?|documentation)\b/i,
        answer: "The Anchor docs cover it in [Account Constraints](https://www.anchor-lang.com/docs/references/account-constraints), under the instruction attribute.",
      },
    ],
    answers: [{ match: /why.*(fail|error)/i, answer: EXPLAIN_ERROR, local: true }],
  },
  {
    id: "list",
    title: "Add & list",
    short: "List",
    objective: "Add expenses on devnet and find them all again",
    learned: "Finding your records without storing their addresses: a filter on the bytes where owner sits",
    file: CLIENT,
    start: "",
    target: CLIENT_LIST,
    goal: "run",
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
        kind: "act",
        id: "s2.add",
        act: "move",
        say: "Add your first expense. Then I can add two more, so there's a list to find.",
        title: "Add an expense",
        context: "Sends `add_expense` · about 0.0015 SOL of rent",
        button: "Add",
        moves: [
          {
            ix: "add_expense",
            button: "Add #{id}",
            fields: [
              { name: "merchant_name", label: "Merchant", kind: "text", max: 32 },
              { name: "amount", label: "Amount", kind: "number" },
            ],
          },
        ],
        until: { label: "Add two more", times: 2 },
        record: "Added expenses",
      },
      {
        kind: "say",
        id: "s2.why",
        text: "Each expense sits at its own address, and an address is a hash of its seeds. Your app will want the whole list, on any device, without keeping the ids anywhere.",
      },
      {
        kind: "ask",
        id: "s2.q1",
        kicker: "Question",
        n: 1,
        question: "So how does your app find all your expenses?",
        options: ["Work out the addresses for id 1, 2, 3 and stop at the first missing one", "Read the seeds back out of each address", "Ask devnet for the program's accounts with your key where `owner` sits"],
        code: false,
        answer: 2,
        right: "Right. `all` asks devnet for every account of this type, and a `memcmp` filter keeps those with your key at byte 16: 8 bytes of discriminator, 8 of `id`, then `owner`. I've written it in client.ts.",
        why: ["That breaks at the first delete: a gap at #2 hides #3 and everything after it.", "A PDA is a hash. There's no way back from the address to the seeds that made it.", null],
        hint: "Every expense stores something that's the same for all of yours.",
        skipped: "No problem. The client asks devnet for every expense account with your key at byte 16, where `owner` sits. I've written it in client.ts.",
        writes: { file: CLIENT, block: CLIENT_LIST, ref: CLIENT_LIST },
        key: "{ memcmp: { offset: 8 + 8, bytes: pg.wallet.publicKey.toBase58() } },",
        typed: "That's the filter: your key at byte 16. I've written the loop that prints them.",
      },
      {
        kind: "act",
        id: "s2.run",
        act: "run",
        say: "Run it.",
        title: "Run client.ts",
        context: "Reads your expenses · no transaction",
        button: "Run",
      },
    ],
    win: {
      id: "s2.win",
      headline: "Your expenses, found by a filter",
      line: "{n} accounts at {n} addresses, and one call found them by the bytes at offset 16. No list is stored anywhere.",
      stats: [
        { icon: "braces", text: "Offset 16" },
        { icon: "coins", text: "Rent {rent}" },
        { icon: "clock", text: "{took}" },
      ],
      extra: "openTest",
    },
    explainStep: "This step deploys, adds expenses from the card, then writes the client that finds them all with a `memcmp` filter on the owner's key, with no list stored anywhere.",
    chips: [
      {
        label: "What is memcmp?",
        match: /memcmp|filter/i,
        answer: "Memory compare: devnet keeps the accounts whose bytes at `offset` equal `bytes`. It's `getProgramAccounts` under Anchor's `all`.",
      },
      {
        label: "Can others see my expenses?",
        match: /\b(see|private|public|secret)\b/i,
        answer: "Yes. Everything on chain is public: anyone can run the same filter with your key. A program keeps data honest, not secret.",
      },
    ],
  },
  {
    id: "delete",
    title: "Edit & delete",
    short: "Delete",
    objective: "Change an expense, and delete one to get its rent back",
    learned: "Deleting a record closes its account, and close sends its rent back",
    file: LIB,
    start: LIB_S1,
    target: LIB_S3,
    goal: "move",
    beats: [
      {
        kind: "write",
        id: "s3.edit",
        text: "Editing needs nothing new: the same seeds find the expense, and `mut` saves the change. I've written `modify_expense`.",
        writes: { file: LIB, block: MODIFY_FN, ref: lib({ ...S1, modFn: true }) },
      },
      {
        kind: "write",
        id: "s3.editAccounts",
        text: "And its accounts, `ModifyExpense`: the same seeds, with `#[instruction]` so they can use the id.",
        writes: { file: LIB, block: MODIFY_ACCOUNTS, ref: lib({ ...S1, modFn: true, modAcc: true }) },
      },
      {
        kind: "say",
        id: "s3.why",
        text: "Deleting is different. An account holds its rent for as long as it exists, about 0.0015 SOL for each expense. Deleting one means closing the account and sending that rent somewhere.",
      },
      {
        kind: "ask",
        id: "s3.q2",
        kicker: "Question",
        n: 2,
        question: "What gives the rent back when an expense is deleted?",
        options: ["expense_account.amount = 0;", "close = authority,", "mut,"],
        code: true,
        answer: 1,
        right: "Yes. `close` empties the account when `delete_expense` returns and sends its rent to `authority`, your wallet. I've written `DeleteExpense` around it.",
        why: ["The expense would read 0, but the account stays, and so does its 0.0015 SOL.", null, "`mut` lets the instruction change the account. Nothing removes it, so the rent stays locked in it."],
        hint: "The rent goes back only when the account itself is gone.",
        writes: { file: LIB, block: DELETE_ACCOUNTS, ref: lib({ ...S1, modFn: true, modAcc: true, delAcc: true }) },
        key: "close = authority,",
        typed: "That's the one. I've written the rest of `DeleteExpense`.",
      },
      {
        kind: "write",
        id: "s3.fn",
        text: "`delete_expense` itself is empty: `close` does the work after it returns.",
        writes: { file: LIB, block: DELETE_FN, ref: LIB_S3 },
      },
      {
        kind: "act",
        id: "s3.ship",
        act: "buildDeploy",
        say: "Build and deploy. Your expenses stay where they are: only the program changes.",
        title: "Build and deploy",
        context: UPGRADES,
        button: "Build and deploy",
      },
      {
        kind: "act",
        id: "s3.moves",
        act: "move",
        say: "Change one expense, then delete one. Watch your wallet.",
        title: "Edit and delete",
        context: "Edit sends `modify_expense`, Delete sends `delete_expense`",
        button: "Edit",
        moves: [
          {
            ix: "modify_expense",
            button: "Edit",
            row: "Expense",
            fields: [
              { name: "merchant_name", label: "Merchant", kind: "text", max: 32 },
              { name: "amount", label: "Amount", kind: "number" },
            ],
          },
          { ix: "delete_expense", button: "Delete", row: "Expense" },
        ],
        todo: [
          { ix: "modify_expense", text: "Change an expense" },
          { ix: "delete_expense", text: "Delete one" },
        ],
        record: "Edited and deleted",
      },
    ],
    win: {
      id: "s3.win",
      headline: "Deleted, and the rent came back",
      line: "`close` emptied {deleted} and sent 0.0015 SOL back to your wallet. Run client.ts again and it lists the rest.",
      stats: [
        { icon: "coins", text: "+0.0015 SOL back" },
        { icon: "braces", text: "3 instructions" },
        { icon: "clock", text: "{took}" },
      ],
    },
    testWin: "You deleted an expense from the Call panel, and its rent came back to your wallet.",
    explainStep: "This step adds `modify_expense` and `delete_expense`. Deleting closes the account with `close`, and its rent goes back to your wallet.",
    chips: [
      {
        label: "Can I reuse a deleted id?",
        match: /reuse|same id/i,
        answer: "Yes. The account is gone, so `add_expense` with that id creates it again at the same address.",
      },
      {
        label: "Why does close need mut?",
        match: /\bclose\b|\bmut\b/i,
        answer: "Closing changes the account: its lamports go to zero. Anchor stops the build with `mut must be provided before close` if it's missing.",
      },
    ],
  },
]

/** `id` in the seeds of a struct that doesn't take it with `#[instruction(id: u64)]`: the planned
 * failure when there's no attribute at all, and the same error for one that names other arguments */
const needsInstruction: SpecialCheck = ({ bare, file, head, failed }) => {
  const rows = bare.split("\n")
  for (let i = 0; i < rows.length; i++) {
    if (!/#\[derive\(Accounts\)\]/.test(rows[i])) continue
    let end = rows.findIndex((r, k) => k > i && /^\}/.test(r))
    if (end === -1) end = rows.length - 1
    const block = rows.slice(i, end + 1)
    const use = block.findIndex((r) => /\bid\s*\.\s*to_le_bytes\s*\(/.test(r))
    if (use === -1) continue
    const attr = block.find((r) => /#\[instruction\(/.test(r))
    if (attr && /#\[instruction\(\s*id\s*:\s*u64\b/.test(attr)) continue
    const name = block.join("\n").match(/pub\s+struct\s+(\w+)/)?.[1] ?? "the struct"
    const line = i + use + 1
    const column = rows[line - 1].search(/\bid\s*\.\s*to_le_bytes/) + 1
    return {
      ok: false,
      planned: !attr,
      line,
      column,
      span: 2,
      log: [...head, "error[E0425]: cannot find value `id` in this scope", ` --> ${file}:${line}:${column}`, "Build failed"],
      reason: `${failed}: line ${line} uses \`id\`, and \`${name}\` can't see it.`,
      explain: attr
        ? `\`#[instruction(...)]\` hands the struct the instruction's arguments by position, from the first. \`id\` is the first argument, so the attribute has to start with \`id: u64\`.`
        : EXPLAIN_ERROR,
    }
  }
  return null
}

const CHECKS: SpecialCheck[] = [
  needsInstruction,
  noSystemProgram,
  payerNotMut,
  closeNotMut,
  stringWithoutMaxLen("`InitSpace` adds up the account's fields, and a `String` can be any length. Put `#[max_len(32)]` on the line above it, so it knows the longest one you'll store."),
]

// ---- The expenses: what the program does with them, worked out the way it would

const idOf = (r: Rec) => Number(r.values.id)
const sorted = (rs: Rec[]) => [...rs].sort((a, b) => idOf(a) - idOf(b))

/** The values a card and the Call panel start at: the next free id and an example expense; a row's own
 * values for Edit and Delete */
function args(s: State, ix: string, row?: string): Record<string, string> {
  const rs = s.records ?? []
  if (ix === "add_expense") {
    const [merchant, amount] = EXAMPLES[rs.length % EXAMPLES.length]
    return { id: String(Math.max(0, ...rs.map(idOf)) + 1), merchant_name: merchant, amount: String(amount) }
  }
  const r = rs.find((x) => x.id === row) ?? sorted(rs)[0]
  const id = row ?? (r ? String(idOf(r)) : "1")
  if (ix === "modify_expense") return { _id: id, merchant_name: String(r?.values.merchant ?? ""), amount: String(r?.values.amount ?? 0) }
  if (ix === "delete_expense") return { _id: id }
  return {}
}

/** One send, from a card or the Call panel, answered as devnet would: an id that's taken is already in
 * use, a merchant past 32 bytes can't be saved, an expense that isn't there can't be changed */
function send(s: State, ix: string, given?: Record<string, string>, row?: string): RecSend | { note: string } {
  const rs = s.records ?? []
  const a = { ...args(s, ix, row), ...given }
  const id = Number(a.id ?? a._id ?? row)
  const signature = rs.length === 0 && ix === "add_expense" ? ADD_SIGNATURE : signatureOf(sentSoFar(s) + 20)
  const there = rs.find((r) => idOf(r) === id)
  if (ix === "add_expense") {
    if (there) return { tx: inUse("add_expense", there.pda, signature), records: rs, refused: `Already in use · #${id} stays as it was` }
    if (bytes(a.merchant_name) > 32) return { tx: tooLong("add_expense", signature, "expense_account"), records: rs, refused: "AccountDidNotSerialize · 3004 · the name is past 32 bytes" }
    const rec: Rec = { id: String(id), kind: "Expense", pda: pdaFor(id), values: { id, merchant: a.merchant_name, amount: Number(a.amount) }, rent: RENT }
    const tx: Tx = { instruction: "add_expense", said: `Expense #${id}: ${a.merchant_name}, ${a.amount}`, signature, compute: 9410, inner: SYSTEM_CPI }
    return { tx, records: sorted([...rs, rec]) }
  }
  if (ix === "modify_expense" || ix === "delete_expense") {
    if (!there) return { tx: missing(ix, signature, "expense_account"), records: rs, refused: `AccountNotInitialized · 3012 · there's no #${id}` }
    if (ix === "modify_expense") {
      if (bytes(a.merchant_name) > 32) return { tx: tooLong(ix, signature, "expense_account"), records: rs, refused: "AccountDidNotSerialize · 3004 · the name is past 32 bytes" }
      const tx: Tx = { instruction: ix, said: "", signature, compute: 4120 }
      return { tx, records: rs.map((r) => (r === there ? { ...r, values: { ...r.values, merchant: a.merchant_name, amount: Number(a.amount) } } : r)) }
    }
    const tx: Tx = { instruction: ix, said: "", signature, compute: 3560 }
    return { tx, records: rs.filter((r) => r !== there), out: ["Wallet: +0.0015312 SOL rent back, fee 0.000005 SOL"] }
  }
  return { note: "That call has no card here." }
}

/** Whether a value typed in the Call panel can be sent: ids and amounts are `u64` */
function check(_ix: string, given: Record<string, string>): string | null {
  for (const [name, v] of Object.entries(given)) if (name !== "merchant_name" && !isU64(v)) return `\`${name}\` is a \`u64\`: a whole number from 0.`
  return null
}

/** client.ts reads every expense with your key at byte 16: no transaction, just the accounts */
function run(s: State) {
  const rs = sorted(s.records ?? [])
  const out = rs.length ? rs.map((r) => `#${r.values.id} ${r.values.merchant}: ${r.values.amount} at ${r.pda}`) : ["No expenses yet"]
  return { tx: null, out, records: rs }
}

/** The expense the last delete closed, for step 3's win */
function deleted(s: State) {
  const x = s.thread.flatMap((t) => (t.kind === "act" ? (t.sends ?? []) : [])).filter((x) => x.ix === "delete_expense" && x.ok).pop()
  const gone = x?.snap.before.find((b) => !x.snap.after.some((a) => a.id === b.id))
  return gone ? `#${gone.values.id}` : "the expense"
}

export const EXPENSE_TRACKER: Lesson = {
  card: { slug: "expense-tracker", name: "Expense Tracker", level: "Beginner", framework: "Anchor", ext: "png" },
  minutes: 10,
  by: "Bolt / Syed Aabis Akhtar",
  program: "expense_tracker",
  line: "Keep many records on chain, find them by owner and close them",
  intro: "You'll keep your expenses on chain, one account each, find them all again without storing a list, and delete one to get its rent back.",
  proof: "Program log: Expense #1: Coffee, 4",
  badge: "Records on chain",
  headline: "You built an expense tracker on chain",
  proofLine: (_tx, s) => `${s.records?.length ?? 0} expenses on devnet, each at its own address, and the one you deleted gave its rent back.`,
  // The end of the Beginner Anchor path leads up a level
  next: "lumberjack",
  nextLine: "Lumberjack is a good next one: a player account at your PDA, an error of your own, and energy that comes back with time.",
  steps: STEPS,
  files: { [LIB]: "", [CLIENT]: "" },
  preview: LIB_S3,
  programId: PROGRAM_ID,
  idlAccount: IDL_ACCOUNT,
  txSignature: ADD_SIGNATURE,
  checks: CHECKS,
  story: false,
  runTx: () => ({ instruction: "add_expense", said: "Expense #1: Coffee, 4", signature: ADD_SIGNATURE, compute: 9410, inner: SYSTEM_CPI }),
  run,
  records: {
    title: "Expenses",
    one: "expense",
    empty: "No expenses yet. Add sends `add_expense`.",
    show: (r) => ({ label: `#${r.values.id}`, seeds: `"expense" · your wallet · ${r.values.id}`, fields: [["merchant", String(r.values.merchant)], ["amount", `$${r.values.amount}`]], line: true }),
    send,
    passes: (_s, i, ix, tx) => i === 2 && ix === "delete_expense" && !tx.error,
    args,
    check,
  },
  winVars: (s) => ({ n: String(s.records?.length ?? 0), rent: sol((s.records ?? []).reduce((n, r) => n + r.rent, 0)), deleted: deleted(s) }),
}
