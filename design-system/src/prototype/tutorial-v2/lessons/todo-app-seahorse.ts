import { holds, lineOf, straightQuotes, uncomment } from "../check"
import type { State } from "../store"
import { shortKey } from "./common"
import { SYSTEM_CPI, bytes, inUse, pdaOf, sentSoFar, signatureOf, tooLong } from "./records"
import { GENERATED, SEAHORSE_CHECKS } from "./seahorse"
import type { Lesson, Rec, RecSend, SpecialCheck, Step, Tx } from "./types"

// Todo App Seahorse: a profile account and one account per task, both at PDAs, in Python. Step 1 meets
// `Empty[...]` (the planned failure: `init` on an account typed as one that exists), step 2 numbers each
// task with a counter the profile keeps, step 3 guards a change with `assert` and lets a stranger try.
// After lostin's Todo App Seahorse. The records card with two kinds of rows: the profile and its tasks

/** The program's file: Playground names a Seahorse program after it */
const MAIN = "src/todo_app.py"

const PROGRAM_ID = "YWXXL6A7pNpHXvmBa2EaQAmb2qaLix6mwHaQBPrFbbrZ"
const IDL_ACCOUNT = "Fz7QpL2mWcT9xKvR4nBdY8sHjE3uGa6oNtVk5iMbZqXw"
const PROFILE_PDA = "NhFgtsqwDtGuSptFDaYPo22sJXHDmfPVtoPQ6F7FXDNE"
const TASK_PDAS = ["Xgzgv1XiPti6vj8RsnqDXyCUshN6toSWSp6oBB92AezW", "tiAgufXjPAcc921toi7ap9UxDuxE2HEKZGqeMHbTv94p", "PzWjeuzaTuyZ9bAaZ2xVrCf1rtACAXgo8c4MkaacXsr7"]
/** The key "Try as another wallet" signs with */
const STRANGER = "8SVM5jGU5EjLs8zrAnijQAHy9WFp7SyYBjvFBnUZSNTD"
const PROFILE_SIGNATURE = "5tQwRm8KxZ3bLnP7vYcJ2dHs9GfA4uEoTiNk6WpXyMq1BrCzVa8Ug3LeKd5SjHt7NmQb2YwFx9RvPc4ZoAiE6TnG"

/** Rent: the profile's 41 bytes, a task's 136 (64 of them padding) */
const PROFILE_RENT = 0.0012
const TASK_RENT = 0.0018

/** What the card adds when nothing was typed */
const EXAMPLES = ["Ship the prototype", "Write the docs", "Book the demo", "Water the plants"]

// The program, piece by piece, in the order it sits in todo_app.py

const BOIL = `from seahorse.prelude import *

declare_id('11111111111111111111111111111111')`

const USER_PROFILE = `class UserProfile(Account):
    owner: Pubkey
    last_todo: u8`

const TODO_ACCOUNT = `class TodoAccount(Account):
    owner: Pubkey
    todo: str
    done: bool`

const INIT_DEF = `def init_user_profile(owner: Signer, user_profile: Empty[UserProfile]):`
const INIT_DEF_BROKEN = `def init_user_profile(owner: Signer, user_profile: UserProfile):`

const initFn = (empty: boolean) => `@instruction
${empty ? INIT_DEF : INIT_DEF_BROKEN}
    user_profile = user_profile.init(
        payer=owner,
        seeds=['user_profile', owner]
    )
    user_profile.owner = owner.key()
    print('Profile created')`

const ADD_ASSERT = `    assert owner.key() == user_profile.owner, 'Only the owner can add tasks to this profile'`
const MARK_ASSERT = `    assert owner.key() == todo_account.owner, 'Only the owner of the task can mark as done'`

const addFn = (guarded: boolean) => `@instruction
def add_task(owner: Signer, user_profile: UserProfile, todo_account: Empty[TodoAccount], todo: str):${guarded ? `\n${ADD_ASSERT}` : ""}
    todo_account = todo_account.init(
        payer=owner,
        seeds=['todo_account', owner, user_profile.last_todo],
        padding=64
    )
    todo_account.owner = owner.key()
    todo_account.todo = todo
    print(f'Task {user_profile.last_todo} added')
    user_profile.last_todo += 1`

