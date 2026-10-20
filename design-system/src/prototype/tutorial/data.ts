export type Pass = { ok: true; log: string[]; note: string }
export type Fail = { ok: false; log: string[]; line: number; reason: string }
export type BuildResult = Pass | Fail

export type Patch = {
  file: string
  before: string
  after: string
  summary: string
  /** Why a change is there, pinned to a line of the new file. Tap the dot on that line to read it */
  notes: { line: number; text: string }[]
  result: BuildResult
}

/** One question before the code shows, on steps that bring a new idea */
export type Predict = {
  question: string
  options: string[]
  answer: number
  /** Feedback after a right and a wrong answer. The wrong one names the right answer outright */
  right: string
  wrong: string
  /** The line of the new file the answer is about: its note opens once the code shows */
  line: number
}

export type Chip = { label: string; answer: string }

export type LessonBlock = { kind: "h"; text: string } | { kind: "p"; text: string } | { kind: "code"; code: string }

export type Step = {
  id: string
  title: string
  objective: string
  checkedBy: string
  learned: string
  /** The lesson, read in a sheet. `ticks` in text mark inline code */
  lesson: LessonBlock[]
  file: string
  /** Lines lit before the patch, where the change will land */
  focus: number[]
  cta: string
  patch?: Patch
  /** The fix Explain offers when the first patch fails */
  fix?: Patch
  deploy?: { stages: string[]; result: Pass }
  explainStep: string
  explainError?: string
  chips: Chip[]
  predict?: Predict
}

export type TutorialCard = {
  slug: string
  name: string
  level: "Beginner" | "Intermediate" | "Advanced"
  framework: "Anchor" | "Seahorse" | "Native"
  ext: "jpg" | "png"
}

export const thumb = (slug: string, ext: string) =>
  `${import.meta.env.BASE_URL}prototype/thumbs/${slug}.${ext}`

export const TUTORIALS: TutorialCard[] = [
  { slug: "hello-anchor", name: "Hello Anchor", level: "Beginner", framework: "Anchor", ext: "jpg" },
  { slug: "hello-seahorse", name: "Hello Seahorse", level: "Beginner", framework: "Seahorse", ext: "jpg" },
  { slug: "hello-solana", name: "Hello Solana", level: "Beginner", framework: "Native", ext: "jpg" },
  { slug: "counter-pda-tutorial", name: "Counter PDA Tutorial", level: "Beginner", framework: "Anchor", ext: "jpg" },
  { slug: "tiny-adventure", name: "Tiny Adventure", level: "Beginner", framework: "Anchor", ext: "jpg" },
  { slug: "tiny-adventure-two", name: "Tiny Adventure Two", level: "Beginner", framework: "Anchor", ext: "jpg" },
  { slug: "expense-tracker", name: "Expense Tracker", level: "Beginner", framework: "Anchor", ext: "png" },
  { slug: "tictactoe-seahorse", name: "Tictactoe Seahorse", level: "Beginner", framework: "Seahorse", ext: "jpg" },
  { slug: "todo-app-seahorse", name: "Todo App Seahorse", level: "Beginner", framework: "Seahorse", ext: "jpg" },
  { slug: "bank-simulator", name: "Bank Simulator", level: "Intermediate", framework: "Anchor", ext: "png" },
  { slug: "battle-coins", name: "Battle Coins", level: "Intermediate", framework: "Anchor", ext: "jpg" },
  { slug: "boss-battle", name: "Boss Battle", level: "Intermediate", framework: "Anchor", ext: "png" },
  { slug: "faucet-seahorse", name: "Faucet Seahorse", level: "Intermediate", framework: "Seahorse", ext: "jpg" },
  { slug: "lumberjack", name: "Lumberjack", level: "Intermediate", framework: "Anchor", ext: "jpg" },
  { slug: "spl-token-vault", name: "SPL Token Vault", level: "Intermediate", framework: "Anchor", ext: "png" },
  { slug: "zero-copy", name: "Zero Copy", level: "Advanced", framework: "Anchor", ext: "jpg" },
]

const LIB_START = "// Import anchor"

// Step 1, first try: hello asks for Context<Hello>, but Hello is missing
const LIB_BROKEN = `use anchor_lang::prelude::*;

declare_id!("11111111111111111111111111111111");

#[program]
mod hello_anchor {
    use super::*;

    pub fn hello(_ctx: Context<Hello>) -> Result<()> {
        msg!("Hello, World!");
        Ok(())
    }
}`

const LIB_FIXED = `${LIB_BROKEN}

#[derive(Accounts)]
pub struct Hello {}`

const LIB_NAMED = LIB_FIXED.replace(
  `    pub fn hello(_ctx: Context<Hello>) -> Result<()> {
        msg!("Hello, World!");`,
  `    pub fn hello(_ctx: Context<Hello>, name: String) -> Result<()> {
        msg!("Hello, {}!", name);`
)

const CLIENT_START = "// Client code..."

const CLIENT_CALL = `// Call the hello instruction
const txHash = await pg.program.methods.hello().rpc();
console.log(\`Use 'solana confirm -v \${txHash}' to see the logs\`);`

