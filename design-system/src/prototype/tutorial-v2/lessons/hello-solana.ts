import { helloSays, lineOf, uncomment } from "../check"
import type { State } from "../store"
import { CLIENT, LIB, bytesOf, shortKey } from "./common"
import type { Lesson, SpecialCheck, Step, Tx } from "./types"

// Hello Solana: the hello program in native Rust, with no framework. Write the one function every call
// enters, deploy it with no IDL, build the instruction by hand, then send a name as raw bytes

// The pieces step 1 writes, in the order it writes them: the imports, the function (taking nothing,
// which is the planned failure), then the entrypoint the question asks for
const IMPORTS = `use solana_program::{
    account_info::AccountInfo,
    entrypoint,
    entrypoint::ProgramResult,
    msg,
    pubkey::Pubkey,
};`

const ENTRY = "entrypoint!(process_instruction);"

const FN_BROKEN = `pub fn process_instruction() -> ProgramResult {
    msg!("Hello, World!");
    Ok(())
}`

const LIB_BROKEN = `${IMPORTS}

${ENTRY}

${FN_BROKEN}`

const SIGNATURE = `pub fn process_instruction(
    _program_id: &Pubkey,
    _accounts: &[AccountInfo],
    _instruction_data: &[u8],
) -> ProgramResult {`

const LIB_FIXED = LIB_BROKEN.replace("pub fn process_instruction() -> ProgramResult {", SIGNATURE)

// Step 4 changes three places: the lines that read the name (asked), then the two they need (written
// without asking): ProgramError in the imports, and `instruction_data` without its `_`
const READ_NAME = `    let name = std::str::from_utf8(instruction_data)
        .map_err(|_| ProgramError::InvalidInstructionData)?;
    msg!("Hello, {}!", name);`

/** lib.rs right after the asked lines: the parameter keeps its `_` until the next write */
const LIB_READ = LIB_FIXED.replace(`    msg!("Hello, World!");`, READ_NAME)

const LIB_NAMED = LIB_READ.replace("    msg,\n", "    msg,\n    program_error::ProgramError,\n").replace("_instruction_data: &[u8]", "instruction_data: &[u8]")

/** The lines from the new import down to the parameter that drops its `_`: what the routine write places */
const NAMED_HEAD = LIB_NAMED.split("\n").slice(5, 15).join("\n")

const CLIENT_CALL = `// The instruction: the program's address, its accounts and its data
const ix = new web3.TransactionInstruction({
  programId: pg.PROGRAM_ID,
  keys: [],
  data: Buffer.from([]),
});

// Your wallet signs the transaction and sends it
const txHash = await web3.sendAndConfirmTransaction(
  pg.connection,
  new web3.Transaction().add(ix),
  [pg.wallet.keypair]
);
console.log(\`Use 'solana confirm -v \${txHash}' to see the logs\`);`

const PROGRAM_ID = "3nWqT8kRvZ5mXcP2yLhB7sJdF4gN9uEtA6oKwQzVxYrM"

const TX_SIGNATURE = "5tRkW2pXmH8vNcY4qZsL7jBdG3fA9uEoKwT6xQnPrMyV"

/** The call with a name on step 4 is a transaction of its own, so it has its own signature */
const NAMED_TX_SIGNATURE = "2gYvM6xQpK9rTnW4cLzH8sBdJ3fA7uEoN5tXwPqRkVyS"

const EXPLAIN_ERROR =
  "On every call, `entrypoint!` hands your function three things: the program's id, the accounts and the instruction data. `process_instruction` takes none, so the compiler stops. `hello` uses none of them yet, but the function has to take them anyway."