const MARK_FN = `@instruction
def mark_task_as_done(owner: Signer, todo_account: TodoAccount):
${MARK_ASSERT}
    todo_account.done = True
    print('This todo has been marked as done')`

type Parts = { profile?: boolean; todo?: boolean; init?: "broken" | "fixed"; add?: "open" | "guarded"; mark?: boolean }

/** todo_app.py with the pieces written so far, each in its place: every write is placed by the file as
 * it stands right after it, since the instructions repeat `payer=owner,`, `)` and their prints' shape */
function py(p: Parts) {
  return [BOIL, p.profile && USER_PROFILE, p.todo && TODO_ACCOUNT, p.init && initFn(p.init === "fixed"), p.add && addFn(p.add === "guarded"), p.mark && MARK_FN].filter(Boolean).join("\n\n")
}

const S1 = { profile: true, init: "fixed" } as const
const S2 = { ...S1, todo: true, add: "open" } as const
const PY_BROKEN = py({ ...S1, init: "broken" })
const PY_S1 = py(S1)
const PY_S2 = py(S2)
const PY_S3 = py({ ...S2, add: "guarded", mark: true })

/** The line of `user_profile.init(` in the first build, which the planned failure points at */
const INIT_LINE = PY_BROKEN.split("\n").findIndex((l) => l.includes("user_profile = user_profile.init(")) + 1
/** The `padding=64` line once `add_task` is in, for step 2's quote */
const PADDING_LINE = PY_S2.split("\n").findIndex((l) => l.trim() === "padding=64") + 1

const EXPLAIN_ERROR = `\`user_profile\` is typed \`UserProfile\`: an account that already exists. Those have their fields and \`key()\`, but no \`init\`. Seahorse has to know from the type that this instruction creates the account, so line ${INIT_LINE} stops the build.`

const MAINTAINED =
  "Seahorse hasn't had a release since January 2024. It's a good way into Solana if you know Python; for programs you'll ship, Anchor is the standard."

/** The Rust a build writes from todo_app.py, trimmed to the accounts structs Seahorse makes of your
 * instructions: `Empty[...]` with `.init` becomes Anchor's `init`, payer, seeds and System Program */
function rustOf(src: string): string {
  const code = uncomment(straightQuotes(src))
  const has = (fn: string) => new RegExp(`def\\s+${fn}\\s*\\(`).test(code)
  const init = has("init_user_profile")
    ? `#[derive(Accounts)]
pub struct InitUserProfile<'info> {
    #[account(mut)]
    pub owner: Signer<'info>,
    #[account(
        init,
        space = std::mem::size_of::<dot::program::UserProfile>() + 8,
        payer = owner,
        seeds = ["user_profile".as_bytes().as_ref(), owner.key().as_ref()],
        bump
    )]
    pub user_profile: Box<Account<'info, dot::program::UserProfile>>,
    pub system_program: Program<'info, System>,
}`
    : null
  const add = has("add_task")
    ? `#[derive(Accounts)]
#[instruction(todo: String)]
pub struct AddTask<'info> {
    #[account(mut)]
    pub owner: Signer<'info>,
    #[account(mut)]
    pub user_profile: Box<Account<'info, dot::program::UserProfile>>,
    #[account(
        init,
        space = std::mem::size_of::<dot::program::TodoAccount>() + 8 + 64,
        payer = owner,
        seeds = ["todo_account".as_bytes().as_ref(), owner.key().as_ref(), user_profile.borrow().last_todo.to_le_bytes().as_ref()],
        bump
    )]
    pub todo_account: Box<Account<'info, dot::program::TodoAccount>>,
    pub system_program: Program<'info, System>,
}`
    : null
  const mark = has("mark_task_as_done")
    ? `#[derive(Accounts)]
pub struct MarkTaskAsDone<'info> {
    #[account(mut)]
    pub owner: Signer<'info>,
    #[account(mut)]
    pub todo_account: Box<Account<'info, dot::program::TodoAccount>>,
}`
    : null
  return [
    "// Seahorse wrote this from todo_app.py on your last build. Read only: edit todo_app.py instead.\n// Trimmed to the accounts structs: the handlers, imports and Seahorse's helper module are left out.",
    init,
    add,
    mark,
  ]
    .filter(Boolean)
    .join("\n\n")
}

