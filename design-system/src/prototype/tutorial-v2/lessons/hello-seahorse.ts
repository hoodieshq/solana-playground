import { helloSays, straightQuotes, uncomment } from "../check"
import type { State } from "../store"
import { CLIENT, shortKey } from "./common"
import { GENERATED, SEAHORSE_CHECKS } from "./seahorse"
import type { Lesson, Step, Tx } from "./types"

// Hello Seahorse: the hello program in Python. Write it as a typed function, see the Anchor program
// Seahorse makes of it, call it with your wallet as its signer, then with your name

/** The program's file: Playground names a Seahorse program after it */
const MAIN = "src/hello.py"

// The pieces step 1 writes, in the order it writes them: the two routine lines, then hello, first
// with no type on `signer`, the way plain Python allows, which is the planned failure
const BOIL = `from seahorse.prelude import *

declare_id('11111111111111111111111111111111')`

const HELLO_BROKEN = `@instruction
def hello(signer):
    print('Hello, World!')`

const FIX = "def hello(signer: Signer):"

const LIB_BROKEN = `${BOIL}

${HELLO_BROKEN}`

const LIB_FIXED = LIB_BROKEN.replace("def hello(signer):", FIX)

const NAMED = `def hello(signer: Signer, name: str):
    print(f'Hello, {name}!')`

const LIB_NAMED = LIB_FIXED.replace(`${FIX}\n    print('Hello, World!')`, NAMED)

const CLIENT_CALL = `// Call hello, with your wallet as its signer
const txHash = await pg.program.methods
  .hello()
  .accounts({ signer: pg.wallet.publicKey })
  .rpc();
console.log(\`Use 'solana confirm -v \${txHash}' to see the logs\`);`

const PROGRAM_ID = "5eAhX3vQmPzR7kTn2sWcYfN9hJdB4uG8oKtLxEqVyZrC"

const TX_SIGNATURE = "2HsK9pLmW4xRtY7cVbN3qZfJ8dA5gUeT6oPiXrMwQyBs"

/** The call with a name on step 4 is a transaction of its own, so it has its own signature */
const NAMED_TX_SIGNATURE = "4jXq7RmP2vNtK9wLcZsY5hBdF8gA3uEoTnW6xQpMrHyV"

/** The line of the generated Rust that holds the `msg!` the build made of `print`, for step 2's quote */
const MSG_LINE = 5

/** The Rust a build writes from hello.py, trimmed to what comes from your code, as seahorse-dev 0.2.0
 * compiles it: `print` becomes `msg!`, `signer: Signer` an account in a `#[derive(Accounts)]` struct,
 * and a `str` parameter a `String` argument. Worked out from the Python, so the learner's own text and
 * names come through */