/** Whether the program reads the data a call sends: step 4's `from_utf8` */
const reads = (lib: string) => /from_utf8\s*\(\s*instruction_data\b/.test(uncomment(lib))

const STEPS: Step[] = [
  {
    id: "entrypoint",
    title: "Entrypoint",
    short: "Program",
    objective: "Write the function every call enters through, and log a message",
    learned: "The entrypoint every call goes through",
    file: LIB,
    start: "",
    target: LIB_FIXED,
    goal: "build",
    beats: [
      {
        kind: "write",
        id: "s1.boil",
        text: "A native program builds on the `solana_program` crate, with no framework in between. These imports are routine, so I've written them.",
        writes: { file: LIB, block: IMPORTS, ref: LIB_BROKEN },
      },
      {
        kind: "write",
        id: "s1.fn",
        text: "Here's what the program does: `msg!` writes a line to the program log, since a program has no terminal. `hello` needs nothing from the call, so I've given the function no parameters.",
        writes: { file: LIB, block: FN_BROKEN, ref: LIB_BROKEN },
      },
      {
        kind: "say",
        id: "s1.what",
        text: "A framework like Anchor finds your instructions for you. Here nothing does: every call to the program lands in one function, and you tell the runtime which one.",
      },
      {
        kind: "ask",
        id: "s1.q1",
        kicker: "Question",
        n: 1,
        question: "How does the runtime know which function to call?",
        options: ["#[program]", ENTRY, "fn main() {"],
        code: true,
        answer: 1,
        right: "Yes. `entrypoint!` points the runtime at `process_instruction`, and every call goes through it. I've put it under the imports.",
        why: [
          "That's Anchor's attribute, and Anchor writes an entrypoint for you behind it. Here there's no Anchor, so you name the function yourself.",
          null,
          "A Solana program is a library the runtime loads, not an app it starts, so there's no `main`. A macro names the function every call goes to.",
        ],
        hint: "A Solana program has no `main`, and there's no Anchor here. Which line names your function?",
        writes: { file: LIB, block: ENTRY, ref: LIB_BROKEN },
        typed: "That's the line: every call now goes to `process_instruction`.",
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
    planned: "This one's on purpose. Everyone who writes a native program by hand meets this error once, so let's meet it now.",
    plannedShort: "`entrypoint!` on line 9 calls `process_instruction` with three things, and it takes none.",
    onFail: [
      { kind: "say", id: "f1.explain", text: EXPLAIN_ERROR, quote: { file: LIB, line: 9, mark: "process_instruction", tone: "error" } },
      {
        kind: "ask",
        id: "f1.q2",
        kicker: "Fix it",
        question: "So what does `process_instruction` need?",
        options: ["`entrypoint!` changed to pass it nothing", "`msg!` moved out of the function", "The three parameters: program id, accounts, instruction data"],
        code: false,
        answer: 2,
        right: "Exactly. Every native entrypoint takes these three, used or not. `hello` uses none yet, so each name starts with `_`, which tells Rust that's on purpose.",
        why: [
          "`entrypoint!` comes from `solana_program`, and the runtime always hands over the same three things. Your function has to take them.",
          "`msg!` is fine where it is. The error is about what the function takes, on line 11.",
          null,
        ],
        hint: "The error counts arguments: how many does `entrypoint!` pass, and how many does your function take?",
        writes: { file: LIB, block: SIGNATURE, start: LIB_BROKEN },
        // The first of the three: with it in, the rest is filled in. A signature typed with one or two
        // gets E0061 again with the new count
        key: "_program_id: &Pubkey,",
        typed: "That's the first of the three. I've put the accounts and the instruction data under it.",
      },
      {
        kind: "act",
        id: "f1.build",
        act: "build",
        say: "Build again. This time it should pass.",
        title: "Build lib.rs",
        context: "Same build, now with the three parameters",
        button: "Build",
      },
    ],
    win: {
      id: "s1.win",
      headline: "Your program compiles",
      line: "Every call to it lands in `process_instruction`, with the program id, the accounts and the data.",
      stats: [
        { icon: "hammer", text: "Built in 1.6 s" },
        { icon: "braces", text: "1 entrypoint" },
        { icon: "clock", text: "{took}" },
      ],
    },
    explainStep:
      "A native program is one function that every call goes through, and `entrypoint!` names it. This step writes that function with a log line, and the build checks that it takes what the runtime hands it.",
    chips: [
      {
        label: "What does msg! do?",
        match: /\bmsg\b/i,
        answer:
          "`msg!` writes a line to the program log, the way `println!` prints in plain Rust. The line shows up in the transaction's logs, which you'll read after the client calls the program.",
      },
      {
        label: "What's in accounts?",
        match: /\baccounts?\b/i,
        answer:
          "Every account the transaction passes, in order. A program walks them with `next_account_info(&mut accounts.iter())`, one at a time. `hello` reads none, so the list is empty.",
      },
    ],
    errorChips: [
      {
        label: "Why take what I don't use?",
        match: /don'?t use|unused|why take/i,
        answer:
          "The runtime calls every native program the same way. `entrypoint!` passes the three things on, and Rust checks that the function you named takes exactly those.",
      },
      {
        label: "Where is this in the docs?",
        match: /\b(docs?|documentation)\b/i,
        answer: "The Solana docs cover it in [Native Rust: Program structure](https://solana.com/docs/programs/rust/program-structure), in the section on the entrypoint.",
      },
    ],
    answers: [{ match: /why.*(fail|error)/i, answer: EXPLAIN_ERROR, local: true }],
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
        text: "Right now your program is only a build. Deploying uploads it to devnet, Solana's public test network, paid in devnet SOL from your Playground wallet. Anchor's build also writes an IDL that tells clients how to call; yours wrote none. Before you press Deploy, a guess.",
      },
      {
        // A prediction, not a pick that writes: the deploy that follows shows the answer
        kind: "ask",
        id: "s2.q2",
        kicker: "Question",
        n: 2,
        question: "Your build made no IDL. What will a client use to reach your program?",
        options: ["Its address: the program id", "Its function's name, `process_instruction`", "An IDL devnet makes at deploy"],
        code: false,
        answer: 0,
        right: "Yes. A client finds a program by its address, and here that's all the client gets. Watch for it when the deploy lands.",
        why: [
          null,
          "Function names don't exist on chain. Every call lands in the one function `entrypoint!` named, so the address is enough to reach it.",
          "Devnet keeps the compiled program and nothing else. Without an IDL, the client has to know what to send.",
        ],
        hint: "Clients send transactions to a program. Sent where?",
        skipped: "No problem. A client reaches your program by its address, the program id. Watch for it.",
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
      line: "Without an IDL, Playground can't tell what it takes, so the Call panel has only a raw form for it. Your client builds the call by hand next.",
      stats: [
        { icon: "rocket", text: "Live on devnet" },
        { icon: "coins", text: "1.27 devnet SOL" },
        { icon: "braces", text: "No IDL" },
      ],
    },
    explainStep:
      "Deploying puts your program on devnet at an address of its own, the program id, paid from your Playground wallet in free devnet SOL. There's no IDL, so the address is what a client starts from.",
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
      {
        label: "What's an IDL?",
        match: /\bidls?\b/i,
        answer:
          "A file the Anchor build writes: every instruction, its arguments and accounts. Clients and the Call panel read it. A native build has nothing to read them from, so it writes none.",
      },
    ],
  },
  {
    id: "call-client",
    title: "Client",
    short: "Client",
    objective: "Build the instruction by hand and send it",
    learned: "Building an instruction by hand",
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
        id: "s3.how",
        text: "Without an IDL there's no `pg.program` to call through. The client builds the instruction itself, and it carries the same three things `process_instruction` receives.",
      },
      {
        kind: "ask",
        id: "s3.q3",
        kicker: "Question",
        n: 3,
        question: "Which instruction reaches `process_instruction`?",
        options: [
          "pg.program.methods.hello()",
          '{ programId: pg.PROGRAM_ID, method: "process_instruction" }',
          "{ programId: pg.PROGRAM_ID, keys: [], data: Buffer.from([]) }",
        ],
        code: true,
        answer: 2,
        right: "Right: the address, the accounts (`keys`, none for `hello`) and the data (empty for now). I've wrapped it in a transaction your wallet signs and sends, and a line that prints the signature.",
        why: [
          "That's an Anchor client, and it reads the IDL. Your program has none, so `pg.program` isn't there.",
          "There are no function names on chain. Every call lands in the function `entrypoint!` named, so the instruction carries only the address, the accounts and the data.",
          null,
        ],
        hint: "Look at `process_instruction`'s three parameters. The instruction carries the same three.",
        writes: { file: CLIENT, block: CLIENT_CALL },
        key: "programId: pg.PROGRAM_ID,",
        typed: "That's how it starts. I've filled in the accounts and the data, and put the instruction in a transaction your wallet sends.",
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
      line: "That `Hello, World!` is your `msg!`, back in the transaction's logs. 137 compute units: no framework code ran before yours.",
      stats: [
        { icon: "cpu", text: "137 CU" },
        { icon: "timer", text: "~0.4 s" },
        { icon: "coins", text: "0.000005 SOL fee" },
      ],
      extra: "openTest",
    },
    testWin: "You sent the instruction from the Call panel: the address, no accounts, no data. In code, it's the instruction above.",
    explainStep:
      "A client is code outside the program that sends it transactions. With no IDL, it builds the instruction itself: the program's address, the accounts and the data, the same three things `process_instruction` receives.",
    chips: [
      {
        label: "What is pg?",
        match: /\bpg\b/i,
        answer: "Playground's global with your wallet, the connection and your program's address already set up. There's no `pg.program` here: that one needs an IDL.",
      },
      {
        label: "Why sendAndConfirmTransaction?",
        match: /sendandconfirm|blockhash/i,
        answer:
          "It fills in the recent blockhash and the fee payer, signs with the keys you give it, sends the transaction and waits for devnet to confirm it. Done by hand, that's four steps.",
      },
      {
        label: "What are keys?",
        match: /\bkeys\b/i,
        answer: "The accounts the instruction touches, each with whether it signs and whether it's written. They arrive in the program as `accounts`, in the same order.",
      },
    ],
  },
  {
    id: "greet-by-name",
    title: "Name as data",
    short: "Name",
    objective: "Send a name as instruction data, and read it in the program",
    learned: "Reading instruction data by hand",
    file: LIB,
    start: LIB_FIXED,
    target: LIB_NAMED,
    goal: "call",
    beats: [
      {
        kind: "say",
        id: "s4.why",
        text: "`hello` greets everyone the same way. Let's make it greet you. A name travels in `instruction_data`, and here nothing decodes it for you: the program gets raw bytes and reads them itself. I'll change the top of `process_instruction`.",
      },
      {
        kind: "ask",
        id: "s4.q4",
        kicker: "Question",
        n: 4,
        question: "How does `process_instruction` get the name out of `instruction_data`?",
        options: ["instruction_data.name", "std::str::from_utf8(instruction_data)", "next_account_info(&mut accounts.iter())"],
        code: true,
        answer: 1,
        right: "Yes. The client sends the name as UTF-8 text, and `from_utf8` reads the bytes back as text. If they aren't text, the program refuses with `InvalidInstructionData`. I've put `name` in the log line too.",
        why: [
          "`instruction_data` is a slice of bytes, with no fields. Without an IDL nothing gives those bytes names: the program decides what they mean.",
          null,
          "That reads the next account. A name isn't an account: it's data, and it arrives in `instruction_data`.",
        ],
        hint: "The name arrives as bytes. Which option turns bytes into text?",
        writes: { file: LIB, block: READ_NAME, ref: LIB_READ },
        key: "let name = std::str::from_utf8(instruction_data)",
        typed: "That's the line. I've added what it does when the bytes aren't text, and `name` in the log line.",
      },
      {
        kind: "write",
        id: "s4.uses",
        text: "Two small changes that line needs: `ProgramError` in the imports, and `instruction_data` without its `_`, since it's used now.",
        writes: { file: LIB, block: NAMED_HEAD, ref: LIB_NAMED },
      },
      {
        kind: "act",
        id: "s4.ship",
        act: "buildDeploy",
        say: "Devnet still runs the old program. Build and deploy again: it keeps its address.",
        title: "Build and deploy",
        // A word joiner after the ellipsis, so a narrow card never splits the id in two
        context: `Upgrades ${shortKey(PROGRAM_ID).replace("…", "…⁠")} in place · from your wallet`,
        button: "Build and deploy",
      },
      {
        kind: "act",
        id: "s4.call",
        act: "call",
        say: "Now call it with your name. The card shows the bytes it sends.",
        title: "Call with your name",
        context: "Sends your name as UTF-8 bytes · fee from your wallet",
        button: "Call",
      },
    ],
    win: {
      id: "s4.win",
      headline: "hello knows your name",
      line: "You sent a name as bytes, and your program read them back. That's the work Anchor's arguments do for you.",
      stats: [
        { icon: "cpu", text: "412 CU" },
        { icon: "braces", text: "Data read by hand" },
        { icon: "rocket", text: "Upgraded in place" },
      ],
    },
    testWin: "You sent your name from the Call panel as raw bytes, and your program read them back.",
    explainStep:
      "Instruction data is raw bytes. This step sends your name as UTF-8, reads it back in the program with `from_utf8`, ships the new version and calls it.",
    chips: [
      {
        label: "How do I send it from client.ts?",
        match: /client\.?ts|from the client/i,
        answer: 'Change `data` to `Buffer.from("Alex")`: the name\'s UTF-8 bytes, the same ones the card sends.',
      },
      {
        label: "What if I send no name?",
        match: /no name|empty|without a name/i,
        answer: "Then `instruction_data` is empty and the log reads `Hello, !`. A real program checks the length and refuses, or falls back to a default.",
      },
      {
        label: "How do real programs pack more than a name?",
        match: /borsh|more than|pack|serial/i,
        answer:
          "Usually with Borsh: a first byte says which instruction, the fields follow in a fixed order, and the program decodes them into a struct. It's what Anchor writes for you.",
      },
    ],
  },
]