/** The `init,` Seahorse wrote for the profile, for step 2's quote */
const GENERATED_INIT_LINE = rustOf(PY_S1).split("\n").findIndex((l) => l.trim() === "init,") + 1

const UPGRADES = `Upgrades ${shortKey(PROGRAM_ID).replace("…", "…⁠")} in place · from your wallet`

const STEPS: Step[] = [
  {
    id: "profile",
    title: "Profile",
    short: "Profile",
    objective: "Create a profile account at a PDA, in Python",
    learned: "An account the instruction creates is typed Empty[...], and .init makes it at a PDA",
    file: MAIN,
    start: "",
    target: PY_S1,
    goal: "build",
    beats: [
      {
        kind: "write",
        id: "s1.boil",
        text: "A Seahorse program is Python: one import brings in Solana's types, and `declare_id` holds the program's id. They're routine, so I've written them.",
        writes: { file: MAIN, block: BOIL, ref: py({}) },
      },
      {
        kind: "write",
        id: "s1.data",
        text: "Your profile is an account: a class that extends `Account`, with typed fields. It keeps its owner and `last_todo`, the number the next task gets.",
        writes: { file: MAIN, block: USER_PROFILE, ref: py({ profile: true }) },
      },
      {
        kind: "write",
        id: "s1.fn",
        text: "`init_user_profile` creates it. `.init` takes who pays the rent and the seeds, `'user_profile'` and your key, so every wallet gets one profile at its own address.",
        writes: { file: MAIN, block: initFn(false), ref: PY_BROKEN },
      },
      {
        kind: "act",
        id: "s1.build",
        act: "build",
        say: "Seahorse compiles this to Anchor, then builds it. Let's see.",
        title: "Build todo_app.py",
        context: "Compiles Python to Anchor, then builds it",
        button: "Build",
      },
    ],
    planned: "This one's on purpose. Everyone's first Seahorse account trips on it, so let's meet it now.",
    plannedShort: `Line ${INIT_LINE} calls \`init\` on a \`UserProfile\`, and only a new account has \`init\`.`,
    onFail: [
      { kind: "say", id: "f1.explain", text: EXPLAIN_ERROR, quote: { file: MAIN, line: INIT_LINE, mark: "user_profile.init", tone: "error" } },
      {
        kind: "ask",
        id: "f1.q",
        kicker: "Fix it",
        question: "So how do you tell Seahorse the profile doesn't exist yet?",
        options: ["Call `UserProfile()` to make a new one", "Type the parameter `Empty[UserProfile]`", "Add `system_program: Program` to the parameters"],
        code: false,
        answer: 1,
        right: "Yes. `Empty` marks an account this instruction creates, and gives it `init`. Seahorse turns it into Anchor's `init`, System Program included.",
        why: [
          "Accounts aren't made like Python objects. The System Program creates them, and Seahorse calls it when the type says so.",
          null,
          "Seahorse adds the System Program by itself when an account is created. What it can't tell is that `user_profile` is new.",
        ],
        hint: "Seahorse reads what an account is from its type. Which type means 'not created yet'?",
        writes: { file: MAIN, block: INIT_DEF, start: PY_BROKEN },
        key: INIT_DEF,
        typed: "That's it: `Empty` gives the profile its `init`.",
      },
      {
        kind: "act",
        id: "f1.build",
        act: "build",
        say: "Build again.",
        title: "Build todo_app.py",
        context: "Same build, now with `Empty`",
        button: "Build",
      },
    ],
    win: {
      id: "s1.win",
      headline: "Your Python compiles to Anchor",
      line: "Seahorse turned todo_app.py into an Anchor program, and the build wrote its IDL: `init_user_profile`.",
      stats: [
        { icon: "hammer", text: "Built in 2.4 s" },
        { icon: "braces", text: "1 instruction" },
        { icon: "clock", text: "{took}" },
      ],
    },
    explainStep: "This step writes your profile account and `init_user_profile`, which creates it at a PDA. The first build fails on purpose: Seahorse needs the type to say the account is new.",
    chips: [
      {
        label: "What is Seahorse?",
        match: /\bseahorse\b/i,
        answer: "A Python front end for Anchor. You write the program as typed Python; Seahorse compiles it to an Anchor program in Rust, and that is what gets built and deployed.",
      },
      {
        label: "How big is the profile?",
        match: /\b(size|big|bytes|rent)\b/i,
        answer: "Seahorse sizes it from the Rust struct it writes: 32 bytes of owner, 1 of `last_todo`, plus Anchor's 8 byte tag. 41 bytes, about 0.0012 SOL of rent.",
      },
    ],
    errorChips: [
      {
        label: "Where's the System Program?",
        match: /system[_ ]?program/i,
        answer: "Seahorse adds it whenever an `Empty` account is initialized: you never list it.",
      },
      {
        label: "Where is this in the docs?",
        match: /\b(docs?|documentation)\b/i,
        answer: "The Seahorse docs cover it under Accounts, in the part on `Empty`: an account an instruction initializes.",
      },
    ],
    answers: [
      { match: /why.*(fail|error)/i, answer: EXPLAIN_ERROR, local: true },
      { match: /maintain|still (alive|used|supported)|deprecated|abandon/i, answer: MAINTAINED },
    ],
  },
  {
    id: "tasks",
    title: "Tasks",
    short: "Tasks",
    objective: "Give every task its own account, numbered by your profile",
    learned: "Many accounts numbered by a counter kept in another account",
    file: MAIN,
    start: PY_S1,
    target: PY_S2,
    goal: "move",
    beats: [
      {
        kind: "say",
        id: "s2.rust",
        text: "Here's what Seahorse made of `.init` on your last build: Anchor's `init`, with the payer, the seeds and the System Program. You never edit this Rust: change todo_app.py and the next build writes it again.",
        quote: { file: GENERATED, line: GENERATED_INIT_LINE, tone: "lit", generated: true },
      },
      {
        kind: "write",
        id: "s2.data",
        text: "A task is an account too: who owns it, its text, and whether it's done.",
        writes: { file: MAIN, block: TODO_ACCOUNT, ref: py({ ...S1, todo: true }) },
      },
      {
        kind: "say",
        id: "s2.why",
        text: "Each task needs an address of its own, so its seeds have to differ from task to task. `'todo_account'` and your key are the same every time.",
      },
      {
        kind: "ask",
        id: "s2.q1",
        kicker: "Question",
        n: 1,
        question: "What should make each task's address different?",
        options: ["The task's text", "The time it was added", "A number your profile hands out, `last_todo`"],
        code: false,
        answer: 2,
        right: "Yes. The profile counts your tasks, so task 0, 1 and 2 each get an address, and an app finds them all by counting up to `last_todo`. I've written `add_task`.",
        why: [
          "Two tasks with the same text would collide, and a seed holds 32 bytes at most: a longer task wouldn't fit.",
          "Your app couldn't find a task again without knowing the exact second. Seeds should be things you can work out.",
          null,
        ],
        hint: "Your profile already keeps a number that changes with every task.",
        writes: { file: MAIN, block: addFn(false), ref: PY_S2 },
        key: "seeds=['todo_account', owner, user_profile.last_todo],",
        typed: "That's the seed. I've written the rest of `add_task` around it: it counts `last_todo` up after each task.",
      },
      {
        kind: "say",
        id: "s2.padding",
        text: "One more line in `add_task`: `padding=64`. Seahorse sizes an account from its Rust struct, where a string takes 24 bytes whatever it holds, so without padding a task fits about 26 characters. 64 more bytes give the text room.",
        // The whole init call: padding=64 alone didn't say what it pads (Almaz, 10 Nov)
        quote: { file: MAIN, line: PADDING_LINE, tone: "lit", around: [3, 1] },
      },
      {
        kind: "act",
        id: "s2.deploy",
        act: "deploy",
        say: "Your program is built. Deploy it and you can make your profile.",
        title: "Deploy to devnet",
        context: "From your Playground wallet · free devnet SOL",
        button: "Deploy",
      },
      {
        kind: "act",
        id: "s2.profile",
        act: "send",
        ix: "init_user_profile",
        say: "Create your profile.",
        title: "Create your profile",
        context: "Sends `init_user_profile` · about 0.0012 SOL of rent",
        button: "Create",
        record: "Created your profile",
      },
      {
        kind: "act",
        id: "s2.add",
        act: "move",
        say: "Now add two tasks.",
        title: "Add a task",
        context: "Sends `add_task` · about 0.0018 SOL of rent",
        button: "Add",
        moves: [{ ix: "add_task", button: "Add task", fields: [{ name: "todo", label: "Task", kind: "text", max: 64 }] }],
        record: "Added tasks",
      },
    ],
    win: {
      id: "s2.win",
      headline: "Every task has its own address",
      line: "Task 0 and task 1 sit at two addresses, and your profile's `last_todo` says which number comes next.",
      stats: [
        { icon: "braces", text: "2 tasks" },
        { icon: "coins", text: "Rent 0.0049 SOL" },
        { icon: "clock", text: "{took}" },
      ],
      extra: "openTest",
    },
    testWin: "You added tasks from the Call panel, each at the address its number gives.",
    explainStep: "This step adds task accounts, each at an address from your profile's `last_todo`, and `add_task`, which counts it up. Then you create your profile and two tasks on devnet.",
    chips: [
      {
        label: "What if a task is longer?",
        match: /longer|long|padding/i,
        answer: "Past about 91 bytes the account can't hold it, and the call comes back `AccountDidNotSerialize`, error 3004. The card stops you at 64; the Call panel lets you try.",
      },
      {
        label: "How does an app list my tasks?",
        match: /\b(list|find|all)\b/i,
        answer: "It reads `last_todo` from your profile, then works out the addresses for 0 up to it, from the same seeds.",
      },
    ],
    answers: [{ match: /maintain|still (alive|used|supported)|deprecated|abandon/i, answer: MAINTAINED }],
  },
  {
    id: "done",
    title: "Done",
    short: "Done",
    objective: "Mark a task done, and only yours",
    learned: "A change guarded in code: assert checks the owner",
    file: MAIN,
    start: PY_S2,
    target: PY_S3,
    goal: "move",
    beats: [
      {
        kind: "say",
        id: "s3.why",
        text: "Marking a task done is one line, `done = True`. But anyone can send `mark_task_as_done` with any task account they like, yours included, and nothing in the accounts says whose task it is.",
      },
      {
        kind: "ask",
        id: "s3.q2",
        kicker: "Question",
        n: 2,
        question: "What stops a stranger marking your task done?",
        options: [
          "assert owner.key() == todo_account.owner, 'Only the owner of the task can mark as done'",
          "owner: Signer",
          "if owner.key() != todo_account.owner: print('Not yours')",
        ],
        code: true,
        answer: 0,
        right: "Right. `assert` compares the signer with the task's `owner` and stops the instruction when they differ. I've written `mark_task_as_done`, and put the same check on your profile in `add_task`.",
        why: [null, "`Signer` proves who signed, not that they own this task. A stranger signs too.", "That logs a line and carries on: the task still gets marked done."],
        hint: "The task stores its owner. Compare it with whoever signed, and stop if they differ.",
        writes: { file: MAIN, block: `${addFn(true)}\n\n${MARK_FN}`, ref: PY_S3 },
        key: "assert owner.key() == todo_account.owner, 'Only the owner of the task can mark as done'",
        typed: "That's the guard. I've written the rest.",
      },
      {
        kind: "act",
        id: "s3.ship",
        act: "buildDeploy",
        say: "Build and deploy. Your profile and tasks stay as they are.",
        title: "Build and deploy",
        context: UPGRADES,
        button: "Build and deploy",
      },
      {
        kind: "act",
        id: "s3.done",
        act: "move",
        say: "Mark one of your tasks done.",
        title: "Mark a task done",
        context: "Sends `mark_task_as_done` · fee from your wallet",
        button: "Mark done",
        moves: [{ ix: "mark_task_as_done", button: "Mark done", row: "Task" }],
        record: "Marked a task done",
      },
      {
        kind: "act",
        id: "s3.stranger",
        act: "move",
        // One button on the card, not one a row: which task doesn't matter, and two alike buttons under
        // the list read as the step before's. The say tells the refusal is the point (Almaz, 10 Nov)
        say: "Now try it as someone else. I'll sign with a new key as `owner`, and your wallet pays the fee. If your `assert` works, the call is refused.",
        title: "Try as another wallet",
        context: `Signs with a new key \`${shortKey(STRANGER)}\` · marks one of your tasks done`,
        button: "Try as another wallet",
        moves: [{ ix: "mark_task_as_done", button: "Try as another wallet", signer: "stranger" }],
        record: "Tried as another wallet",
      },
    ],
    win: {
      id: "s3.win",
      headline: "Only you can tick your tasks",
      line: "The stranger's call came back refused with your `assert`'s message, and the task stayed as it was.",
      stats: [
        { icon: "alert", text: "Refused" },
        { icon: "braces", text: "3 instructions" },
        { icon: "clock", text: "{took}" },
      ],
    },
    testWin: "You marked a task done from the Call panel. Try it with another task's address, as someone else, and it's refused.",
    explainStep: "This step adds `mark_task_as_done`, guarded by an `assert` on the task's owner, then marks one of your tasks and lets a stranger try.",
    chips: [
      {
        label: "Why no error number?",
        match: /number|code|error/i,
        answer: "Seahorse turns `assert` into a panic, so the call fails with the message in the log and no number. Anchor's `require!` would return a named error, 6000 and up.",
      },
      {
        label: "Can I delete a task?",
        match: /delete|close|remove/i,
        answer: "Not in Seahorse: it has no way to close an account, so a task keeps its rent. In Anchor that's `close`, as in Expense Tracker.",
      },
    ],
    answers: [{ match: /maintain|still (alive|used|supported)|deprecated|abandon/i, answer: MAINTAINED }],
  },
]

