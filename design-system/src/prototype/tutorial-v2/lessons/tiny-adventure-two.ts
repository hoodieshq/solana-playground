import { holds } from "../check"
import type { State } from "../store"
import { LIB, shortKey } from "./common"
import { AFTER_DEPLOY, FEE, LAMPORTS, UPGRADE, upgradesOf } from "./games"
import { SYSTEM_CPI, inUse, noSystemProgram, sentSoFar, signatureOf } from "./records"
import { drawn } from "./tiny-adventure"
import type { Lesson, Rec, RecSend, Sent, SpecialCheck, Step, Tx } from "./types"

// Tiny Adventure Two: Tiny Adventure's level gets a chest vault at its own PDA. Step 1 fills it from
// your wallet through a CPI to the System Program (the planned failure: the CPI context names the
// program by its account, as Anchor before 1.0 did), step 2 spawns the chest on devnet, step 3 pays it
// out by moving lamports of an account the program owns. After Jonas Hahn's Tiny Adventure Two. The
// game card in its `chest` view: the tiles, the chest on the last one, and the balances

const PROGRAM_ID = "4TmbhsK5KMTXuRo7q9ssDRF9mMFjoD1jfjBdwwofWq8R"
const IDL_ACCOUNT = "VRbV1wP17F5yTRjoPwobZfHmDsVHH1mdPsMm5fwwKFuu"
const LEVEL_PDA = "V9yo9qwRuwjDoVXB59q9FXu9dDTXKhf3ob3H1PjXj9qR"
const VAULT_PDA = "779RVqZhhBb1Ks7RjFwjR7djoHh5RMK5VwbhsyVbPP17"
const START_SIGNATURE = "oq73DdRdDBF51P9hMK7hj7XbPZ17q3P5j7M5qMFy9doPKsboHPdP9uDqR579BqDhjfDFDhf1PB9fmsMffbBwMqb7"

/** Rent, in lamports: the level's 10 bytes and the vault's 8 */
const LEVEL_RENT = 960_480
const VAULT_RENT = 946_560
/** What one chest holds: 0.1 SOL */
const REWARD = 100_000_000

// The program, piece by piece, in the order it sits in lib.rs

const IMPORT = "use anchor_lang::system_program::{transfer, Transfer};"
const boil = (cpi: boolean) => `use anchor_lang::prelude::*;${cpi ? `\n${IMPORT}` : ""}

declare_id!("11111111111111111111111111111111");`

const consts = (reward: boolean) => `/// The last tile of the level
const END: u8 = 3;${reward ? "\n/// What one chest holds: 0.1 SOL, in lamports\nconst CHEST_REWARD: u64 = 100_000_000;" : ""}`

const INIT_FN = `    pub fn init_level(_ctx: Context<InitLevel>) -> Result<()> {
        msg!("A journey begins!");
        msg!("o.......");
        Ok(())
    }`

const BROKEN_ARG = "            ctx.accounts.system_program.to_account_info(),"
const FIXED_ARG = "            ctx.accounts.system_program.key(),"

const spawnFn = (fixed: boolean) => `    pub fn spawn_chest(ctx: Context<SpawnChest>) -> Result<()> {
        let cpi = CpiContext::new(
${fixed ? FIXED_ARG : BROKEN_ARG}
            Transfer {
                from: ctx.accounts.player.to_account_info(),
                to: ctx.accounts.chest_vault.to_account_info(),
            },
        );
        transfer(cpi, CHEST_REWARD)?;
        let level = &mut ctx.accounts.level;
        level.position = 0;
        level.chest = true;
        msg!("A chest with 0.1 SOL waits at the end.");
        Ok(())
    }`

const LEFT_FN = `    pub fn move_left(ctx: Context<Move>) -> Result<()> {
        let level = &mut ctx.accounts.level;
        if level.position > 0 {
            level.position -= 1;
        }
        draw(level.position);
        Ok(())
    }`

