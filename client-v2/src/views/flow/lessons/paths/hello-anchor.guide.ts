import type { LessonGuide } from "../guide";

/*
 * What the tutorial's assistant says and proposes on each Hello Anchor step
 * when no model is connected. Carried over from the standalone prototype,
 * where reviewers asked to keep it: a patch per step, and a first build that
 * fails on purpose so the learner sees how Anchor reports a missing piece.
 * The failure is real here: the build server compiles the patch and rustc
 * reports E0412, the guide only knows to expect it.
 */

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
}
`;

const HELLO_STRUCT = `
#[derive(Accounts)]
pub struct Hello {}
`;

// Both read the file as it is: the build has written the program's real id
// into `declare_id!` by now, and a patch must not put the placeholder back
const withStruct = (now: string | null) =>
  /struct\s+Hello\b/.test(now ?? "")
    ? now!
    : `${(now ?? LIB_BROKEN).trimEnd()}\n${HELLO_STRUCT}`;

const withName = (now: string | null) =>
  withStruct(now)
    .replace(
      /pub fn hello\(_ctx: Context<Hello>\)/,
      "pub fn hello(_ctx: Context<Hello>, name: String)"
    )
    .replace('msg!("Hello, World!");', 'msg!("Hello, {}!", name);');

const CLIENT_CALL = `// Call the hello instruction
const txHash = await pg.program.methods.hello().rpc();
console.log(\`Use 'solana confirm -v \${txHash}' to see the logs\`);
`;

export const helloAnchorGuide: LessonGuide = {
  "write-program": {
    intro:
      "This step writes the smallest Anchor program there is: one instruction, `hello`, that writes a line to the program log.\n\n" +
      "Two ways through: write it in `lib.rs` and press **Build**, or press **Write it for me** and I'll propose it as a patch you read and apply. The build decides when the step is done.",
    explain:
      "An Anchor program is a Rust module marked `#[program]`. Each public function in it is an instruction a client can call. `hello` gets a `Context` with the accounts it needs (none), calls `msg!` to log a line and returns `Ok`.",
    hints: [
      "Where in an Anchor program do instructions live?",
      "Instructions go inside the module marked `#[program]` in `src/lib.rs`, after `declare_id!`.",
    ],
    check: {
      question: "Where does the hello instruction go?",
      options: [
        "Inside the `#[program]` module",
        "Inside the `Hello` struct",
        "Inside `declare_id!`",
      ],
      answer: 0,
      right:
        "Right. Anchor finds a program's instructions in the module marked `#[program]`.",
      wrong:
        "Not quite. It goes inside the module marked `#[program]`, which is where Anchor looks for instructions.",
    },
    patch: {
      path: "src/lib.rs",
      content: LIB_BROKEN,
      say: "I'll import Anchor, declare the program id and add a `hello` instruction that logs “Hello, World!”. I'm leaving one piece out on purpose, so the first build shows how Anchor reports it.",
      done: "Applied. Press **Build**: this first one is meant to fail.",
    },
    fix: {
      // rustc reports the missing struct as E0412 on `Hello`, among the
      // errors that follow from it. Anything else is the learner's own
      expects: (diagnostics) =>
        diagnostics.some(
          (d) => d.code === "E0412" && d.title.includes("`Hello`")
        ),
      explain:
        "The build failed because `hello` asks for `Context<Hello>`, but `Hello` is never declared. In Anchor every instruction receives its accounts through a struct marked `#[derive(Accounts)]`. `hello` reads no accounts, so an empty struct is enough.",
      patch: {
        path: "src/lib.rs",
        content: withStruct,
        say: "Here is the fix: an empty `Hello` accounts struct at the end of the file.",
        done: "Applied. Press **Rebuild**, and the IDL will list `hello`.",
      },
    },
  },
  deploy: {
    intro:
      "Deploying puts your built program on devnet, Solana's public test network. Press **Deploy to devnet** and wait for the program id. Kora pays the rent, so it costs you 0 SOL and needs no wallet. A program nobody calls for 7 days is closed; deploy again any time to bring it back.",
    explain:
      "The build made a program binary and its IDL. Deploying uploads the binary to devnet, where it gets an address, the program id, that clients call.",
    hints: [
      "What has to be true before a deploy can succeed?",
      "The build has to pass in this session. Then Kora covers the rent, so no wallet or SOL is needed.",
    ],
  },
  "call-client": {
    intro:
      "A client is code outside the program that sends it transactions. Here it's a short TypeScript file, `client/client.ts`.\n\n" +
      "Write the call to `hello` yourself, or press **Write it for me** and I'll propose it. Then press **Run the client**.",
    explain:
      "In Playground the `pg` namespace already holds your program, wallet and connection. `pg.program.methods` has a method for every instruction in the IDL, and `.rpc()` sends the transaction and returns its signature.",
    hints: [
      "How does the client know which instructions your program has?",
      "From the IDL the build made: `pg.program.methods.hello()` builds the call, `.rpc()` sends it.",
    ],
    patch: {
      path: "client/client.ts",
      content: CLIENT_CALL,
      say: "I'll call `hello` from the client and print the transaction, so you can find its logs.",
      done: "Applied. Press **Run the client**: the transaction and the line `hello` logged come back in the terminal.",
    },
  },
  "greet-by-name": {
    intro:
      "Instructions can take arguments after their `Context`. This step adds a `name` to `hello` and logs it.\n\n" +
      "Change `lib.rs` yourself and press **Build**, or press **Write it for me**. Then call `hello` with your name: the log comes back with it.",
    explain:
      "Arguments come after the `Context`, and Anchor serializes them for you, so a `String` works as is. `msg!` fills each `{}` with the next value.",
    hints: [
      "Where does an instruction's argument go?",
      "After the `Context`: `hello(_ctx: Context<Hello>, name: String)`, and `{}` in `msg!` takes it.",
    ],
    check: {
      question: "Where does the name argument go?",
      options: [
        "After the `Context`",
        "Inside the `Hello` struct",
        "Inside the `msg!` call",
      ],
      answer: 0,
      right:
        "Right. Arguments come after the `Context`, and Anchor serializes them for you.",
      wrong:
        "Not quite. It goes after the `Context`: `hello(_ctx: Context<Hello>, name: String)`.",
    },
    patch: {
      path: "src/lib.rs",
      content: withName,
      say: "I'll add a `name: String` argument to `hello` and put it in the log line.",
      done: "Applied. Press **Build**, then call `hello` with your name.",
      // The client calls `hello` too, and would go on calling it with no name
      then: {
        path: "client/client.ts",
        content: (now) =>
          (now ?? CLIENT_CALL).replace(
            /\.hello\(\s*\)/,
            '.hello("Solana")'
          ),
        say: "The client calls `hello` as well, so it has to pass a name now. I'll give it one.",
        done: "Both applied. Press **Build**, then call `hello` with your own name.",
      },
    },
  },
};