/** A Seahorse compiler error, as the terminal prints it: the error, where, the line, and its help */
export function seahorseError(c: Parameters<SpecialCheck>[0], line: number, column: number, span: number, error: string, help: string, reason: string, explain: string, planned = false) {
  const row = c.code.split("\n")[line - 1]?.trimEnd() ?? ""
  return {
    ok: false as const,
    planned,
    line,
    column,
    span,
    log: [...c.head, `Error: ${error}`, ` --> ${c.file}:${line}:${column}`, `${line} | ${row}`, `Help: ${help}`, `${c.failed}: Seahorse compile failed`],
    reason: `${c.failed}: ${reason}`,
    explain,
  }
}

/** `.init` on a parameter typed as an account that exists: only `Empty[...]` has `init` */
export const initWithoutEmpty: SpecialCheck = (c) => {
  const rows = c.bare.split("\n")
  for (const [i, row] of rows.entries()) {
    const def = row.match(/^\s*def\s+\w+\s*\(([^)]*)\)/)
    if (!def) continue
    for (const part of def[1].split(",")) {
      const [name, type] = part.split(":").map((x) => x.trim())
      if (!name || !type || /^Empty\[/.test(type) || !/^[A-Z]\w*$/.test(type) || ["Signer", "UncheckedAccount", "Program", "Pubkey"].includes(type)) continue
      // The function's body: the lines under it, up to the next line at the left edge
      const end = rows.findIndex((r, k) => k > i && r.trim() !== "" && !/^\s/.test(r))
      const at = rows.slice(i + 1, end === -1 ? undefined : end).findIndex((r) => new RegExp(`\\b${name}\\.init\\(`).test(r))
      if (at === -1) continue
      const line = i + 2 + at
      const column = rows[line - 1].indexOf(`${name}.init`) + 1
      return seahorseError(
        c,
        line,
        column,
        `${name}.init`.length,
        `attribute not found: ${type}."init".`,
        `an account this instruction creates is typed \`Empty[${type}]\`.`,
        `line ${line} calls \`init\` on a \`${type}\`, which has no \`init\`.`,
        `\`${name}\` is typed \`${type}\`: an account that already exists. Those have their fields and \`key()\`, but no \`init\`. Type it \`Empty[${type}]\` on line ${i + 1} so Seahorse knows this instruction creates it.`,
        true
      )
    }
  }
  return null
}