const PAYOUT = `        if level.position == END && level.chest {
            level.chest = false;
            ctx.accounts.chest_vault.sub_lamports(CHEST_REWARD)?;
            ctx.accounts.player.add_lamports(CHEST_REWARD)?;
            msg!("You opened the chest: 0.1 SOL is yours!");
        }`

const rightFn = (payout: boolean) => `    pub fn move_right(ctx: Context<Move>) -> Result<()> {
        let level = &mut ctx.accounts.level;
        if level.position < END {
            level.position += 1;
        }${payout ? `\n${PAYOUT}` : ""}
        draw(level.position);
        Ok(())
    }`

const DRAW = `/// The level as one log line, the character on its tile
fn draw(position: u8) {
    match position {
        0 => msg!("o......."),
        1 => msg!("..o....."),
        2 => msg!("....o..."),
        _ => msg!("......\\\\o/ You reached the end!"),
    }
}`

const VAULT_FIELD = `    #[account(
        init,
        payer = signer,
        space = 8 + ChestVault::INIT_SPACE,
        seeds = [b"chest_vault"],
        bump,
    )]
    pub chest_vault: Account<'info, ChestVault>,`

const initAccounts = (vault: boolean) => `#[derive(Accounts)]
pub struct InitLevel<'info> {
    #[account(
        init,
        payer = signer,
        space = 8 + GameData::INIT_SPACE,
        seeds = [b"level1"],
        bump,
    )]
    pub level: Account<'info, GameData>,${vault ? `\n${VAULT_FIELD}` : ""}
    #[account(mut)]
    pub signer: Signer<'info>,
    pub system_program: Program<'info, System>,
}`

const SPAWN_ACCOUNTS = `#[derive(Accounts)]
pub struct SpawnChest<'info> {
    #[account(mut, seeds = [b"level1"], bump)]
    pub level: Account<'info, GameData>,
    #[account(mut, seeds = [b"chest_vault"], bump)]
    pub chest_vault: Account<'info, ChestVault>,
    #[account(mut)]
    pub player: Signer<'info>,
    pub system_program: Program<'info, System>,
}`

const PAYING = `    #[account(mut, seeds = [b"chest_vault"], bump)]
    pub chest_vault: Account<'info, ChestVault>,
    #[account(mut)]
    pub player: Signer<'info>,`

const moveAccounts = (paying: boolean) => `#[derive(Accounts)]
pub struct Move<'info> {
    #[account(mut, seeds = [b"level1"], bump)]
    pub level: Account<'info, GameData>,${paying ? `\n${PAYING}` : ""}
}`

const CHEST_FIELD = "    pub chest: bool,"

const gameData = (chest: boolean) => `#[account]
#[derive(InitSpace)]
pub struct GameData {
    pub position: u8,${chest ? `\n${CHEST_FIELD}` : ""}
}`

const CHEST_VAULT = `#[account]
#[derive(InitSpace)]
pub struct ChestVault {}`

type Parts = { vault?: boolean; flag?: boolean; accounts?: boolean; spawn?: "broken" | "fixed"; payout?: boolean; paying?: boolean }

/** lib.rs with the pieces written so far, each in its place. Tiny Adventure's program is there from
 * the start; the vault and the accounts `spawn_chest` takes sit apart in the file, so each write is
 * placed by the file right after it */
function lib(p: Parts) {
  const fns = [INIT_FN, ...(p.spawn ? [spawnFn(p.spawn === "fixed")] : []), LEFT_FN, rightFn(!!p.payout)]
  const module = `#[program]\nmod tiny_adventure_two {\n    use super::*;\n\n${fns.join("\n\n")}\n}`
  return [
    boil(!!p.accounts),
    consts(!!p.accounts),
    module,
    DRAW,
    initAccounts(!!p.vault),
    p.accounts && SPAWN_ACCOUNTS,
    moveAccounts(!!p.paying),
    gameData(!!p.flag),
    p.vault && CHEST_VAULT,
  ]
    .filter(Boolean)
    .join("\n\n")
}

