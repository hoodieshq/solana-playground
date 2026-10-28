import { holds, lineOf } from "../check"
import type { State } from "../store"
import { CLIENT, LIB, shortKey } from "./common"
import type { Chop, Lesson, Player, SpecialCheck, Step, Tx } from "./types"

// Lumberjack: a player account at a PDA, an instruction that spends energy for wood and refuses with
// a custom error when it runs out, and energy that refills over time without a transaction to do it.
// After Jonas Hahn's Lumberjack tutorial, trimmed to what the lesson teaches: the fields nothing
// used are gone and the account's space is worked out by `InitSpace` instead of guessed

const PROGRAM_ID = "ThZM3PwXHRhmRXh5PhH1HsPfhwB17HTyHqKofPoFFw3Z"
const IDL_ACCOUNT = "Mj9R7ssK7BVqFj13V9oKmsmXmbuBhVqd1f5HH9FsDw7h"
/** The player's address: the PDA from "player" and the learner's wallet */
export const PLAYER_PDA = "oHZTMoV3ZFy3wKdFhMPoHTuhFshhPjwd9B9ffydKqbjj"
const INIT_SIGNATURE = "BPfy1ufKhVKDo5jby1DTy5fwbRmyRfRfsDbsfPdPMPd1mdBoGB3yFPXosfTyBFKMB5bqR75Ks7mfZHRh9mDV7PMj"

export const MAX_ENERGY = 5
/** Seconds for one energy to come back, as the program's constant says */
export const REFILL_S = 30

// The program, piece by piece, in the order it sits in lib.rs

const BOIL = `use anchor_lang::prelude::*;

declare_id!("11111111111111111111111111111111");

const MAX_ENERGY: u64 = 5;
const TIME_TO_REFILL_ENERGY: i64 = 30;`

const ERRORS = `#[error_code]
pub enum ErrorCode {
    #[msg("Not enough energy")]
    NotEnoughEnergy,
}`

const INIT_FN = `    pub fn init_player(ctx: Context<InitPlayer>) -> Result<()> {
        let player = &mut ctx.accounts.player;
        player.energy = MAX_ENERGY;
        player.last_login = Clock::get()?.unix_timestamp;
        Ok(())
    }`

const CHOP_FN = `    pub fn chop_tree(ctx: Context<ChopTree>) -> Result<()> {
        let player = &mut ctx.accounts.player;
        if player.energy == 0 {
            return err!(ErrorCode::NotEnoughEnergy);
        }
        player.energy -= 1;
        player.wood += 1;
        msg!("You chopped a tree. {} wood, {} energy left.", player.wood, player.energy);
        Ok(())
    }`

const WIRE = `        update_energy(player)?;`

const UPDATE_FN = `fn update_energy(player: &mut PlayerData) -> Result<()> {
    let now = Clock::get()?.unix_timestamp;
    let refills = (now - player.last_login) / TIME_TO_REFILL_ENERGY;
    if refills > 0 {
        player.energy = (player.energy + refills as u64).min(MAX_ENERGY);
        player.last_login += refills * TIME_TO_REFILL_ENERGY;
    }
    if player.energy == MAX_ENERGY {
        player.last_login = now;
    }
    Ok(())
}`

const SYSTEM = `    pub system_program: Program<'info, System>,`

const initAccounts = (system: boolean) => `#[derive(Accounts)]
pub struct InitPlayer<'info> {
    #[account(
        init,
        payer = signer,
        space = 8 + PlayerData::INIT_SPACE,
        seeds = [b"player", signer.key().as_ref()],
        bump,
    )]
    pub player: Account<'info, PlayerData>,
    #[account(mut)]
    pub signer: Signer<'info>,${system ? `\n${SYSTEM}` : ""}
}`

const CHOP_ACCOUNTS = `#[derive(Accounts)]
pub struct ChopTree<'info> {
    #[account(
        mut,
        seeds = [b"player", signer.key().as_ref()],
        bump,
    )]
    pub player: Account<'info, PlayerData>,
    pub signer: Signer<'info>,
}`