/** `owner` stored where a `Pubkey` goes: the field wants the key, not the signer */
const ownerWithoutKey: SpecialCheck = (c) => {
  const line = c.bare.split("\n").findIndex((r) => /\.owner\s*=\s*owner\s*$/.test(r)) + 1
  if (!line) return null
  const column = c.bare.split("\n")[line - 1].indexOf("owner =") + 1
  return seahorseError(
    c,
    line,
    column,
    "owner".length,
    "type mismatch: expected Pubkey, found Signer.",
    "store the signer's key: `owner.key()`.",
    `line ${line} stores a \`Signer\` in a \`Pubkey\` field.`,
    "The account's `owner` field holds a `Pubkey`, and `owner` is the `Signer` itself. `owner.key()` is its key, which is what the field stores."
  )
}

const CHECKS: SpecialCheck[] = [initWithoutEmpty, ...SEAHORSE_CHECKS, ownerWithoutKey]

// ---- The profile and its tasks: what the program does with them, worked out the way it would

const profileOf = (s: State) => s.records?.find((r) => r.id === "profile") ?? null
const tasksOf = (s: State) => (s.records ?? []).filter((r) => r.kind === "Task")

/** Whether the program on devnet checks the task's owner */
const guarded = (s: State) => s.deployedLib !== null && holds(s.deployedLib, MARK_ASSERT)