/** Tiny Adventure's finished program, renamed: where this lesson starts */
const LIB_START = lib({})
const S1 = { vault: true, flag: true, accounts: true, spawn: "fixed" } as const
const LIB_ACCOUNTS = lib({ vault: true, flag: true, accounts: true })
const LIB_BROKEN = lib({ ...S1, spawn: "broken" })
const LIB_S1 = lib(S1)
const LIB_PAYOUT = lib({ ...S1, payout: true })
const LIB_S3 = lib({ ...S1, payout: true, paying: true })

/** The planned failure's lines: `CpiContext::new(` and its first argument under it */
const ARG_LINE = LIB_BROKEN.split("\n").indexOf(BROKEN_ARG) + 1
const NEW_LINE = ARG_LINE - 1

const EXPLAIN_ERROR =
  "`CpiContext::new` takes two things: which program to call, and the accounts that program needs. Since Anchor 1.0 the program is named by its id, a `Pubkey`. Line " +
  `${ARG_LINE} passes the System Program's whole account, the way older examples still do.`

const UPGRADES = `Upgrades ${shortKey(PROGRAM_ID, 4).replace("…", "…⁠")} in place · from your wallet`

const STEPS: Step[] = [
  {
    id: "chest",
    title: "A chest of SOL",
    short: "Chest",
    objective: "Fill a chest with SOL from your wallet",
    learned: "A program puts SOL into an account by asking the System Program, which owns your wallet: a CPI",
    file: LIB,
    start: LIB_START,
    target: LIB_S1,
    goal: "build",
    beats: [
      {
        kind: "say",
        id: "s1.start",
        text: "This one starts where Tiny Adventure ended: the level, `init_level` and both moves are already in lib.rs. Now the level gets a chest with 0.1 SOL in it, for whoever reaches the end.",
      },
      {
        kind: "write",
        id: "s1.vault",
        text: 'The SOL needs an account to sit in: a chest vault at its own PDA, `"chest_vault"`. It has no fields, only lamports, and `init_level` creates it next to the level.',
        writes: { file: LIB, block: lib({ vault: true }), ref: lib({ vault: true }) },
      },
      {
        kind: "write",
        id: "s1.flag",
        text: "And `GameData` gets a second field, `chest`: whether a chest waits at the end right now. `InitSpace` counts it: 2 bytes.",
        writes: { file: LIB, block: CHEST_FIELD, ref: lib({ vault: true, flag: true }) },
      },
      {
        kind: "write",
        id: "s1.accounts",
        text: "`spawn_chest` puts the chest back: it needs the level, the vault, you as the player who pays, and the System Program. The reward is a constant, 0.1 SOL in lamports.",
        writes: { file: LIB, block: LIB_ACCOUNTS, ref: LIB_ACCOUNTS },
      },
      {
        kind: "say",
        id: "s1.who",
        text: "Now the transfer. The 0.1 SOL comes out of your wallet, and only the program that owns an account can take SOL out of it.",
      },
      {
        kind: "ask",
        id: "s1.q1",
        kicker: "Question",
        n: 1,
        question: "Who can move SOL out of your wallet?",
        options: ["Your program, since your wallet called it", "The System Program, with your wallet's signature", "Anyone who knows your wallet's address"],
        code: false,
        answer: 1,
        right: "Yes. Your wallet is owned by the System Program, and it moves SOL when the wallet signs. So `spawn_chest` calls it from inside your program: a cross program invocation, or CPI. I've written the call.",
        why: [
          "Calling your program doesn't hand it your wallet. Only the account's owner, the System Program, can take SOL out of it.",
          null,
          "An address only says where to send. Taking SOL out needs the owner program and your signature.",
        ],
        hint: "Every account has an owner program. Who owns a plain wallet?",
        writes: { file: LIB, block: spawnFn(false), ref: LIB_BROKEN },
        key: "transfer(cpi, CHEST_REWARD)?;",
        typed: "That's the call. I've written the CPI context around it: which program, and which accounts.",
      },
      {
        kind: "act",
        id: "s1.build",
        act: "build",
        say: "That's the chest. Let's compile it.",
        title: "Build lib.rs",
        context: "Compiles lib.rs on Playground's build server",
        button: "Build",
      },
    ],
    planned: "This one's on purpose. Everyone who copies a CPI from an older example meets it, so let's meet it now.",
    plannedShort: `\`CpiContext::new\` on line ${NEW_LINE} wants the program's id first, and line ${ARG_LINE} passes its whole account.`,
    onFail: [
      { kind: "say", id: "f1.explain", text: EXPLAIN_ERROR, quote: { file: LIB, line: ARG_LINE, mark: "to_account_info()", tone: "error" } },
      {
        kind: "ask",
        id: "f1.q",
        kicker: "Fix it",
        question: "So what does `CpiContext::new` take first?",
        options: ["ctx.accounts.chest_vault.key(),", "crate::ID,", "ctx.accounts.system_program.key(),"],
        code: true,
        answer: 2,
        right: "Exactly: the program you call, by its id. Where the SOL goes is already in `Transfer`, and your signature on the transaction covers `from`.",
        why: [
          "That's where the SOL goes, and it's already in `Transfer`. The first argument names the program that does the transfer.",
          "That's your own program. A CPI calls another one: the System Program, which owns your wallet.",
          null,
        ],
        hint: "The error says a `Pubkey` is expected. Whose key?",
        writes: { file: LIB, block: FIXED_ARG, ref: LIB_S1, start: LIB_BROKEN },
        key: "ctx.accounts.system_program.key(),",
        typed: "That's the fix. The CPI now names the System Program by its id.",
      },
      {
        kind: "act",
        id: "f1.build",
        act: "build",
        say: "Build again. This time it should pass.",
        title: "Build lib.rs",
        context: "Same build, the System Program by its id",
        button: "Build",
      },
    ],
    win: {
      id: "s1.win",
      headline: "Your program can fill a chest",
      line: "The build wrote the IDL: four instructions now, `spawn_chest` among them, and a vault with no fields, 8 bytes.",
      stats: [
        { icon: "hammer", text: "Built in 1.6 s" },
        { icon: "braces", text: "4 instructions" },
        { icon: "clock", text: "{took}" },
      ],
    },
    explainStep:
      "This step adds a chest vault next to the level and `spawn_chest`, which fills it with 0.1 SOL from your wallet through the System Program. The first build fails on purpose, on how a CPI names the program it calls.",
    chips: [
      {
        label: "What is a CPI?",
        match: /\bcpi\b|cross.program/i,
        answer: "A cross program invocation: your program calling another program inside the same transaction. Here it's the System Program's `transfer`, with your wallet's signature passed along.",
      },
      {
        label: "Why does a vault need its own account?",
        match: /\bvault\b/i,
        answer: "SOL lives in accounts. The vault is an account your program owns, so the reward is out of your wallet and only your program can pay it.",
      },
    ],
    errorChips: [
      {
        label: "Why did Anchor change this?",
        match: /\b(change|changed|older|old)\b/i,
        answer: "Anchor 1.0 stopped passing the program's account into a CPI: the id is all the call needs, and it saves an account in the context.",
      },
      {
        label: "Where is this in the docs?",
        match: /\b(docs?|documentation)\b/i,
        answer: "The Anchor docs cover it under Cross Program Invocations: `CpiContext::new` with the program's id and the accounts struct.",
      },
    ],
    answers: [{ match: /why.*(fail|error)/i, answer: EXPLAIN_ERROR, local: true }],
  },
  {
    id: "spawn",
    title: "Spawn the chest",
    short: "Spawn",
    objective: "Deploy, start the level and put 0.1 SOL in the chest",
    learned: "SOL in an account your program owns can only be taken out by your program",
    file: LIB,
    start: LIB_S1,
    target: LIB_S1,
    goal: "send",
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
        id: "s2.start",
        act: "send",
        ix: "init_level",
        say: "Start the level. This creates two accounts now, the level and the empty vault, and your wallet pays the deposit for both.",
        title: "Start the level",
        context: "Sends `init_level` · rent 0.0019 SOL and fee from your wallet",
        button: "Start",
        record: "Started the level",
      },
      {
        kind: "ask",
        id: "s2.q2",
        kicker: "Question",
        n: 2,
        question: "Spawn chest puts 0.1 SOL in an account your program owns. Who can take it out?",
        options: ["Only your program, by changing the vault's balance itself", "You: it came from your wallet", "Nobody: SOL in a program's account is locked"],
        code: false,
        answer: 0,
        right: "Yes. A program can take lamports from any account it owns, with no signature and no CPI. That's how the chest will pay out.",
        why: [
          null,
          "Once it's in the vault it's the vault's. Your signature moves your wallet's SOL, not your program's.",
          "It isn't locked: its owner, your program, can move it. Nobody else can.",
        ],
        hint: "Who owns the vault?",
        skipped: "No problem. Only your program can take it out: it owns the vault, so it can change its balance itself. Let's fill it.",
      },
      {
        kind: "act",
        id: "s2.spawn",
        act: "send",
        ix: "spawn_chest",
        say: "Now the chest. `spawn_chest` sends 0.1 SOL from your wallet to the vault, through the System Program.",
        title: "Spawn the chest",
        context: "Sends `spawn_chest` · 0.1 SOL from your wallet into the chest",
        button: "Spawn chest",
        record: "Spawned a chest",
      },
    ],
    win: {
      id: "s2.win",
      headline: "A chest of 0.1 SOL waits at the end",
      line: "0.1 SOL left your wallet in a CPI to the System Program, and sits in a vault your program owns.",
      stats: [
        { icon: "coins", text: "0.1 SOL in the chest" },
        { icon: "cpu", text: "1 CPI" },
        { icon: "rocket", text: "Live on devnet" },
      ],
      extra: "openTest",
    },
    testWin: "You spawned the chest from the Call panel. 0.1 SOL went from your wallet into the vault.",
    explainStep: "This step puts the program on devnet, starts the level with its empty vault, then spawns the chest: 0.1 SOL from your wallet, through a CPI to the System Program.",
    chips: [
      {
        label: "What is rent?",
        match: /\brent\b/i,
        answer: "Every account holds a deposit of SOL for the bytes it takes: about 0.00096 SOL for the level's 10 and 0.00095 SOL for the vault's 8. It isn't spent: close the account and it comes back.",
      },
      {
        label: "Why does the vault hold 0.10095 SOL?",
        match: /0\.10095|\bvault\b.*\bhold/i,
        answer: "0.1 SOL is the chest; 0.00095 SOL is the vault's own deposit for its 8 bytes. The deposit stays when the chest pays out.",
      },
      {
        label: "Can I spawn two chests?",
        match: /\btwo\b|\bagain\b|\banother\b/i,
        answer: "You can, and both 0.1 SOL go into the vault. One walk pays one chest: the rest waits for the next spawn.",
      },
    ],
  },
  {
    id: "reward",
    title: "Reward",
    short: "Reward",
    objective: "Pay the chest to whoever reaches the end",
    learned: "Your program pays out by moving lamports of an account it owns directly, with no CPI",
    file: LIB,
    start: LIB_S1,
    target: LIB_S3,
    goal: "move",
    beats: [
      {
        kind: "say",
        id: "s3.why",
        text: "The chest is full, and `move_right` doesn't know about it yet. When the character steps onto the last tile and the chest is there, the program should pay whoever sent the move.",
      },
      {
        kind: "ask",
        id: "s3.q3",
        kicker: "Question",
        n: 3,
        question: "How does `move_right` pay the player?",
        options: [
          "A CPI to the System Program again, from the vault to the player",
          "Take it off the vault and add it to the player: `sub_lamports` and `add_lamports`",
          "Sign for the vault with its seeds, then the same CPI",
        ],
        code: false,
        answer: 1,
        right: "Right. Your program owns the vault, so it changes both balances itself: 0.1 SOL off the vault, 0.1 SOL onto the player. The runtime checks the totals still match. I've written the payout into `move_right`.",
        why: [
          "The System Program only moves SOL out of accounts it owns, and the vault is your program's. Devnet would refuse: `Transfer: from must not carry data`.",
          null,
          "Seeds let your program sign for the vault, but the System Program still won't take SOL from an account it doesn't own. That works for a vault the System Program owns; yours isn't one.",
        ],
        hint: "You answered it in the last step: who can take SOL out of the vault?",
        writes: { file: LIB, block: PAYOUT, ref: LIB_PAYOUT },
        key: "ctx.accounts.chest_vault.sub_lamports(CHEST_REWARD)?;",
        typed: "That's the line that empties the chest. I've written the rest: the same 0.1 SOL onto the player, and the chest marked as taken.",
      },
      {
        kind: "write",
        id: "s3.accounts",
        text: "And `Move` gets the vault and the player, both `mut` because their balances change. The player is a `Signer`, so the reward goes to whoever sent the move.",
        writes: { file: LIB, block: moveAccounts(true), ref: LIB_S3 },
      },
      {
        kind: "act",
        id: "s3.ship",
        act: "buildDeploy",
        say: "Devnet still runs a `move_right` that ignores the chest. Build and deploy: the level and the chest stay as they are.",
        title: "Build and deploy",
        context: UPGRADES,
        button: "Build and deploy",
      },
      {
        kind: "act",
        id: "s3.move",
        act: "move",
        say: "Walk to the chest.",
        title: "Walk to the chest",
        context: "Sends `move_right` or `move_left` · fee from your wallet",
        button: "Move right",
        moves: [
          { ix: "move_right", button: "Move right" },
          { ix: "move_left", button: "Move left" },
        ],
        until: { label: "Walk to the chest", stop: "passed" },
        record: "Walked to the chest",
      },
    ],
    win: {
      id: "s3.win",
      headline: "The chest paid you 0.1 SOL",
      line: "Your program took 0.1 SOL off its own vault and added it to your wallet, in the move that reached the end. No CPI: it owns the vault.",
      stats: [
        { icon: "coins", text: "+0.1 SOL" },
        { icon: "cpu", text: "No CPI to pay" },
        { icon: "clock", text: "{took}" },
      ],
    },
    testWin: "You walked to the chest from the Call panel, and 0.1 SOL came back to your wallet.",
    explainStep: "This step pays the chest out: `move_right` takes 0.1 SOL off the vault your program owns and adds it to the player who reached the end, with no CPI.",
    chips: [
      {
        label: "Why must the totals match?",
        match: /\btotals?\b|\bmatch\b/i,
        answer: "The runtime checks that a transaction ends with as many lamports as it started with. `sub_lamports` and `add_lamports` move them, they never make new ones.",
      },
      {
        label: "Can I get paid twice?",
        match: /\btwice\b|\bagain\b/i,
        answer: "No: the payout sets `chest` to false. Spawn another chest to play again, for another 0.1 SOL from your wallet.",
      },
      {
        label: "Can I lock the chest with a password?",
        match: /\bpassword\b|\block\b|\bsecret\b/i,
        answer: "You could pass a password with the move, but everything in a transaction is public: anyone can read it from the first one that worked. A secret needs a different design.",
      },
    ],
  },
]