const PLAYER_DATA = `#[account]
#[derive(InitSpace)]
pub struct PlayerData {
    pub wood: u64,
    pub energy: u64,
    pub last_login: i64,
}`

type Parts = { module?: boolean; chop?: boolean; wire?: boolean; errors?: boolean; update?: boolean; init?: "broken" | "fixed"; chopAccounts?: boolean; data?: boolean }

/** lib.rs with the pieces written so far, each in its place. Every write is placed by the file as it
 * stands right after it, so the pieces still to come never pull their lines in: the program repeats
 * lines like `}` and `let player = ...`, and a reference holding unwritten ones would misplace them */
function lib(p: Parts) {
  const fns = [INIT_FN, ...(p.chop ? [p.wire ? CHOP_FN.replace("ctx.accounts.player;\n", `ctx.accounts.player;\n${WIRE}\n`) : CHOP_FN] : [])]
  const module = `#[program]
mod lumberjack {
    use super::*;

${fns.join("\n\n")}
}`
  const parts = [
    BOIL,
    p.errors && ERRORS,
    p.module && module,
    p.update && UPDATE_FN,
    p.init && initAccounts(p.init === "fixed"),
    p.chopAccounts && CHOP_ACCOUNTS,
    p.data && PLAYER_DATA,
  ]
  return parts.filter(Boolean).join("\n\n")
}

const S1 = { module: true, init: "fixed", data: true } as const
const LIB_BROKEN = lib({ ...S1, init: "broken" })
const LIB_S1 = lib(S1)
const LIB_S3 = lib({ ...S1, errors: true, chop: true, chopAccounts: true })
const LIB_S4 = lib({ ...S1, errors: true, chop: true, chopAccounts: true, update: true, wire: true })

/** The client's first lines: the player's address, worked out from the seeds. Step 2's question writes them */
const CLIENT_PDA = `// Your player's address: the same seeds as InitPlayer, so nobody has to store it
const [playerPda] = web3.PublicKey.findProgramAddressSync(
  [Buffer.from("player"), pg.wallet.publicKey.toBuffer()],
  pg.program.programId
);`

const CLIENT_CREATE = `// Create the account once. On later runs it's already there
let player = await pg.program.account.playerData.fetchNullable(playerPda);
if (!player) {
  const txHash = await pg.program.methods.initPlayer().rpc();
  console.log(\`Use 'solana confirm -v \${txHash}' to see the logs\`);
  player = await pg.program.account.playerData.fetch(playerPda);
}
console.log(\`Wood: \${player.wood}, energy: \${player.energy}\`);`

const CLIENT_INIT = `${CLIENT_PDA}\n\n${CLIENT_CREATE}`

/** The line of `init,` in the first build, which the planned failure points at */
const INIT_LINE = LIB_BROKEN.split("\n").findIndex((l) => l.trim() === "init,") + 1

const EXPLAIN_ERROR = `\`init\` on line ${INIT_LINE} creates the player account. On Solana only the System Program creates accounts, so Anchor calls it for you, and it has to be in the instruction's list of accounts. \`InitPlayer\` doesn't have it yet.`

const UPGRADES = `Upgrades ${shortKey(PROGRAM_ID).replace("…", "…⁠")} in place · from your wallet`

const CLOCK = {
  match: /\b(clock|unix|timestamp)\b/i,
  answer:
    "`Clock::get()` reads the cluster's clock, the time every validator agrees on. `unix_timestamp` is seconds since 1970: the same number JavaScript's `Date.now()` gives in milliseconds.",
}