/** The task a call without a row acts on: the first not done, else the first */
const defaultTask = (s: State) => tasksOf(s).find((t) => !t.values.done) ?? tasksOf(s)[0] ?? null

function args(s: State, ix: string): Record<string, string> {
  if (ix === "add_task") return { todo: EXAMPLES[tasksOf(s).length % EXAMPLES.length] }
  return {}
}

/** One send, from a card or the Call panel, answered as devnet would: a second profile is already in
 * use, a task past what its account holds can't be saved, and a stranger's mark panics on the assert */
function send(s: State, ix: string, given?: Record<string, string>, row?: string, signer?: "stranger"): RecSend | { note: string } {
  const records = s.records ?? []
  const profile = profileOf(s)
  const signature = records.length === 0 ? PROFILE_SIGNATURE : signatureOf(sentSoFar(s) + 60)
  if (ix === "init_user_profile") {
    if (profile) return { tx: inUse("init_user_profile", PROFILE_PDA, signature), records, refused: "Already in use · your profile stayed as it was" }
    const rec: Rec = { id: "profile", kind: "Profile", pda: PROFILE_PDA, values: { last_todo: 0 }, rent: PROFILE_RENT }
    return { tx: { instruction: "init_user_profile", said: "Profile created", signature, compute: 7120, inner: SYSTEM_CPI }, records: [rec, ...records] }
  }
  if (ix === "add_task") {
    if (!profile) return { note: "Create your profile first, with `init_user_profile`." }
    const todo = given?.todo ?? args(s, ix).todo
    if (bytes(todo) > 91) return { tx: tooLong("add_task", signature, "todo_account"), records, refused: "AccountDidNotSerialize · 3004 · the task is past what its account holds" }
    const n = Number(profile.values.last_todo)
    const task: Rec = { id: `task-${n}`, kind: "Task", pda: TASK_PDAS[n] ?? pdaOf(n + 100), values: { index: n, todo, done: false }, rent: TASK_RENT }
    const tx: Tx = { instruction: "add_task", said: `Task ${n} added`, signature, compute: 11240, inner: SYSTEM_CPI }
    return { tx, records: [...records.map((r) => (r === profile ? { ...r, values: { ...r.values, last_todo: n + 1 } } : r)), task] }
  }
  if (ix === "mark_task_as_done") {
    const task = (row ? records.find((r) => r.id === row) : null) ?? defaultTask(s)
    if (!task) return { note: "Add a task first, with `add_task`." }
    if (signer === "stranger" && guarded(s)) {
      // Seahorse compiles the assert to a panic! in the Rust it writes, so the log names that file, not the .py
      const line = lineOf(s.deployedLib ?? "", "assert owner.key() == todo_account.owner")
      const message = "Only the owner of the task can mark as done"
      const tx: Tx = { instruction: ix, said: "", signature, compute: 2870, error: { name: "Panic", number: 0, message, line, log: [`Program log: panicked at src/dot/program.rs:131:13: ${message}`], failed: "SBF program panicked" } }
      return { tx, records, refused: `Refused · ${message}` }
    }
    if (signer !== "stranger" && task.values.done) return { note: `Task #${task.values.index} is already done.` }
    const tx: Tx = { instruction: ix, said: "This todo has been marked as done", signature, compute: 3910 }
    return { tx, records: records.map((r) => (r === task ? { ...r, values: { ...r.values, done: true } } : r)) }
  }
  return { note: "That call has no card here." }
}

