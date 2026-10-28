import { helloSays, lineOf } from "../check"
import type { State } from "../store"
import { CLIENT, LIB, shortKey } from "./common"
import type { Lesson, SpecialCheck, Step, Tx } from "./types"

// Hello Anchor: write a program with one instruction, deploy it, call it, then call it with your name

// The pieces step 1 writes, in the order it writes them: the two routine lines, the module with
// hello, then the struct the first build asks for
const BOIL = `use anchor_lang::prelude::*;

declare_id!("11111111111111111111111111111111");`

const MODULE = `#[program]
mod hello_anchor {
    use super::*;

    pub fn hello(_ctx: Context<Hello>) -> Result<()> {
        msg!("Hello, World!");
        Ok(())
    }
}`

const STRUCT = `#[derive(Accounts)]
pub struct Hello {}`

// Step 1, first try: hello asks for Context<Hello>, but Hello is missing
const LIB_BROKEN = `${BOIL}

${MODULE}`

const LIB_FIXED = `${LIB_BROKEN}

${STRUCT}`

const NAMED = `    pub fn hello(_ctx: Context<Hello>, name: String) -> Result<()> {
        msg!("Hello, {}!", name);`

const LIB_NAMED = LIB_FIXED.replace(
  `    pub fn hello(_ctx: Context<Hello>) -> Result<()> {
        msg!("Hello, World!");`,
  NAMED
)

const CLIENT_CALL = `// Call the hello instruction
const txHash = await pg.program.methods.hello().rpc();
console.log(\`Use 'solana confirm -v \${txHash}' to see the logs\`);`

const PROGRAM_ID = "9hJqVkRZ3t2nX8cPfLwA5mYbE7sGdT4uK1oNjQzWxCvB"

const TX_SIGNATURE = "4sGjMW1sUnHzSxGspuhpqLDx6wiyjNtZAMdL4VZHirAn"

/** The call with a name on step 4 is a transaction of its own, so it has its own signature */
const NAMED_TX_SIGNATURE = "3vZp8LmQx2RkT9sWcYfN4hJdA6uE1oGbV7nKtXqPzLyM"

const EXPLAIN_ERROR =
  "Line 9 asks for `Context<Hello>`: the accounts `hello` works with, described by a type called `Hello`. That type doesn't exist yet, so the compiler stops. `hello` reads no accounts, so the type can be empty. The fix goes at the bottom of lib.rs."