const STEPS: Step[] = [
  {
    id: "player",
    title: "Player account",
    short: "Player",
    objective: "Keep each player's wood and energy in an account",
    learned: "Keeping state in an account",
    file: LIB,
    start: "",
    target: LIB_S1,
    goal: "build",
    beats: [
      {
        kind: "write",
        id: "s1.boil",
        text: "Same opening as Hello Anchor: the import and the program's id. Under them, the game's two rules: 5 energy at most, and one back every 30 seconds.",
        writes: { file: LIB, block: BOIL, ref: lib({}) },
      },
      {
        kind: "write",
        id: "s1.data",
        text: "A program keeps nothing between calls, so a player's wood and energy live in an account. This is its shape. `#[account]` makes it account data, and `InitSpace` counts the bytes it needs.",
        writes: { file: LIB, block: PLAYER_DATA, ref: lib({ data: true }) },
      },
      {
        // The seeds are written, not asked: step 2 asks about the address, where the client needs it
        kind: "write",
        id: "s1.accounts",
        text: 'And `InitPlayer`, what creating a player needs. `init` makes the account at an address worked out from seeds, here `"player"` and your wallet\'s key, so every wallet gets one player. More on that address when your client looks for it.',
        writes: { file: LIB, block: initAccounts(false), ref: lib({ init: "broken", data: true }) },
      },
      {
        kind: "write",
        id: "s1.init",
        text: "And `init_player` fills the new account in: full energy, and the time from the cluster's clock, so the program can tell later how long you've been away.",
        writes: { file: LIB, block: `#[program]\nmod lumberjack {\n    use super::*;\n\n${INIT_FN}\n}`, ref: LIB_BROKEN },
      },
      {
        kind: "act",
        id: "s1.build",
        act: "build",
        say: "That's the first part of the game. Let's compile it.",
        title: "Build lib.rs",
        context: "Compiles lib.rs on Playground's build server",
        button: "Build",
      },
    ],
    planned: "This one's on purpose. Everyone who creates their first account meets this error, so let's meet it now.",
    plannedShort: `\`init\` on line ${INIT_LINE} creates an account, and \`InitPlayer\` has no \`system_program\` to create it with.`,
    onFail: [
      { kind: "say", id: "f1.explain", text: EXPLAIN_ERROR, quote: { file: LIB, line: INIT_LINE, mark: "init", tone: "error" } },
      {
        kind: "ask",
        id: "f1.q",
        kicker: "Fix it",
        question: "So what does `InitPlayer` need?",
        options: ["More SOL in your wallet", "The System Program, as `system_program`", "`mut` on the `player` account"],
        code: false,
        answer: 1,
        right: "Exactly. With `system_program` in the list, `init` can ask it to create the account. I've added it under `signer`.",
        why: [
          "Your wallet gets its SOL at the deploy, and this error comes from the build, before anything is sent.",
          null,
          "`init` already makes `player` writable. The build is asking for the program that creates accounts.",
        ],
        hint: "Read the error again: it names the field that's missing.",
        writes: { file: LIB, block: SYSTEM, ref: LIB_S1 },
        key: "pub system_program: Program<'info, System>,",
        typed: "That's the field. Now `init` can ask the System Program to create the account.",
      },
      {
        kind: "act",
        id: "f1.build",
        act: "build",
        say: "Build again. This time it should pass.",
        title: "Build lib.rs",
        context: "Same build, now with `system_program`",
        button: "Build",
      },
    ],
    win: {
      id: "s1.win",
      headline: "Your program can make players.",
      line: "The build wrote its IDL: one instruction, `init_player`, and the shape of `PlayerData`.",
      stats: [
        { icon: "hammer", text: "Built in 1.6 s" },
        { icon: "braces", text: "1 instruction" },
        { icon: "clock", text: "{took}" },
      ],
    },
    explainStep:
      "This step writes the account that holds a player's wood and energy, and `init_player`, which creates it. I write the pieces and explain them. The first build fails on purpose, on the error everyone meets with their first account, and you pick the fix.",
    chips: [
      {
        label: "What is a PDA?",
        match: /\bpdas?\b|program derived/i,
        answer:
          "A Program Derived Address: an address made from seeds and the program id instead of a key pair. Nobody holds a private key for it, so only your program can sign for it, and anyone can find it again from the same seeds.",
      },
      {
        label: "What does InitSpace do?",
        match: /\b(initspace|space)\b/i,
        answer:
          "`#[derive(InitSpace)]` adds up the bytes the fields take: three 8 byte numbers, so 24. `space` adds 8 more for the discriminator Anchor puts in front of every account.",
      },
    ],
    errorChips: [
      {
        label: "Why does init need the System Program?",
        match: /system[_ ]?program/i,
        answer:
          "Every account on Solana is created by the System Program: it takes the rent deposit and hands the new account to its owner, your program. `init` calls it for you, but Anchor needs it among the accounts the instruction receives.",
      },
      {
        label: "Where is this in the docs?",
        match: /\b(docs?|documentation)\b/i,
        answer: "The Anchor docs cover it in [Account Constraints](https://www.anchor-lang.com/docs/references/account-constraints), in the section on `init`.",
      },
    ],
    answers: [CLOCK, { match: /why.*(fail|error)/i, answer: EXPLAIN_ERROR, local: true }],
  },
  {
    id: "create",
    title: "Deploy & create",
    short: "Create",
    objective: "Deploy, find your player's address and create it on devnet",
    learned: "Finding an account at a PDA from a client",
    file: CLIENT,
    start: "",
    target: CLIENT_INIT,
    goal: "run",
    beats: [
      {
        kind: "act",
        id: "s2.deploy",
        act: "deploy",
        say: "Your program is built, but it isn't on devnet yet. Deploy it, and a client can call it.",
        title: "Deploy to devnet",
        context: "From your Playground wallet · free devnet SOL",
        button: "Deploy",
      },
      {
        kind: "say",
        id: "s2.pda",
        text: "Now the client. To create your player and read it back, it needs the account's address, and nothing wrote that address down anywhere. That's what a PDA is for: an address derived from seeds and the program id.",
      },
      {
        kind: "ask",
        id: "s2.q1",
        kicker: "Question",
        n: 1,
        question: "So how does your client get your player's address?",
        options: [
          "It asks the program for it with a call",
          "It works it out from the same seeds and the program id",
          "It saves it when the player is created, and reads it back later",
        ],
        code: false,
        answer: 1,
        right: "Yes. The same seeds and the same program always give the same address, so any client finds your player and nobody stores it. I've written the line that works it out.",
        why: [
          "That would be a transaction and a fee just to learn an address. A PDA is worked out on your side, without calling anything.",
          null,
          "Then it only lives where you saved it: on another device, or for anyone else, your player would be lost. A PDA needs no storing.",
        ],
        hint: "Think about what made the address in `InitPlayer`, and what your client already knows.",
        skipped: "No problem. The client works the address out from the same seeds, `\"player\"` and your wallet's key. I've written that line.",
        writes: { file: CLIENT, block: CLIENT_PDA, ref: CLIENT_PDA },
        key: '[Buffer.from("player"), pg.wallet.publicKey.toBuffer()],',
        typed: 'That\'s the line: `"player"` and your wallet\'s key, the same seeds as `InitPlayer`. I\'ve written the call around it.',
      },
      {
        kind: "write",
        id: "s2.client",
        text: "The rest you know from Hello Anchor: the client reads your player at that address, and creates the account if it isn't there yet.",
        writes: { file: CLIENT, block: CLIENT_CREATE, ref: CLIENT_INIT },
      },
      {
        kind: "act",
        id: "s2.run",
        act: "run",
        say: "Run it, and your player is created on devnet.",
        title: "Run client.ts",
        context: "Calls `init_player` · rent and fee from your wallet",
        button: "Run",
      },
    ],
    win: {
      id: "s2.win",
      headline: "Your player is on devnet.",
      line: "That's your account, read back from devnet: 5 energy, 0 wood. The client found it from the seeds alone.",
      stats: [
        { icon: "rocket", text: "Live on devnet" },
        { icon: "zap", text: "5 energy" },
        { icon: "coins", text: "Rent 0.0011 SOL" },
      ],
      extra: "openTest",
    },
    testWin: "You called `init_player` from the Call panel, which Playground built from the IDL. Your player is on devnet.",
    explainStep: "This step puts the program on devnet, then a client works out your player's address from the seeds and creates the account. Your wallet pays the deploy, the rent and the fee, all in free devnet SOL.",
    chips: [
      {
        label: "What is a PDA?",
        match: /\bpdas?\b|program derived/i,
        answer:
          "A Program Derived Address: an address made from seeds and the program id instead of a key pair. Nobody holds a private key for it, so only your program can sign for it, and anyone can find it again from the same seeds.",
      },
      {
        label: "What is rent?",
        match: /\brent\b/i,
        answer:
          "An account holds a small deposit of SOL, rent, for the space it takes: about 0.0011 SOL for this one, from your wallet in devnet SOL. Close the account and the deposit comes back.",
      },
      {
        label: "What is devnet SOL?",
        match: /\b(devnet sol|test sol|airdrop|faucet|wallet)\b/i,
        answer:
          "Devnet is Solana's public test network. Its SOL is free and worth nothing, so you can deploy and call as much as you like. Playground keeps your wallet topped up from the devnet faucet.",
      },
    ],
    // Three chips at most: fetchNullable is still answered when asked, just not offered
    answers: [
      {
        match: /\bfetch/i,
        answer:
          "`fetchNullable` reads the account at an address and decodes it with the IDL, or gives back `null` when nothing is there. That's how the client knows whether to create your player.",
      },
      {
        match: /\bseeds?\b/i,
        answer: 'The client uses the same seeds as `InitPlayer`: `"player"` and your wallet\'s key. Same seeds and same program give the same address, so nobody has to store it.',
      },
    ],
  },
  {
    id: "chop",
    title: "Chop",
    short: "Chop",
    objective: "Spend energy for wood, and refuse when it runs out",
    learned: "Returning a custom error from an instruction",
    file: LIB,
    start: LIB_S1,
    target: LIB_S3,
    goal: "chop",
    beats: [
      {
        kind: "write",
        id: "s3.err",
        text: "First, a way to say no. A custom error has a name and a message, so a client can tell \"out of energy\" from anything else and show a refill timer.",
        writes: { file: LIB, block: ERRORS, ref: lib({ ...S1, errors: true }) },
      },
      {
        kind: "say",
        id: "s3.what",
        text: "`chop_tree` spends one energy for one wood. Before it does, it has to check there's energy to spend, and refuse if there isn't.",
      },
      {
        kind: "ask",
        id: "s3.q3",
        kicker: "Question",
        n: 2,
        question: "What should `chop_tree` do when the energy is 0?",
        options: [
          "if player.energy == 0 { return err!(ErrorCode::NotEnoughEnergy); }",
          "if player.energy == 0 { return Ok(()); }",
          'if player.energy == 0 { panic!("Not enough energy"); }',
        ],
        code: true,
        answer: 0,
        right: "Right. `err!` stops the instruction and returns your error, so nothing changes and the client knows why. I've written `chop_tree` around it.",
        why: [
          null,
          "Then the chop \"works\": the player pays the fee, gets no wood, and the client can't tell why.",
          "The transaction fails, but with a generic error. The client can't tell it from a bug, so it can't offer a refill timer.",
        ],
        hint: "The client should be able to tell this case from any other, by its name.",
        writes: { file: LIB, block: CHOP_FN, ref: lib({ ...S1, errors: true, chop: true }) },
        key: "return err!(ErrorCode::NotEnoughEnergy);",
        typed: "That's the line. `err!` returns your error, and I've written the rest of `chop_tree` around it.",
      },
      {
        kind: "write",
        id: "s3.accounts",
        text: "And its accounts: the same player address from the same seeds, marked `mut` because chopping changes it.",
        writes: { file: LIB, block: CHOP_ACCOUNTS, ref: LIB_S3 },
      },
      {
        kind: "act",
        id: "s3.ship",
        act: "buildDeploy",
        say: "Devnet still runs the program without `chop_tree`. Build and deploy: it keeps its address.",
        title: "Build and deploy",
        context: UPGRADES,
        button: "Build and deploy",
      },
      {
        kind: "act",
        id: "s3.chop",
        act: "chop",
        say: "Now chop. Keep going until the energy runs out.",
        title: "Chop a tree",
        context: "Sends `chop_tree` · fee from your wallet",
        button: "Chop",
      },
    ],
    win: {
      id: "s3.win",
      headline: "Out of energy, and the program said so.",
      line: "Five chops, five wood, then `NotEnoughEnergy` came back from devnet as error 6000. A client turns that into a refill timer.",
      stats: [
        { icon: "trees", text: "5 wood" },
        { icon: "alert", text: "Error 6000" },
        { icon: "clock", text: "{took}" },
      ],
    },
    testWin: "You chopped from the Call panel until the energy ran out, and `NotEnoughEnergy` came back as error 6000.",
    explainStep: "This step adds `chop_tree`: one energy for one wood, and a custom error when the energy runs out. Then you chop on devnet until it does.",
    chips: [
      {
        label: "What does err! do?",
        match: /\berr!|\berror_?code\b/i,
        answer:
          "`err!` builds an Anchor error from your `ErrorCode` and returns it. Anchor numbers custom errors from 6000, so `NotEnoughEnergy` is 6000, and it comes back in the transaction's logs with its message.",
      },
      {
        label: "Does a failed chop cost a fee?",
        match: /\b(fee|fees|cost)\b/i,
        answer: "Yes, a failed transaction still pays its fee, here from your wallet. Nothing else changes: a failure rolls back everything the instruction did.",
      },
    ],
    answers: [
      {
        match: /\bmut\b/i,
        answer: "`mut` tells Anchor the instruction writes to the account, so it's passed as writable and saved after the instruction. Without it, changes to `player` would be refused.",
      },
    ],
  },
  {
    id: "refill",
    title: "Refill",
    short: "Refill",
    objective: "Refill energy over time, with no transaction to do it",
    learned: "Working with time in a program",
    file: LIB,
    start: LIB_S3,
    target: LIB_S4,
    goal: "chop",
    beats: [
      {
        kind: "say",
        id: "s4.why",
        text: "Your energy is at 0, and nothing in the program gives it back. A program only runs when someone calls it, so nothing on devnet can top it up every 30 seconds.",
      },
      {
        kind: "ask",
        id: "s4.q4",
        kicker: "Question",
        n: 3,
        question: "So when should the energy come back?",
        options: ["Every 30 seconds, by itself on devnet", "On the next chop, from the time since `last_login`", "When the client sends a refill every 30 seconds"],
        code: false,
        answer: 1,
        right: "Yes. On every chop the program counts the 30 second blocks since `last_login` and adds that much energy. Nothing runs in between. I've written `update_energy` for it.",
        why: [
          "A program never runs on its own: it only runs inside a transaction someone sends.",
          null,
          "That works, but every refill would be a transaction with a fee, sent forever, even while nobody plays.",
        ],
        hint: "Nothing happens on chain unless someone sends a transaction. Which one is coming anyway?",
        writes: { file: LIB, block: UPDATE_FN, ref: lib({ ...S1, errors: true, chop: true, chopAccounts: true, update: true }) },
        key: "fn update_energy(player: &mut PlayerData) -> Result<()> {",
        typed: "That's the function. I've filled in the rest: it counts the 30 second blocks since `last_login`.",
      },
      {
        kind: "write",
        id: "s4.wire",
        text: "And `chop_tree` calls it first, so every chop starts from the energy you have now.",
        writes: { file: LIB, block: WIRE, ref: LIB_S4 },
      },
      {
        kind: "act",
        id: "s4.ship",
        act: "buildDeploy",
        say: "Build and deploy the refill. Your player keeps its wood: the account doesn't change, only the program.",
        title: "Build and deploy",
        context: UPGRADES,
        button: "Build and deploy",
      },
      {
        kind: "act",
        id: "s4.chop",
        act: "chop",
        say: "Chop again. Time has passed since you made your player.",
        title: "Chop a tree",
        context: "Sends `chop_tree` · the energy is worked out first",
        button: "Chop",
      },
    ],
    win: {
      id: "s4.win",
      headline: "Energy comes back on its own.",
      line: "Nothing ran while you were away: the chop counted the time since `last_login` and added the energy. The timer on your player is the client doing the same math, with no transaction.",
      stats: [
        { icon: "zap", text: "1 energy / 30 s" },
        { icon: "cpu", text: "0 extra transactions" },
        { icon: "clock", text: "{took}" },
      ],
    },
    testWin: "You chopped from the Call panel, and the energy that came back while you were away was there.",
    explainStep: "This step makes energy refill over time. The program counts the time since `last_login` on every chop, so nothing has to run in between.",
    chips: [
      {
        label: "Why not a timer on chain?",
        match: /\b(timer|cron|schedul\w*)\b/i,
        answer: "Programs don't run on their own: every instruction runs inside a transaction someone sent. So the time is counted lazily, when the next call comes.",
      },
      {
        label: "Can a player cheat the clock?",
        match: /\b(cheat|bot|bots|hack)\b/i,
        answer: "Not here: the time comes from the cluster's clock, not from the player. The best a bot can do is chop the moment energy is back, which a player can do too.",
      },
    ],
    answers: [CLOCK],
  },
]