function rustOf(py: string): string {
  const code = uncomment(straightQuotes(py))
  const sig = code.match(/def\s+hello\s*\(([^)]*)\)/)?.[1] ?? ""
  const arg = sig
    .split(",")
    .map((p) => p.split(":").map((x) => x.trim()))
    .find(([name, type]) => name && type === "str")?.[0]
  const say = code.match(/\bprint\(\s*(f?)(['"])((?:(?!\2)[^\\]|\\.)*)\2/)
  const text = say?.[3] ?? "Hello, World!"
  const values = [...text.matchAll(/\{([^{}]*)\}/g)].map((m) => m[1].trim())
  const msg = say?.[1] ? `format!(${JSON.stringify(text.replace(/\{[^{}]*\}/g, "{}"))}, ${values.join(", ")})` : `${JSON.stringify(text)}.to_string()`
  const arg1 = arg ? `, mut ${arg}: String` : ""
  return `// Seahorse wrote this from hello.py on your last build. Read only: edit hello.py instead.
// Trimmed: the imports, declare_id! and Seahorse's helper module are left out.

pub fn hello_handler<'info>(mut signer: SeahorseSigner<'info, '_>${arg1}) -> () {
    solana_program::msg!("{}", ${msg});
}

#[program]
mod hello {
    use super::*;
    use seahorse_util::*;
    use std::collections::HashMap;

    #[derive(Accounts)]
${arg ? `    #[instruction(${arg}: String)]\n` : ""}    pub struct Hello<'info> {
        #[account(mut)]
        pub signer: Signer<'info>,
    }

    pub fn hello(ctx: Context<Hello>${arg ? `, ${arg}: String` : ""}) -> Result<()> {
        let mut programs = HashMap::new();
        let programs_map = ProgramsMap(programs);
        let signer = SeahorseSigner {
            account: &ctx.accounts.signer,
            programs: &programs_map,
        };

        hello_handler(signer.clone()${arg ? `, ${arg}` : ""});

        return Ok(());
    }
}`
}

const EXPLAIN_ERROR =
  "Line 6 gives `hello` a parameter called `signer`, with no type. Plain Python doesn't mind, but Seahorse reads the types to decide what each parameter is: an account the call must pass, or a value it sends. Without one it can't tell, so the build stops before any Rust is made."

const MAINTAINED =
  "Seahorse hasn't had a release since January 2024. It's a good way into Solana if you know Python; for programs you'll ship, Anchor is the standard."

const STEPS: Step[] = [
  {
    id: "write-program",
    title: "Program",
    short: "Program",
    objective: "Write the hello instruction in Python and log a message",
    learned: "Writing an instruction as a typed Python function",
    file: MAIN,
    start: "",
    target: LIB_FIXED,
    goal: "build",
    beats: [
      {
        kind: "write",
        id: "s1.boil",
        text: "Every Seahorse program opens with the same two lines: the import and the program's id. They're routine, so I've written them.",
        writes: { file: MAIN, block: BOIL, ref: LIB_BROKEN },
      },
      {
        kind: "say",
        id: "s1.what",
        text: "In Seahorse an instruction is a Python function marked `@instruction`. Yours is `hello`, and its one parameter is `signer`: the wallet that signs the call. Its body is one line, and a program on Solana has no terminal, so the only place it can write is the program log.",
      },
      {
        kind: "ask",
        id: "s1.q1",
        kicker: "Question",
        n: 1,
        question: "Which line writes to the program log?",
        options: ['msg!("Hello, World!")', "return 'Hello, World!'", "print('Hello, World!')"],
        code: true,
        answer: 2,
        right: "Yes. In Seahorse, `print` writes to the program log: the build turns it into Anchor's `msg!`. I've put it in `hello`, under `@instruction`.",
        why: [
          "That's the Rust macro, and you'll meet it in the code Seahorse generates. In Python you write `print`, and the build turns it into `msg!`.",
          "An instruction hands nothing back to its caller, and a return value never reaches the log. The log gets what the program prints.",
          null,
        ],
        hint: "You're writing Python. One ordinary Python call is what Seahorse turns into a log line.",
        writes: { file: MAIN, block: HELLO_BROKEN, ref: LIB_BROKEN },
        typed: "That's the line. I've put `@instruction` and `def hello(signer):` around it.",
      },
      {
        kind: "act",
        id: "s1.build",
        act: "build",
        say: "That's a whole program. Let's compile it.",
        title: "Build hello.py",
        context: "Compiles hello.py to Anchor, then builds it on Playground's build server",
        button: "Build",
      },
    ],
    planned: "This one's on purpose. Python lets a parameter go without a type, Seahorse doesn't, and everyone who comes from Python meets this error once.",
    plannedShort: "Line 6 gives `hello` a parameter with no type, and Seahorse needs one on every parameter.",
    onFail: [
      { kind: "say", id: "f1.explain", text: EXPLAIN_ERROR, quote: { file: MAIN, line: 6, mark: "signer", tone: "error" } },
      {
        kind: "ask",
        id: "f1.q2",
        kicker: "Fix it",
        question: "So what does `signer` need?",
        options: ["A type: `signer: Signer`", "A default value: `signer=None`", "An import of `signer` from `seahorse.prelude`"],
        code: false,
        answer: 0,
        right: "Exactly. `Signer` tells Seahorse this is an account that signs the call, and the build makes it one in Anchor's accounts struct.",
        why: [
          null,
          "Seahorse takes no default values: every parameter is something the call must send. What it needs is a type.",
          "The import is already there, on line 1, and `Signer` comes from it. The parameter itself has to say its type.",
        ],
        hint: "Read the error's last line: it says what every parameter must have.",
        // The line that is the fix: `def hello(signer):` is there either way. `start` lets the old line go
        writes: { file: MAIN, block: FIX, start: LIB_BROKEN },
        key: FIX,
        typed: "That's the fix: `Signer` tells Seahorse `signer` is an account that signs.",
      },
      {
        kind: "act",
        id: "f1.build",
        act: "build",
        say: "Build again. This time it should pass.",
        title: "Build hello.py",
        context: "Same build, now with `signer: Signer`",
        button: "Build",
      },
    ],
    win: {
      id: "s1.win",
      headline: "Your program compiles",
      line: "The build made its IDL: one instruction, `hello`, with one account, `signer`. That's what clients will call.",
      stats: [
        { icon: "hammer", text: "Built in 1.6 s" },
        { icon: "braces", text: "1 instruction" },
        { icon: "clock", text: "{took}" },
      ],
    },
    explainStep:
      "This step writes the smallest Seahorse program there is: one instruction, `hello`, that prints a line to the program log. I explain a piece, you pick the right line, and I write it in. Then the build checks it.",
    chips: [
      {
        label: "What does @instruction do?",
        match: /@?instruction\b.*\bdo\b|decorator/i,
        answer:
          "It marks a function as an instruction: something a transaction can call. A function without it is a helper the program uses inside, and clients never see it.",
      },
      {
        label: "What is declare_id?",
        match: /declare_id/i,
        answer: "The address the program checks every call against. Playground writes the real one in when you deploy.",
      },
    ],
    errorChips: [
      {
        label: "Why does Python need types here?",
        match: /\btypes?\b|annotation/i,
        answer:
          "Seahorse turns your function into Rust, and Rust needs to know every type. The type also decides where a parameter comes from: an account like `Signer` is passed in the call's account list, a value like `str` in its data.",
      },
      {
        label: "Where is this in the docs?",
        match: /\b(docs?|documentation)\b/i,
        answer: "The Seahorse docs at [seahorse.dev](https://seahorse.dev) cover it under Instructions: every parameter of an instruction is typed, and the type says what it is.",
      },
    ],
    answers: [
      { match: /maintain|still (alive|used|supported)|deprecated|abandon/i, answer: MAINTAINED },
      { match: /why.*(fail|error)/i, answer: EXPLAIN_ERROR, local: true },
    ],
  },
  {
    id: "deploy",
    title: "Build & Deploy",
    short: "Deploy",
    objective: "See what Seahorse made of your Python, and deploy it to devnet",
    learned: "How Seahorse compiles Python to Anchor",
    file: MAIN,
    start: LIB_FIXED,
    target: LIB_FIXED,
    goal: "deploy",
    beats: [
      {
        kind: "say",
        id: "s2.rust",
        text: "When you pressed Build, Seahorse wrote an Anchor program in Rust from hello.py, and that's what was compiled. Your `print` is this line now, and `signer` became a `Signer` in a `#[derive(Accounts)]` struct. You never edit this Rust: change hello.py and the next build writes it again.",
        quote: { file: GENERATED, line: MSG_LINE, tone: "lit", generated: true },
      },
      {
        // A prediction, not a pick that writes: the deploy that follows shows the answer
        kind: "ask",
        id: "s2.q2",
        kicker: "Question",
        n: 2,
        question: "What goes to devnet when you deploy?",
        options: ["hello.py, run by Python on the validator", "The program compiled from that Rust", "hello.py and the Rust, side by side"],
        code: false,
        answer: 1,
        right: "Yes. Validators run compiled programs, never source. Python is how you write it; what runs is the Anchor program Seahorse made. Watch for its address when the deploy lands.",
        why: [
          "Validators don't run Python. They run compiled programs, and yours was compiled from the Rust Seahorse wrote.",
          null,
          "Devnet keeps only the compiled program. Neither your Python nor the Rust goes on chain.",
        ],
        hint: "Validators run one kind of thing, and it isn't source code.",
        skipped: "No problem. Devnet gets the compiled program, built from the Rust Seahorse wrote. Watch for its address.",
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
      headline: "Your program is live on devnet",
      line: "It runs as the Anchor program Seahorse made, so it has an IDL, and the Call panel has a form for `hello`.",
      stats: [
        { icon: "rocket", text: "Live on devnet" },
        { icon: "coins", text: "1.27 devnet SOL" },
        { icon: "braces", text: "Call panel added" },
      ],
      extra: "openTest",
    },
    explainStep:
      "Seahorse turned hello.py into an Anchor program in Rust, and that's what deploys. Devnet runs the compiled program at an address of its own, paid from your Playground wallet in free devnet SOL.",
    chips: [
      {
        label: "Can I see all the Rust?",
        match: /\b(rust|generated)\b/i,
        answer:
          "Show generated Rust on the quote above opens what your last build wrote, beside hello.py, read only. It's trimmed to what comes from your code: the full build adds the imports and a helper module Seahorse writes.",
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
    objective: "Call hello from the TypeScript client, with your wallet as its signer",
    learned: "Calling a program with your wallet as signer",
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
        text: "`pg.program` knows your program from its IDL: `pg.program.methods` has one method per instruction. `hello` also lists an account, `signer`, and the call has to say who that is.",
      },
      {
        kind: "ask",
        id: "s3.q3",
        kicker: "Question",
        n: 3,
        question: "`hello` needs a `signer`. Who signs when client.ts calls it?",
        options: ["The program, at its own address", "The validator that runs the call", "Your Playground wallet, which pays the fee"],
        code: false,
        answer: 2,
        right: "Yes. The wallet that sends the transaction signs it, so `signer` is your wallet's key. I've written the call with it, and a line that prints the signature.",
        why: [
          "A program can't sign for whoever calls it. The signer is the wallet that sends the transaction.",
          "Validators run the call but never sign it. The signer is whoever sends the transaction.",
          null,
        ],
        hint: "Somebody sends this transaction and pays its fee. That's who signs.",
        writes: { file: CLIENT, block: CLIENT_CALL },
        key: ".accounts({ signer: pg.wallet.publicKey })",
        typed: "That's the line: your wallet is the signer. I've put the call around it and a line that prints the signature.",
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
      headline: "Your program answered from devnet",
      line: "That `Hello, World!` is the `print` from hello.py, as the `msg!` Seahorse made of it, back in the transaction's logs.",
      stats: [
        { icon: "cpu", text: "1,486 CU" },
        { icon: "timer", text: "~0.4 s" },
        { icon: "coins", text: "0.000005 SOL fee" },
      ],
      extra: "openTest",
    },
    testWin: "You called `hello` from the Call panel, with your wallet as `signer`. In code, the same call is one line.",
    explainStep:
      "A client is code outside the program that sends it transactions. `hello` takes one account, `signer`, and the client fills it with your wallet. You can also call `hello` from the Call panel.",
    chips: [
      {
        label: "What is pg?",
        match: /\bpg\b/i,
        answer: "`pg` is Playground's global with your program, wallet and connection already set up. `pg.program` knows `hello` from the IDL the build produced.",
      },
      {
        label: "Do I always pass the signer?",
        match: /\bsigner\b/i,
        answer: "Anchor's client fills in a signer with your wallet when you leave it out. It's written out here so you can see where the account goes.",
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
    file: MAIN,
    start: LIB_FIXED,
    target: LIB_NAMED,
    goal: "call",
    beats: [
      {
        kind: "say",
        id: "s4.why",
        text: "`hello` greets everyone the same way. Let's make it greet you. A value the caller sends is a parameter too, and its type tells Seahorse it's data, not an account. I'll change `hello`'s first line, line 6.",
      },
      {
        kind: "ask",
        id: "s4.q4",
        kicker: "Question",
        n: 4,
        question: "Which `hello` takes a name?",
        options: ["def hello(signer: Signer, name):", "def hello(signer: Signer, name: str):", "def hello(signer: Signer, name: Signer):"],
        code: true,
        answer: 1,
        right: "Yes. `str` makes `name` text the caller sends, and the build turns it into a `String` argument. I've put it in the log line too: an f-string fills in `{name}`.",
        why: [
          "That's step 1's error again: Seahorse needs a type on every parameter.",
          null,
          "`Signer` is an account that signs the call. A name is text the caller sends, so its type is `str`.",
        ],
        hint: "A name is text. Which Python type is text?",
        writes: { file: MAIN, block: NAMED },
        key: "def hello(signer: Signer, name: str):",
        typed: "That's it: `str` makes `name` text the caller sends. I've put it in the log line too: an f-string fills in `{name}`.",
      },
      {
        kind: "act",
        id: "s4.ship",
        act: "buildDeploy",
        say: "Devnet still runs the old `hello`. Build and deploy again: the program keeps its address.",
        title: "Build and deploy",
        // A word joiner after the ellipsis, so a narrow card never splits the id in two
        context: `Upgrades ${shortKey(PROGRAM_ID).replace("…", "…⁠")} in place · from your wallet`,
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
      headline: "hello knows your name",
      line: "You added a typed parameter, shipped the new version and called it with your name.",
      stats: [
        { icon: "cpu", text: "1,612 CU" },
        { icon: "braces", text: "name: str" },
        { icon: "rocket", text: "Upgraded in place" },
      ],
    },
    explainStep: "A parameter typed `str` is data the caller sends. This step adds `name` to `hello`, ships the new version and calls it with your name.",
    chips: [
      {
        label: "Which types work?",
        match: /\btypes?\b/i,
        answer:
          "Python's `str`, `bool` and `f64`, Seahorse's integer types like `u8` and `u64`, `Pubkey`, lists and your own classes. Each one becomes its Rust type in the build.",
      },
      {
        label: "Can I format numbers in the f-string?",
        match: /f-?string|format/i,
        answer: "Seahorse fills `{name}` in, but takes no formatting options like `{x:.2f}`: the build stops with `f-string formatting options are not supported`.",
      },
    ],
  },
]

/** What devnet runs: the hello.py last deployed. Before any deploy, the file, so a stray call still
 * reads something */
const onDevnet = (s: State) => s.deployedLib ?? s.files[MAIN]

/** hello with no argument, saying what the deployed program prints */
const clientTx = (s: State): Tx => ({
  instruction: "hello",
  said: helloSays(onDevnet(s), null),
  signature: TX_SIGNATURE,
  compute: 1486,
})

/** The call with a name, which formats a longer line and so costs a little more */
const namedTx = (s: State, name: string): Tx => ({
  instruction: "hello(name)",
  said: helloSays(onDevnet(s), name),
  signature: NAMED_TX_SIGNATURE,
  compute: 1612,
})

export const HELLO_SEAHORSE: Lesson = {
  card: { slug: "hello-seahorse", name: "Hello Seahorse", level: "Beginner", framework: "Seahorse", ext: "jpg" },
  minutes: 10,
  by: "acheron",
  program: "hello",
  line: "Write a Solana program in Python, deploy it and call it",
  intro: "You'll write a small Solana program in Python, see the Anchor program Seahorse makes of it, put it live on devnet and call it with your name.",
  proof: "Program log: Hello, your name!",
  badge: "First Seahorse program",
  headline: "You wrote a Solana program in Python",
  proofLine: (tx) => `\`${tx.said}\` came back from devnet: your Python, compiled to Anchor, in a transaction your wallet signed.`,
  next: "todo-app-seahorse",
  nextLine:
    "Todo App Seahorse is a good next one: in Python again, it keeps your tasks in accounts on chain, so you meet `Account` classes and their addresses.",
  steps: STEPS,
  // The generated Rust is there from the start, empty: the first build fills it, and it opens from step 2's quote
  files: { [MAIN]: "", [CLIENT]: "", [GENERATED]: "" },
  preview: LIB_NAMED,
  programId: PROGRAM_ID,
  idlAccount: "8pRcT6wXzHn3KmVb4QeYfA2sJ9dGuN7tL5iBhZq1WxEe",
  txSignature: TX_SIGNATURE,
  checks: SEAHORSE_CHECKS,
  story: false,
  main: MAIN,
  generated: { file: GENERATED, of: rustOf },
  runTx: clientTx,
  callTx: namedTx,
}