const STEPS: Step[] = [
  {
    id: "write-program",
    title: "Program",
    short: "Program",
    objective: "Define the hello instruction and log a message",
    learned: "Declaring a program and its instructions",
    file: LIB,
    start: "",
    target: LIB_FIXED,
    goal: "build",
    beats: [
      {
        kind: "write",
        id: "s1.boil",
        text: "Every Anchor program opens with the same two lines: the import and the program's id. They're routine, so I've written them.",
        writes: { file: LIB, block: BOIL },
      },
      {
        kind: "say",
        id: "s1.what",
        text: "A program does its work in instructions: functions inside a module marked `#[program]`. Yours is `hello`. I'll put the module under those two lines, and you pick its one line of code. A program on Solana has no terminal: the only place it can write is the program log, which comes back with every transaction.",
      },
      {
        kind: "ask",
        id: "s1.q1",
        kicker: "Question",
        n: 1,
        question: "Which line writes to the program log?",
        options: ['println!("Hello, World!");', 'msg!("Hello, World!");', 'console.log("Hello, World!");'],
        code: true,
        answer: 1,
        right: "Yes. `msg!` writes to the program log. I've put `hello` in the `#[program]` module, under the two lines.",
        why: [
          "`println!` prints to a terminal, and a program on Solana has none. On chain, a program talks through `msg!`.",
          null,
          "That's TypeScript, and you'll use it in the client in step 3. Inside a Rust program the log line comes from `msg!`.",
        ],
        hint: "Think about where each line would print. A program on Solana runs on a validator, with no terminal and no console.",
        writes: { file: LIB, block: MODULE },
        typed: "That's the line. `msg!` writes to the program log. I've put `hello` and the `#[program]` module around it.",
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
    planned: "This one's on purpose. Every Anchor developer meets this error once, so let's meet it now.",
    plannedShort: "Line 9 asks for `Context<Hello>`, and `Hello` doesn't exist yet.",
    onFail: [
      { kind: "say", id: "f1.explain", text: EXPLAIN_ERROR, quote: { file: LIB, line: 9, mark: "Hello", tone: "error" } },
      {
        kind: "ask",
        id: "f1.q2",
        kicker: "Fix it",
        question: "So what does `Context<Hello>` need?",
        options: ["A `Hello` account on devnet", "An import of `Hello` from Anchor", "A struct `Hello` with `#[derive(Accounts)]`"],
        code: false,
        answer: 2,
        right: "Exactly. `#[derive(Accounts)]` tells Anchor which accounts an instruction expects. I've added an empty one at the bottom.",
        why: [
          "`Hello` does describe accounts, but it's a type in your code. The compiler needs it before anything reaches devnet.",
          "`Hello` isn't part of Anchor. It's yours to declare: the list of accounts `hello` reads.",
          null,
        ],
        hint: "The compiler wants a type in your own code that lists accounts.",
        writes: { file: LIB, block: STRUCT },
        // The line that is the fix: a struct without it doesn't list accounts, and the build says so
        key: "#[derive(Accounts)]",
        typed: "That's the line that fixes it: `#[derive(Accounts)]` tells Anchor the struct under it lists accounts. I've put the empty `Hello` under it.",
      },
      {
        kind: "act",
        id: "f1.build",
        act: "build",
        say: "Build again. This time it should pass.",
        title: "Build lib.rs",
        context: "Same build, now with the `Hello` struct",
        button: "Build",
      },
    ],
    win: {
      id: "s1.win",
      headline: "Your program compiles.",
      line: "The build also made its IDL: one instruction, `hello`. That's what clients will call.",
      stats: [
        { icon: "hammer", text: "Built in 1.6 s" },
        { icon: "braces", text: "1 instruction" },
        { icon: "clock", text: "{took}" },
      ],
    },
    explainStep:
      "This step writes the smallest Anchor program there is: one instruction, `hello`, that writes a line to the program log. I explain a piece, you pick the right line, and I write it in. Then the build checks it.",
    chips: [
      {
        label: "What is a Context?",
        match: /\bcontext\b/i,
        answer:
          "`Context<T>` is what Anchor hands an instruction when it's called: the accounts listed in the struct `T`, already checked, and the program id. `hello` reads no accounts, so its struct can stay empty.",
      },
      {
        label: "What does msg! do?",
        match: /\bmsg\b/i,
        answer:
          "`msg!` writes a line to the program log, the way `println!` prints in plain Rust. The line shows up in the transaction's logs, which you'll read after the client calls `hello`.",
      },
    ],
    errorChips: [
      {
        label: "Why does hello need a struct?",
        match: /\b(derive|struct)\b/i,
        answer:
          "Without `#[derive(Accounts)]` Anchor can't tell which accounts an instruction expects, so it can't generate the code that checks them. An instruction that reads no accounts still needs the struct. It's just empty.",
      },
      {
        label: "Where is this in the docs?",
        match: /\b(docs?|documentation)\b/i,
        answer:
          "The Anchor docs cover it in [Program Structure](https://www.anchor-lang.com/docs/basics/program-structure#deriveaccounts-macro), in the section on `#[derive(Accounts)]`.",
      },
    ],
    answers: [
      {
        match: /declare_id/i,
        answer: "`declare_id!` sets the address the program checks every call against. Playground puts in the real one when you deploy.",
      },
      { match: /why.*(fail|error)/i, answer: EXPLAIN_ERROR, local: true },
    ],
  },
  {
    id: "deploy",
    title: "Build & Deploy",
    short: "Deploy",
    objective: "Deploy the program to devnet",
    learned: "Deploying with free devnet SOL",
    file: LIB,
    start: LIB_FIXED,
    target: LIB_FIXED,
    goal: "deploy",
    beats: [
      {
        kind: "say",
        id: "s2.why",
        text: "Right now your program is only a build: Playground compiled it, but nobody can call it yet. Deploying uploads it to devnet, Solana's public test network, where anyone can call it. It costs devnet SOL, test money with no value, and Playground tops your wallet up for free when it runs low. Before you press Deploy, a guess.",
      },
      {
        // A prediction, not a pick that writes: the deploy that follows shows the answer, and step 4
        // leans on it ("the program keeps its address")
        kind: "ask",
        id: "s2.q2",
        kicker: "Question",
        n: 2,
        question: "What does a deploy give your program, so clients can find it?",
        options: ["An address: its program id", "A URL where it runs", "A copy of lib.rs on devnet"],
        code: false,
        answer: 0,
        right: "Yes. Every program lives at an address, its program id. Watch for it when the deploy lands.",
        why: [
          null,
          "A program isn't a web server, so there's no URL. Clients find it by its address and send it transactions.",
          "Devnet keeps the compiled program, not your source. What clients need from it is its address.",
        ],
        hint: "Clients don't browse to a program. They send transactions to it. To what?",
        skipped: "No problem. A deploy gives your program an address, its program id. Watch for it.",
      },
      {
        kind: "act",
        id: "s2.deploy",
        act: "deploy",
        say: "Press Deploy and watch for the program id.",
        title: "Deploy to devnet",
        context: "From your Playground wallet · free devnet SOL",
        button: "Deploy",
      },
    ],
    win: {
      id: "s2.win",
      headline: "Your program is live on devnet.",
      line: "Its IDL also gave you the Call panel: a form for every instruction. You'll use it in a moment.",
      stats: [
        { icon: "rocket", text: "Live on devnet" },
        { icon: "coins", text: "Free devnet SOL" },
        { icon: "braces", text: "Call panel added" },
      ],
      extra: "openTest",
    },
    explainStep:
      "Deploying puts your built program on devnet, Solana's public test network, at an address of its own: the program id. It's paid from your Playground wallet in free devnet SOL. Press Deploy and wait for the id.",
    chips: [
      {
        label: "What is devnet?",
        match: /\bdevnet\b(?! sol)/i,
        answer: "Devnet is Solana's public network for testing. It behaves like mainnet, but its SOL has no value.",
      },
      {
        label: "What is devnet SOL?",
        match: /\b(devnet sol|test sol|airdrop|faucet|wallet)\b/i,
        answer:
          "Devnet is Solana's public test network. Its SOL is free and worth nothing, so you can deploy and call as much as you like. Playground keeps your wallet topped up from the devnet faucet.",
      },
    ],
  },
  {
    id: "call-client",
    title: "Client",
    short: "Client",
    objective: "Call the instruction from the TypeScript client",
    learned: "Calling a program from TypeScript",
    file: CLIENT,
    start: "",
    target: CLIENT_CALL,
    goal: "run",
    beats: [
      {
        kind: "write",
        id: "s3.file",
        text: "A client is code outside your program that sends it transactions, like the app your users will open. I've made `client/client.ts` for it.",
        writes: { create: CLIENT },
      },
      {
        kind: "say",
        id: "s3.pg",
        text: "In Playground, `pg.program` already knows your program from its IDL: `pg.program.methods` has one method per instruction. Calling one only builds the call; something still has to send it. Your line goes at the top of client.ts.",
      },
      {
        kind: "ask",
        id: "s3.q3",
        kicker: "Question",
        n: 3,
        question: "Which line sends `hello` to devnet?",
        options: ["await pg.program.hello().rpc()", "await pg.program.methods.hello()", "await pg.program.methods.hello().rpc()"],
        code: true,
        answer: 2,
        right: "Right. `.methods.hello()` builds the call and `.rpc()` sends it, then hands back the transaction's signature. I've added a line that prints it.",
        why: [
          "Close. Instructions live under `.methods`, not on `pg.program` itself.",
          "That builds the call but never sends it. `.rpc()` does the sending.",
          null,
        ],
        hint: "Instructions live under `.methods`, and something has to send the call.",
        writes: { file: CLIENT, block: CLIENT_CALL },
        typed: "That's the line. `.methods.hello()` builds the call and `.rpc()` sends it. I've added the comment above it and a line under it that prints the signature.",
      },
      {
        kind: "act",
        id: "s3.run",
        act: "run",
        say: "Run it and watch what comes back.",
        title: "Run client.ts",
        context: "Sends one transaction to devnet · fee from your wallet",
        button: "Run",
      },
    ],
    win: {
      id: "s3.win",
      headline: "Your program answered from devnet.",
      line: "That `Hello, World!` is the `msg!` line from lib.rs, coming back in the transaction's logs. The Call panel makes the same call without code.",
      stats: [
        { icon: "cpu", text: "1,042 CU" },
        { icon: "timer", text: "~0.4 s" },
        { icon: "coins", text: "0.000005 SOL fee" },
      ],
      extra: "openTest",
    },
    testWin: "You called `hello` from the Call panel, which Playground built from the IDL. In code, the same call is one line.",
    explainStep:
      "A client is code outside the program that sends it transactions. Here it's one line of TypeScript in `client.ts`. You can also call `hello` from the Call panel, no code needed.",
    chips: [
      {
        label: "What is pg?",
        match: /\bpg\b/i,
        answer: "`pg` is Playground's global with your program, wallet and connection already set up. `pg.program` knows `hello` from the IDL the build produced.",
      },
      {
        label: "What's an IDL?",
        match: /\bidls?\b/i,
        answer:
          "The IDL is your program's interface, written by the build: its instructions, their arguments and accounts. Clients read it to know how to call you, and the Call panel is built from it.",
        follow: "openTest",
      },
      {
        label: "Can I call it without code?",
        match: /without code|\bcall panel\b/i,
        answer: "Yes. After the deploy, the Call panel has a form for each instruction. Fill the arguments and press Call hello.",
        follow: "openTest",
      },
    ],
    answers: [{ match: /\brpc\b/i, answer: "`.rpc()` signs and sends the transaction, waits for devnet to confirm it and returns its signature." }],
  },
  {
    id: "greet-by-name",
    title: "Name argument",
    short: "Name",
    objective: "Give hello a name argument and log it",
    learned: "Passing arguments to an instruction",
    file: LIB,
    start: LIB_FIXED,
    target: LIB_NAMED,
    goal: "call",
    beats: [
      {
        kind: "say",
        id: "s4.why",
        text: "`hello` greets everyone the same way. Let's make it greet you. Anchor hands every instruction its `Context` first; anything the caller sends, like a name, is a plain argument. I'll change `hello`'s first line, line 9.",
      },
      {
        kind: "ask",
        id: "s4.q4",
        kicker: "Question",
        n: 4,
        question: "Where does `name` go?",
        options: ["struct Hello { name: String }", "fn hello(_ctx: Context<Hello>, name: String)", "fn hello(name: String, _ctx: Context<Hello>)"],
        code: true,
        answer: 1,
        right: "Yes. The `Context` comes first, then your own arguments. I've also put `name` in the log line: `msg!` fills `{}` with it.",
        why: [
          "`Hello` lists the accounts `hello` reads, not values the caller sends. A name is plain data, so it's an argument.",
          null,
          "Close, but Anchor expects the `Context` first. Your own arguments follow it.",
        ],
        hint: "A name is plain data the caller sends, not an account. Then think about the order Anchor expects.",
        writes: { file: LIB, block: NAMED },
        // The whole first line, not just the option: line 9 is edited in place, and the option alone
        // would match halfway through, while `-> Result<()> {` is still being typed
        key: "fn hello(_ctx: Context<Hello>, name: String) -> Result<()> {",
        typed: "That's it: the `Context` first, then your own arguments. I've put `name` in the log line too: `msg!` fills `{}` with it.",
      },
      {
        kind: "act",
        id: "s4.ship",
        act: "buildDeploy",
        say: "Devnet still runs the old `hello`. Build and deploy again: the program keeps its address.",
        title: "Build and deploy",
        // A word joiner after the ellipsis, so a narrow card never splits the id in two
        context: `Upgrades ${shortKey(PROGRAM_ID).replace("…", "…\u2060")} in place · from your wallet`,
        button: "Build and deploy",
      },
      {
        kind: "act",
        id: "s4.call",
        act: "call",
        say: "Now call it with your name. Here, or in the Call panel, where `name` just showed up.",
        title: "Call hello",
        context: "Sends hello with your name · fee from your wallet",
        button: "Call hello",
      },
    ],
    win: {
      id: "s4.win",
      headline: "hello knows your name.",
      line: "You changed an instruction, shipped the new version and called it with an argument.",
      stats: [
        { icon: "cpu", text: "1,187 CU" },
        { icon: "braces", text: "name: string" },
        { icon: "rocket", text: "Upgraded in place" },
      ],
    },
    explainStep:
      "Instructions can take arguments after their `Context`. This step adds a `name` to `hello`, ships the new version and calls it with your name.",
    chips: [
      {
        label: "Which types work?",
        match: /\btypes?\b/i,
        answer: "Any type Anchor can serialize: numbers, `bool`, `String`, `Pubkey`, `Vec` and your own structs with `AnchorSerialize`.",
      },
      {
        label: "Can I call it with someone else's name?",
        match: /someone else|another name|other name/i,
        answer: "Sure. Type any name here or in the Call panel. The program logs whatever it gets, up to 32 characters here.",
      },
    ],
    answers: [
      {
        match: /string|bytes|serial/i,
        answer: "Anchor writes the `String` as its length followed by its bytes, and reads it back the same way. You don't have to do anything.",
      },
    ],
  },
]

// The two slips the first build of hello meets: the planned one, the struct Context<Hello> asks for,
// and that struct written without the derive that makes it a list of accounts
const CHECKS: SpecialCheck[] = [
  ({ code, bare, target, file, head, failed }) => {
    if (!(target.includes("struct Hello") && bare.includes("Context<Hello>") && !/struct\s+Hello\b/.test(bare))) return null
    const line = lineOf(code, "Context<Hello>")
    // rustc points at the missing type itself, the Hello inside the brackets
    const column = bare.split("\n")[line - 1].indexOf("Context<Hello>") + "Context<".length + 1
    return {
      ok: false,
      planned: true,
      line,
      column,
      span: "Hello".length,
      log: [...head, "error[E0412]: cannot find type `Hello` in this scope", ` --> ${file}:${line}:${column}`, "Build failed"],
      reason: `${failed}: \`Context<Hello>\` on line ${line} needs a \`Hello\` struct.`,
      explain:
        "In Anchor every instruction receives its accounts through a struct marked `#[derive(Accounts)]`. Your `hello` asks for `Context<Hello>`, but `Hello` is never declared. `hello` reads no accounts, so an empty struct is enough.",
    }
  },
  ({ code, bare, target, file, head, failed }) => {
    // The struct is there but not marked: Context<Hello> needs Hello to list accounts
    if (!(target.includes("#[derive(Accounts)]") && /struct\s+Hello\b/.test(bare) && !/#\[\s*derive\s*\(\s*Accounts\s*\)\s*\]/.test(bare) && bare.includes("Context<Hello>")))
      return null
    const line = lineOf(code, "Context<Hello>")
    const column = bare.split("\n")[line - 1].indexOf("Context<Hello>") + 1
    return {
      ok: false,
      line,
      column,
      span: "Context<Hello>".length,
      log: [...head, "error[E0277]: the trait bound `Hello: Accounts<'_>` is not satisfied", ` --> ${file}:${line}:${column}`, "Build failed"],
      reason: `${failed}: \`Hello\` on line ${lineOf(code, "struct Hello")} isn't marked \`#[derive(Accounts)]\`.`,
      explain:
        "`Context<Hello>` needs `Hello` to be a list of accounts, and `#[derive(Accounts)]` is what makes a struct one. Your `struct Hello` is there without it, so put `#[derive(Accounts)]` on the line above it.",
    }
  },
]

/** What devnet runs: the lib.rs last deployed. Before any deploy, the file, so a stray call still
 * reads something */
const onDevnet = (s: State) => s.deployedLib ?? s.files[LIB]

/** hello with no argument, saying what the deployed program has it say */
const clientTx = (s: State): Tx => ({
  instruction: "hello",
  said: helloSays(onDevnet(s), null),
  signature: TX_SIGNATURE,
  compute: 1042,
})

/** The call with a name, which formats a longer line and so costs a little more */
const namedTx = (s: State, name: string): Tx => ({
  instruction: "hello(name)",
  said: helloSays(onDevnet(s), name),
  signature: NAMED_TX_SIGNATURE,
  compute: 1187,
})

export const HELLO_ANCHOR: Lesson = {
  card: { slug: "hello-anchor", name: "Hello Anchor", level: "Beginner", framework: "Anchor", ext: "jpg" },
  minutes: 10,
  by: "acheron",
  program: "hello_anchor",
  line: "Write, deploy and call your first program",
  intro: "You'll write a small Solana program, put it live on devnet and call it with your name.",
  proof: "Program log: Hello, your name!",
  badge: "First Anchor program",
  headline: "You built and called your first Solana program.",
  proofLine: (tx) => `\`${tx.said}\` came back from devnet, in a transaction your wallet signed.`,
  next: "counter-pda-tutorial",
  nextLine: "Counter PDA Tutorial is a good next one: it stores a number on chain and changes it, so you meet accounts for real.",
  steps: STEPS,
  files: { [LIB]: "", [CLIENT]: "" },
  preview: LIB_NAMED,
  programId: PROGRAM_ID,
  idlAccount: "6mTqR4wYzHc8LkVb2NpXeA9sJ7dFuG3oK5iBnZx1QvCe",
  txSignature: TX_SIGNATURE,
  checks: CHECKS,
  story: true,
  runTx: clientTx,
  callTx: namedTx,
}