/** The function `entrypoint!` names, and where it's declared */
const entryOf = (bare: string) => bare.match(/entrypoint!\(\s*(\w+)\s*\)/)?.[1] ?? null

// What a native entrypoint must take, in order
const PARAMS = ["&Pubkey", "&[AccountInfo]", "&[u8]"]

/** The errors a native entrypoint meets: the function `entrypoint!` names takes fewer than the three
 * things it passes (the planned failure, E0061), isn't there at all (E0425), or takes three of the
 * wrong kinds or in the wrong order (E0308) */
const CHECKS: SpecialCheck[] = [
  ({ code, bare, file, head, failed }) => {
    const name = entryOf(bare)
    if (!name || new RegExp(`\\bfn\\s+${name}\\b`).test(bare)) return null
    const line = lineOf(code, "entrypoint!")
    const column = bare.split("\n")[line - 1].indexOf(name) + 1
    return {
      ok: false,
      line,
      column,
      span: name.length,
      log: [...head, `error[E0425]: cannot find function \`${name}\` in this scope`, ` --> ${file}:${line}:${column}`, "Build failed"],
      reason: `${failed}: \`entrypoint!\` on line ${line} names \`${name}\`, and there's no function by that name.`,
      explain: `\`entrypoint!\` names the function every call enters, and the names have to match. Line ${line} names \`${name}\`; rename the function to it, or put the function's own name in \`entrypoint!\`.`,
    }
  },
  ({ code, bare, file, head, failed }) => {
    const name = entryOf(bare)
    const sig = name ? bare.match(new RegExp(`\\bfn\\s+${name}\\s*\\(([^)]*)\\)`)) : null
    if (!name || !sig) return null
    const params = sig[1].split(",").map((p) => p.trim()).filter(Boolean)
    if (params.length >= 3) return null
    const line = lineOf(code, "entrypoint!")
    const column = bare.split("\n")[line - 1].indexOf(name) + 1
    const n = params.length
    return {
      ok: false,
      planned: true,
      line,
      column,
      span: name.length,
      log: [
        ...head,
        `error[E0061]: this function takes ${n} argument${n === 1 ? "" : "s"} but 3 arguments were supplied`,
        ` --> ${file}:${line}:1`,
        `note: function defined here`,
        `  --> ${file}:${lineOf(code, `fn ${name}`)}:8`,
        "   = note: this error originates in the macro `entrypoint`",
        "Build failed",
      ],
      reason: `${failed}: \`entrypoint!\` on line ${line} passes \`${name}\` three things, and it takes ${n === 0 ? "none" : n}.`,
      explain: `\`entrypoint!\` hands the function it names three things on every call: the program id, the accounts and the instruction data. \`${name}\` takes ${n === 0 ? "none" : `only ${n}`}, so the compiler stops. Give it all three, in that order: \`&Pubkey\`, \`&[AccountInfo]\`, \`&[u8]\`.`,
    }
  },
  ({ code, bare, file, head, failed }) => {
    const name = entryOf(bare)
    const sig = name ? bare.match(new RegExp(`\\bfn\\s+${name}\\s*\\(([^)]*)\\)`)) : null
    if (!name || !sig) return null
    const types = sig[1]
      .split(",")
      .map((p) => p.split(":")[1]?.replace(/\s+/g, "").replace(/'\w+/g, "").replace(/<>/g, "") ?? "")
      .filter(Boolean)
    if (types.length !== 3) return null
    const at = types.findIndex((t, i) => t.replace(/^&(mut)?/, "&") !== PARAMS[i])
    if (at === -1) return null
    // The parameter that doesn't line up, by its name
    const line = lineOf(code, `${sig[1].split(",")[at].split(":")[0].trim()}:`)
    return {
      ok: false,
      line,
      log: [...head, "error[E0308]: mismatched types", ` --> ${file}:${line}`, `expected \`${PARAMS[at]}\`, found \`${types[at]}\``, "Build failed"],
      reason: `${failed}: parameter ${at + 1} of \`${name}\` should be \`${PARAMS[at]}\`.`,
      explain: `\`entrypoint!\` passes the program id, the accounts and the instruction data, in that order: \`&Pubkey\`, \`&[AccountInfo]\`, \`&[u8]\`. Parameter ${at + 1} of \`${name}\` has another type, so they don't line up.`,
    }
  },
]

/** What devnet runs: the lib.rs last deployed. Before any deploy, the file, so a stray call still
 * reads something */
const onDevnet = (s: State) => s.deployedLib ?? s.files[LIB]

/** The instruction from client.ts, with no data: the program logs its line */
const clientTx = (s: State): Tx => ({
  instruction: "process_instruction",
  said: helloSays(onDevnet(s), null),
  signature: TX_SIGNATURE,
  compute: 137,
})

/** The instruction with a name as its data. A program that reads it logs it, at the cost of reading the
 * bytes; one that doesn't yet answers as before */
const namedTx = (s: State, name: string): Tx =>
  reads(onDevnet(s))
    ? { instruction: "process_instruction", said: helloSays(onDevnet(s), name), signature: NAMED_TX_SIGNATURE, compute: 412, data: bytesOf(name) }
    : { ...clientTx(s), data: bytesOf(name) }

export const HELLO_SOLANA: Lesson = {
  card: { slug: "hello-solana", name: "Hello Solana", level: "Beginner", framework: "Native", ext: "jpg" },
  minutes: 10,
  by: "acheron",
  program: "hello_solana",
  line: "Write a native program with no framework, deploy it and call it",
  intro: "You'll write a Solana program in plain Rust with no framework, put it live on devnet, build its instruction by hand and send it your name as bytes.",
  proof: "Program log: Hello, your name!",
  badge: "First native program",
  headline: "You built a Solana program with no framework",
  proofLine: (tx) => `\`${tx.said}\` came back from devnet: bytes your client sent, read by your own code.`,
  next: "hello-anchor",
  nextLine: "Hello Anchor is a good next one: the same hello, with Anchor writing the entrypoint, the instruction and the data parsing for you.",
  steps: STEPS,
  files: { [LIB]: "", [CLIENT]: "" },
  preview: LIB_NAMED,
  programId: PROGRAM_ID,
  // A native deploy writes no IDL; the field is the type's, and nothing here shows it
  idlAccount: "",
  txSignature: TX_SIGNATURE,
  checks: CHECKS,
  story: false,
  raw: {
    ix: "process_instruction",
    line: (lib) => (reads(lib) ? "No IDL · reads a name from its data" : "No IDL · native program"),
    reads,
  },
  runTx: clientTx,
  callTx: namedTx,
}