/** `CpiContext::new` given the program's account: Anchor 1.x takes its id, a `Pubkey`. The planned failure */
const cpiAccount: SpecialCheck = ({ code, bare, file, head, failed }) => {
  const rows = bare.split("\n")
  const open = rows.findIndex((r) => /CpiContext::new\(\s*$/.test(r))
  if (open === -1 || !/\.to_account_info\(\)\s*,\s*$/.test(rows[open + 1] ?? "")) return null
  const line = open + 2
  const row = code.split("\n")[line - 1] ?? ""
  const column = row.search(/\S/) + 1
  const span = row.trim().replace(/,$/, "").length
  const call = (code.split("\n")[open] ?? "").indexOf("CpiContext::new")
  return {
    ok: false,
    planned: true,
    line,
    column,
    span,
    log: [
      ...head,
      "error[E0308]: mismatched types",
      ` --> ${file}:${line}:${column}`,
      "   |",
      `${open + 1} | ${(code.split("\n")[open] ?? "").trimEnd()}`,
      `   | ${" ".repeat(Math.max(0, call))}${"-".repeat("CpiContext::new".length)} arguments to this function are incorrect`,
      `${line} | ${row.trimEnd()}`,
      `   | ${" ".repeat(column - 1)}${"^".repeat(span)} expected \`Pubkey\`, found \`AccountInfo<'_>\``,
      "   |",
      "note: associated function defined here",
      "Build failed",
    ],
    reason: `${failed}: \`CpiContext::new\` on line ${open + 1} wants the program's id, and line ${line} passes its account.`,
    explain: EXPLAIN_ERROR,
  }
}

const CHECKS: SpecialCheck[] = [cpiAccount, noSystemProgram]

// ---- The level, the chest and your wallet: what the program does with them, worked out the way it would

const recOf = (s: State, id: string) => s.records?.find((r) => r.id === id) ?? null

/** Whether the program on devnet has `spawn_chest`, and whether its `move_right` pays */
const spawns = (s: State) => s.deployedLib !== null && holds(s.deployedLib, "pub fn spawn_chest(ctx: Context<SpawnChest>) -> Result<()> {")
const pays = (s: State) => s.deployedLib !== null && holds(s.deployedLib, "ctx.accounts.chest_vault.sub_lamports(CHEST_REWARD)?;")

/** The accounts after a send that cost the wallet `cost` lamports: the level and the vault as `change`
 * leaves them, the wallet worked out from what the lesson has spent, upgrades included */
function after(s: State, cost: number, level: Partial<Rec["values"]>, vault = 0): Rec[] {
  const was = recOf(s, "level")!
  const spent = Number(was.values.spent) + cost
  return (s.records ?? []).map((r) =>
    r.id === "level"
      ? { ...r, values: { ...r.values, ...level, spent } }
      : r.id === "vault"
        ? { ...r, values: { lamports: Number(r.values.lamports) + vault } }
        : r.id === "wallet"
          ? { ...r, values: { lamports: AFTER_DEPLOY - upgradesOf(s) * UPGRADE - spent } }
          : r
  )
}

/** One send, from a card or the Call panel, answered as devnet would */
function send(s: State, ix: string): RecSend | { note: string } {
  const level = recOf(s, "level")
  const records = s.records ?? []
  const signature = records.length ? signatureOf(sentSoFar(s) + 41) : START_SIGNATURE
  if (ix === "init_level") {
    if (level) return { tx: inUse("init_level", LEVEL_PDA, signature), records, refused: "Already in use · the level stayed as it was" }
    const spent = LEVEL_RENT + VAULT_RENT + FEE
    const created: Rec[] = [
      { id: "level", kind: "Level", pda: LEVEL_PDA, values: { position: 0, chest: false, paid: 0, spent }, rent: LEVEL_RENT / LAMPORTS },
      { id: "vault", kind: "Vault", pda: VAULT_PDA, values: { lamports: 0 }, rent: VAULT_RENT / LAMPORTS },
      { id: "wallet", kind: "Wallet", pda: "", values: { lamports: AFTER_DEPLOY - upgradesOf(s) * UPGRADE - spent }, rent: 0 },
    ]
    const tx: Tx = { instruction: "init_level", said: drawn(0), signature, compute: 9840, inner: [...SYSTEM_CPI, ...SYSTEM_CPI, "Program log: A journey begins!"] }
    return { tx, records: created }
  }
  if (!level) return { note: "Start the level first, with `init_level`." }
  if (ix === "spawn_chest") {
    if (!spawns(s)) return { note: "Devnet still runs the program without `spawn_chest`. Build and deploy it first." }
    const tx: Tx = { instruction: "spawn_chest", said: "A chest with 0.1 SOL waits at the end.", signature, compute: 6215, inner: SYSTEM_CPI }
    return { tx, records: after(s, REWARD + FEE, { position: 0, chest: true }, REWARD) }
  }
  if (ix === "move_right" || ix === "move_left") {
    const at = Number(level.values.position)
    const chest = !!level.values.chest
    const position = ix === "move_right" ? Math.min(at + 1, 3) : Math.max(at - 1, 0)
    const paid = ix === "move_right" && position === 3 && chest && pays(s)
    // At the end with nothing to pay, a walk to the chest has nowhere to go: Spawn chest fills it again
    if (ix === "move_right" && at === 3 && !chest && pays(s) && s.passed[1]) return { note: "You're at the end and the chest is empty. Spawn another chest from the Call panel to play again." }
    const tx: Tx = { instruction: ix, said: drawn(position), signature, compute: paid ? 3120 : 1384, inner: paid ? ["Program log: You opened the chest: 0.1 SOL is yours!"] : undefined }
    if (!paid) return { tx, records: after(s, FEE, { position }) }
    return { tx, records: after(s, FEE - REWARD, { position, chest: false, paid: Number(level.values.paid) + 1 }, -REWARD) }
  }
  return { note: "That call has no card here." }
}

const opened = (tx: Tx) => !!tx.inner?.some((l) => l.includes("You opened the chest"))

/** A move as the card lists it: where it went, and the chest when it paid */
function sentLine(x: Sent) {
  if (x.ix !== "move_right" && x.ix !== "move_left") return null
  const before = Number(x.snap.before.find((r) => r.id === "level")?.values.position ?? 0)
  const after = Number(x.snap.after.find((r) => r.id === "level")?.values.position ?? 0)
  const arrow = x.ix === "move_right" ? "→" : "←"
  return `${arrow} ${before === after ? "stays on tile" : "tile"} ${after}${opened(x.tx) ? " · chest opened · +0.1 SOL" : ""}`
}

/** Step 2 passes when the chest is spawned, step 3 on the move that opens it */
const passes = (_s: State, i: number, ix: string, tx: Tx) => (i === 1 ? ix === "spawn_chest" && !tx.error : i === 2 ? ix === "move_right" && !tx.error && opened(tx) : false)

export const TINY_ADVENTURE_TWO: Lesson = {
  card: { slug: "tiny-adventure-two", name: "Tiny Adventure Two", level: "Beginner", framework: "Anchor", ext: "jpg" },
  minutes: 10,
  by: "Jonas Hahn",
  program: "tiny_adventure_two",
  line: "Put a chest of SOL in your level and pay it to whoever reaches the end",
  intro: "You'll build on Tiny Adventure's level, starting from its code: a chest vault your program owns, 0.1 SOL put in it through the System Program, and paid out to whoever walks to the end.",
  proof: "Program log: You opened the chest: 0.1 SOL is yours!",
  badge: "Chest vault",
  headline: "Your game pays its players",
  proofLine: () => "0.1 SOL went from your wallet into your program's chest, and back to you when you reached the end.",
  // The last Beginner one in Anchor: records per user, changed and closed
  next: "expense-tracker",
  nextLine: "Expense Tracker is a good next one: each user keeps records at their own PDAs, changes them and closes them to get the deposit back.",
  steps: STEPS,
  // Tiny Adventure's program is there from the start; no client.ts, every call goes from the card or the Call panel
  files: { [LIB]: LIB_START },
  preview: LIB_S3,
  programId: PROGRAM_ID,
  idlAccount: IDL_ACCOUNT,
  txSignature: START_SIGNATURE,
  checks: CHECKS,
  story: false,
  runTx: () => ({ instruction: "init_level", said: drawn(0), signature: START_SIGNATURE, compute: 9840, inner: [...SYSTEM_CPI, ...SYSTEM_CPI, "Program log: A journey begins!"] }),
  records: {
    title: "Level",
    one: "level",
    empty: "No level yet. Start sends `init_level`.",
    show: (r) => ({ label: r.kind, seeds: r.id === "vault" ? '"chest_vault"' : '"level1"', fields: Object.entries(r.values).map(([k, v]) => [k, String(v)]) }),
    send: (s, ix) => send(s, ix),
    passes,
    args: () => ({}),
    check: () => null,
    view: "chest",
    sentLine: (_s, x) => sentLine(x),
  },
}