/** Step 2 passes on the second task, step 3 on the stranger refused */
const passes = (s: State, i: number, ix: string, tx: Tx) => (i === 1 ? ix === "add_task" && !tx.error && tasksOf(s).length >= 2 : i === 2 ? ix === "mark_task_as_done" && !!tx.error : false)

export const TODO_APP_SEAHORSE: Lesson = {
  card: { slug: "todo-app-seahorse", name: "Todo App Seahorse", level: "Beginner", framework: "Seahorse", ext: "jpg" },
  minutes: 10,
  by: "lostin",
  program: "todo_app",
  line: "Keep a todo list on chain in Python, one account per task",
  intro: "You'll build a todo list on chain in Python: a profile that counts your tasks, one account per task at its own address, and a check that only you can tick them.",
  proof: "Program log: Task 0 added",
  badge: "Todo list on chain",
  headline: "You built a todo list in Python on chain",
  proofLine: (_tx, s) => `${tasksOf(s).length} tasks on devnet, ${tasksOf(s).filter((t) => t.values.done).length} done, each at its own address, and only your wallet can tick them.`,
  // The next Seahorse Beginner one: two players and a board, on top of this one's assert
  next: "tictactoe-seahorse",
  nextLine: "Tic-tac-toe Seahorse is a good next one: two players take turns on one board account, with enums and asserts deciding who may move.",
  steps: STEPS,
  // No client: every call goes from the card or the Call panel. The generated Rust fills on the first build
  files: { [MAIN]: "", [GENERATED]: "" },
  preview: PY_S3,
  programId: PROGRAM_ID,
  idlAccount: IDL_ACCOUNT,
  txSignature: PROFILE_SIGNATURE,
  checks: CHECKS,
  story: false,
  main: MAIN,
  generated: { file: GENERATED, of: rustOf },
  runTx: () => ({ instruction: "init_user_profile", said: "Profile created", signature: PROFILE_SIGNATURE, compute: 7120, inner: SYSTEM_CPI }),
  records: {
    title: "Todo list",
    one: "account",
    empty: "No profile yet. Create sends `init_user_profile`.",
    show: (r) =>
      r.kind === "Profile"
        ? { label: "Profile", seeds: "'user_profile' · your wallet", fields: [["last_todo", String(r.values.last_todo)]] }
        : { label: `#${r.values.index}`, seeds: `'todo_account' · your wallet · ${r.values.index}`, fields: [["todo", String(r.values.todo)], ["done", r.values.done ? "✓ done" : "○ not done"]], line: true },
    send,
    passes,
    args: (s, ix) => args(s, ix),
    check: () => null,
  },
}