export const INITIAL_FILES: Record<string, string> = {
  "src/lib.rs": LIB_START,
  "client/client.ts": CLIENT_START,
}

const BUILD_OK = ["$ anchor build", "Compiling hello_anchor v0.1.0", "Finished release [optimized] target(s) in 2.41s"]

export const PROGRAM_ID = "9hJqVkRZ3t2nX8cPfLwA5mYbE7sGdT4uK1oNjQzWxCvB"

export const STEPS: Step[] = [
  {
    id: "write-program",
    title: "Program",
    objective: "Define the hello instruction and log a message",
    checkedBy: "the build shows a hello instruction",
    learned: "Declaring a program and its instructions",
    lesson: [
      { kind: "h", text: "Import Anchor" },
      { kind: "p", text: "Start by importing Anchor. Its `prelude` brings in everything a program needs." },
      { kind: "code", code: "use anchor_lang::prelude::*;" },
      { kind: "h", text: "Declare the program id" },
      { kind: "p", text: "Anchor checks every call against the program's public key. In Playground `declare_id!` is filled in for you when you build." },
      { kind: "code", code: 'declare_id!("11111111111111111111111111111111");' },
      { kind: "h", text: "Write the instruction" },
      { kind: "p", text: "Instructions live in a module marked `#[program]`. Each one gets a `Context` with the accounts it needs. `hello` needs none, so it logs a line and returns." },
      { kind: "code", code: `#[program]
mod hello_anchor {
    use super::*;

    pub fn hello(_ctx: Context<Hello>) -> Result<()> {
        msg!("Hello, World!");
        Ok(())
    }
}` },
    ],
    file: "src/lib.rs",
    focus: [1],
    cta: "Write with assistant",
    patch: {
      file: "src/lib.rs",
      before: LIB_START,
      after: LIB_BROKEN,
      summary:
        "I'll import Anchor, declare the program id and add a hello instruction that logs “Hello, World!”.",
      notes: [
        { line: 1, text: "The prelude brings in the macros and types every Anchor program uses." },
        { line: 3, text: "Anchor checks every call against this id. Playground fills in the real one when you build." },
        { line: 5, text: "Instructions live in the module marked #[program]. hello writes one line to the log and returns Ok." },
      ],
      result: {
        ok: false,
        log: [
          "$ anchor build",
          "Compiling hello_anchor v0.1.0",
          "error[E0412]: cannot find type `Hello` in this scope",
          " --> src/lib.rs:9:30",
          "Build failed",
        ],
        line: 9,
        reason: "Line 9 uses Context<Hello>, but there is no Hello struct in the file yet.",
      },
    },
    fix: {
      file: "src/lib.rs",
      before: LIB_BROKEN,
      after: LIB_FIXED,
      summary: "Add an empty Hello accounts struct.",
      notes: [{ line: 15, text: "Context<Hello> on line 9 needs this struct. hello reads no accounts, so it stays empty." }],
      result: {
        ok: true,
        log: [...BUILD_OK, "IDL: 1 instruction · hello", "Build successful"],
        note: "The build passed and the interface shows a hello instruction.",
      },
    },
    explainStep:
      "This step writes the smallest Anchor program there is: one instruction, hello, that writes a line to the program log. I'll propose the code as a patch. You read it and apply it, then the build checks it.",
    predict: {
      question: "Where does the hello instruction go?",
      options: ["Inside a module marked #[program]", "Inside a #[derive(Accounts)] struct", "Inside declare_id!"],
      answer: 0,
      right: "Right. Anchor finds a program's instructions in the module marked #[program].",
      wrong: "Not quite. It goes inside the module marked #[program], where Anchor finds a program's instructions.",
      line: 5,
    },
    explainError:
      "In Anchor every instruction receives its accounts through a struct marked #[derive(Accounts)]. Line 9 asks for Context<Hello>, but Hello is never declared. hello reads no accounts, so an empty struct is enough.",
    chips: [
      {
        label: "Why is this needed",
        answer:
          "Without #[derive(Accounts)] Anchor can't tell which accounts an instruction expects, so it can't generate the code that checks them. An instruction that reads no accounts still needs the struct. It's just empty.",
      },
      {
        label: "Show in docs",
        answer: "The Anchor docs cover it in Program Structure, in the section on #[derive(Accounts)]: anchor-lang.com/docs/basics/program-structure",
      },
    ],
  },
  {
    id: "deploy",
    title: "Build & Deploy",
    objective: "Deploy the program to devnet",
    checkedBy: "the program is live on devnet",
    learned: "Deploying through Kora with 0 SOL",
    lesson: [
      { kind: "h", text: "Build" },
      { kind: "p", text: "The build compiles your program on the server and produces its IDL, the list of instructions a client can call." },
      { kind: "h", text: "Deploy" },
      { kind: "p", text: "On devnet Kora pays the rent, so you deploy with 0 SOL and no wallet. A program nobody calls for 7 days is closed. Deploy again any time to bring it back." },
    ],
    file: "src/lib.rs",
    focus: [],
    cta: "Deploy to devnet",
    deploy: {
      stages: ["Writing buffer", "Deploying", "Confirming"],
      result: {
        ok: true,
        log: [
          "$ deploy --network devnet",
          "Writing buffer... 100%",
          "Deploying through Kora · 0 SOL",
          `Program Id: ${PROGRAM_ID}`,
          "Deploy successful",
        ],
        note: "Live on devnet. It closes after 7 days without calls.",
      },
    },
    explainStep:
      "Deploying puts your built program on devnet, Solana's public test network. Kora covers the cost, so this works without a wallet. Press Deploy to devnet and wait for the program id.",
    chips: [
      {
        label: "Why 7 days",
        answer:
          "Kora pays the rent for programs on devnet. To keep that free for everyone, a program nobody calls for 7 days is closed. Deploy again and you get it back.",
      },
      {
        label: "What is devnet",
        answer: "Devnet is Solana's public network for testing. It behaves like mainnet, but its SOL has no value.",
      },
    ],
  },
  {
    id: "call-client",
    title: "Client",
    objective: "Call the instruction from the TypeScript client",
    checkedBy: "the client gets a transaction back",
    learned: "Calling a program from TypeScript",
    lesson: [
      { kind: "h", text: "Playground globals" },
      { kind: "p", text: "In Playground the `pg` namespace already holds your program, wallet and connection. Outside Playground you would set them up yourself." },
      { kind: "code", code: "console.log(pg.PROGRAM_ID.toString());" },
      { kind: "h", text: "Call hello" },
      { kind: "p", text: "`pg.program.methods` has a method for every instruction in the IDL. `.rpc()` sends the transaction and returns its signature." },
      { kind: "code", code: "const txHash = await pg.program.methods.hello().rpc();" },
    ],
    file: "client/client.ts",
    focus: [1],
    cta: "Write with assistant",
    patch: {
      file: "client/client.ts",
      before: CLIENT_START,
      after: CLIENT_CALL,
      summary: "I'll call hello from the client and print the transaction, so you can find its logs.",
      notes: [
        { line: 2, text: "pg.program knows hello from the IDL the build made. .rpc() sends the transaction and returns its signature." },
        { line: 3, text: "The signature is how you find the transaction, and the line hello logged, on devnet." },
      ],
      result: {
        ok: true,
        log: [
          "$ run client/client.ts",
          "Running client...",
          "Use 'solana confirm -v 4sGjMW1sUnHzSxGspuhpqLDx6wiyjNtZAMdL4VZHirAn' to see the logs",
          "Client finished",
        ],
        note: "The client called hello and got a transaction back.",
      },
    },
    explainStep:
      "A client is code outside the program that sends it transactions. Here it's a short TypeScript file. I'll write the call to hello as a patch, then run it.",
    chips: [
      {
        label: "What is pg",
        answer: "pg is Playground's global with your program, wallet and connection already set up. pg.program knows hello from the IDL the build produced.",
      },
    ],
  },
  {
    id: "greet-by-name",
    title: "Name argument",
    objective: "Give hello a name argument and log it",
    checkedBy: "the build shows hello taking a name",
    learned: "Passing arguments to an instruction",
    lesson: [
      { kind: "h", text: "Instruction arguments" },
      { kind: "p", text: "Arguments come after the `Context`. Anchor serializes them for you, so a `String` works as is." },
      { kind: "code", code: `pub fn hello(_ctx: Context<Hello>, name: String) -> Result<()> {
    msg!("Hello, {}!", name);
    Ok(())
}` },
      { kind: "p", text: "After the build the Test UI shows a field for `name`." },
    ],
    file: "src/lib.rs",
    focus: [9, 10],
    cta: "Write with assistant",
    patch: {
      file: "src/lib.rs",
      before: LIB_FIXED,
      after: LIB_NAMED,
      summary: "I'll add a name: String argument to hello and put it in the log line.",
      notes: [
        { line: 9, text: "Arguments come after the Context. Anchor serializes the String for you, so nothing else changes." },
        { line: 10, text: "msg! fills each {} with the next value, here the name." },
      ],
      result: {
        ok: true,
        log: [...BUILD_OK, "IDL: 1 instruction · hello(name: string)", "Build successful"],
        note: "The build passed and hello now takes a name.",
      },
    },
    predict: {
      question: "Where does the name argument go?",
      options: ["After the Context: hello(_ctx, name: String)", "Inside the Hello struct", "Inside msg!"],
      answer: 0,
      right: "Right. Arguments come after the Context, and Anchor serializes them for you.",
      wrong: "Not quite. It goes after the Context: hello(_ctx, name: String). Anchor serializes it for you.",
      line: 9,
    },
    explainStep:
      "Instructions can take arguments after their Context. This step adds a name to hello and logs it, so the Test UI asks you for one.",
    chips: [
      {
        label: "Which types work",
        answer: "Any type Anchor can serialize: numbers, bool, String, Pubkey, Vec and your own structs with AnchorSerialize.",
      },
    ],
  },
]

export const NEXT_TUTORIAL = TUTORIALS.find((t) => t.slug === "counter-pda-tutorial")!