// The two slips a first account struct meets: the planned one, `init` without the System Program,
// and the `mut` a payer needs
const CHECKS: SpecialCheck[] = [
  ({ code, bare, file, head, failed }) => {
    if (!/#\[account\(\s*init\b/.test(bare.replace(/\s+/g, " ").replace("( ", "(")) || /\bsystem_program\s*:/.test(bare)) return null
    const line = lineOf(code, "init,")
    const row = bare.split("\n")[line - 1] ?? ""
    const column = row.indexOf("init") + 1
    return {
      ok: false,
      planned: true,
      line,
      column,
      span: "init".length,
      log: [
        ...head,
        "error: the init constraint requires the system_program field to exist in the account validation struct. Use the Program type to add the system_program field to your validation struct.",
        ` --> ${file}:${line}:${column}`,
        "Build failed",
      ],
      reason: `${failed}: \`init\` on line ${line} needs \`system_program\` in \`InitPlayer\`.`,
      explain: EXPLAIN_ERROR,
    }
  },
  ({ code, bare, file, head, failed }) => {
    if (!/payer\s*=\s*signer/.test(bare) || /#\[account\(\s*mut\s*\)\]\s*pub\s+signer/.test(bare)) return null
    const line = lineOf(code, "pub signer")
    return {
      ok: false,
      line,
      log: [...head, "error: the payer specified for an init constraint must be mutable.", ` --> ${file}:${line}`, "Build failed"],
      reason: `${failed}: \`signer\` on line ${line} pays for the account, so it has to be \`mut\`.`,
      explain: "`payer = signer` takes the rent from `signer`, which changes its balance, so Anchor needs it writable. Put `#[account(mut)]` on the line above `pub signer`.",
    }
  },
]

// ---- The game: what the program does with the player account, worked out the way it would

const ms = REFILL_S * 1000

/** Whether the program on devnet works out the refill before a chop */
const refills = (s: State) => s.deployedLib !== null && holds(s.deployedLib, WIRE)

/** A signature for the nth chop: base58, 88 characters, the same for the same chop on every reload */
function signatureOf(n: number) {
  const A = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz"
  let x = (n + 1) * 2654435761
  return Array.from({ length: 88 }, () => {
    x = (x ^ (x << 13)) >>> 0
    x = (x ^ (x >>> 17)) >>> 0
    x = (x ^ (x << 5)) >>> 0
    return A[x % 58]
  }).join("")
}

/** The player as the client works it out between transactions: the energy that has come back since
 * `last_login`, and how long until the next. Only once the program refills too, or the client would
 * show energy the program wouldn't give */
export function clientView(s: State, now = Date.now()): { energy: number; next: number | null } {
  const p = s.player
  if (!p) return { energy: 0, next: null }
  if (!refills(s) || p.energy >= MAX_ENERGY) return { energy: p.energy, next: null }
  const n = Math.floor((now - p.last) / ms)
  const energy = Math.min(MAX_ENERGY, p.energy + n)
  return { energy, next: energy >= MAX_ENERGY ? null : ms - ((now - p.last) % ms) }
}

/** One chop on devnet: the refill first, once the program has it, then the check, then the wood. A
 * failed chop rolls everything back, the refill included, as a failed transaction does */
function chop(s: State): { player: Player; chop: Chop; tx: Tx } {
  const now = Date.now()
  const before = s.player ?? { wood: 0, energy: MAX_ENERGY, last: now }
  let { energy, last } = before
  let refilled = 0
  if (refills(s)) {
    const n = Math.floor((now - last) / ms)
    if (n > 0) {
      const topped = Math.min(MAX_ENERGY, energy + n)
      refilled = topped - energy
      energy = topped
      last += n * ms
    }
    if (energy === MAX_ENERGY) last = now
  }
  const count = s.thread.reduce((n, t) => n + (t.kind === "act" ? (t.chops?.length ?? 0) : 0), 0) + s.thread.filter((t) => t.kind === "result" && t.act === "test").length
  const signature = signatureOf(count)
  const lib = s.deployedLib ?? ""
  if (energy === 0) {
    const fail: Tx = {
      instruction: "chop_tree",
      said: "",
      signature,
      compute: 2906,
      error: { name: "NotEnoughEnergy", number: 6000, message: "Not enough energy", line: lineOf(lib, "err!(ErrorCode::NotEnoughEnergy)") },
    }
    const wait = refills(s) ? ms - ((now - last) % ms) : undefined
    return {
      player: before,
      chop: { ok: false, at: now, wood: before.wood, energy: before.energy, refilled: 0, tx: fail, wait },
      tx: fail,
    }
  }
  const player = { wood: before.wood + 1, energy: energy - 1, last }
  const tx: Tx = { instruction: "chop_tree", said: `You chopped a tree. ${player.wood} wood, ${player.energy} energy left.`, signature, compute: refills(s) ? 4618 : 3412 }
  return { player, chop: { ok: true, at: now, wood: player.wood, energy: player.energy, refilled, tx }, tx }
}

/** Step 3 passes when the energy runs out and the program refuses; step 4 when a chop works again */
const chopPasses = (s: State, i: number, c: Chop) => (i === 2 ? !c.ok : i === 3 ? c.ok && refills(s) : false)

/** Creating the player: init_player, with the System Program creating the account inside it */
const initTx = (): Tx => ({
  instruction: "init_player",
  said: "",
  signature: INIT_SIGNATURE,
  compute: 7342,
  inner: ["Program 11111111111111111111111111111111 invoke [2]", "Program 11111111111111111111111111111111 success"],
})

export const LUMBERJACK: Lesson = {
  card: { slug: "lumberjack", name: "Lumberjack", level: "Intermediate", framework: "Anchor", ext: "jpg" },
  minutes: 15,
  by: "Jonas Hahn",
  program: "lumberjack",
  line: "Keep a player's state on chain and refill energy over time",
  intro: "You'll build a small game on chain: each player gets an account with wood and energy, chopping a tree spends energy, and the energy comes back over time.",
  proof: "Program log: You chopped a tree. 1 wood, 4 energy left.",
  badge: "Energy system",
  headline: "You built an energy system on chain.",
  proofLine: (_tx, s) => `Your player has ${s.player?.wood ?? 0} wood on devnet, and its energy comes back every 30 seconds with no transaction to do it.`,
  // The next Intermediate one. Battle Coins goes where the original Lumberjack points: a game that gives
  // its players a token of its own
  next: "battle-coins",
  nextLine: "Battle Coins is a good next one: your game mints a token of its own with metadata, rewards players with it and burns it to heal them.",
  steps: STEPS,
  files: { [LIB]: "", [CLIENT]: "" },
  preview: LIB_S4,
  programId: PROGRAM_ID,
  idlAccount: IDL_ACCOUNT,
  txSignature: INIT_SIGNATURE,
  checks: CHECKS,
  story: false,
  runTx: initTx,
  game: { chop, chopPasses, max: MAX_ENERGY, pda: PLAYER_PDA },
}
