import { lineOf } from "../check"
import type { State } from "../store"
import { LIB, shortKey } from "./common"
import { SYSTEM_CPI, bytes, inUse, noSystemProgram, payerNotMut, sentSoFar, signatureOf } from "./records"
import { ATA_CPI, METADATA_PROGRAM, MINT_RENT, TOKEN_ACCOUNT_RENT, insufficientFunds, tokenCpi } from "./tokens"
import type { Lesson, Rec, RecSend, SpecialCheck, Step, Tx } from "./types"

// Battle Coins: a game coin as a token mint at a PDA, its own mint authority; a name, a symbol and an
// icon from Token Metadata, signed for with the PDA's seeds; a coin minted to the player for every
// enemy defeated, and one burned to heal. After Jonas Hahn and John's Battle Coins, the step after
// Lumberjack: the same player, with health instead of energy. The token card, with the player as its strip

const PROGRAM_ID = "WTN4rXjjsmTuR5H35buf7dsMfXqffmbPZyhmhKS2d4Hu"
const IDL_ACCOUNT = "Fm2WkQjHVDhhwDZVb7MZBTFX37KHqjMZMmM3DHpT7aZd"
/** The coin's mint: the PDA from "coin" */
const COIN = "MCCFNiuPj3wfu5VZdMR9Hy79Ksyd3hB37d9RZbMSsdyM"
/** The player account: the PDA from "player" and the learner's wallet */
const PLAYER = "iyP9d7wmHuwBBTDMP9h5ZydXmhZPuqRFK3qF3MuBQww2"
/** The player's coin account, at the associated address of the wallet and the coin */
const PURSE = "H1y9zCMoZZqZDVBsjd77wTbMXwuZHhjdbR57DsXFmWnb"
const CREATE_SIGNATURE = signatureOf(301)

/** The original's metadata JSON, with `solanaGold.jpg` in it */
const GOLD_URI = "https://raw.githubusercontent.com/solana-developers/program-examples/new-examples/tokens/tokens/.assets/spl-token.json"
/** Rent of the metadata account (679 bytes) and of the player (9 bytes), and Token Metadata's create fee */
const METADATA_RENT = 0.0056
const PLAYER_RENT = 0.00095
const METADATA_FEE = 0.01
const MAX_HEALTH = 100
const HIT = 10

// The program, piece by piece, in the order it sits in lib.rs

const IMPORTS = [
  "",
  "use anchor_spl::token_interface::{Mint, TokenInterface};",
  `use anchor_spl::{
    metadata::{
        create_metadata_accounts_v3, mpl_token_metadata::types::DataV2, CreateMetadataAccountsV3,
        Metadata,
    },
    token_interface::{Mint, TokenInterface},
};`,
  `use anchor_spl::{
    associated_token::AssociatedToken,
    metadata::{
        create_metadata_accounts_v3, mpl_token_metadata::types::DataV2, CreateMetadataAccountsV3,
        Metadata,
    },
    token_interface::{self, Mint, MintTo, TokenAccount, TokenInterface},
};`,
  `use anchor_spl::{
    associated_token::AssociatedToken,
    metadata::{
        create_metadata_accounts_v3, mpl_token_metadata::types::DataV2, CreateMetadataAccountsV3,
        Metadata,
    },
    token_interface::{self, Burn, Mint, MintTo, TokenAccount, TokenInterface},
};`,
]

const boil = (imports: number) => `use anchor_lang::prelude::*;
${IMPORTS[imports]}

declare_id!("11111111111111111111111111111111");`

const CREATE_EMPTY = `    pub fn create_coin(_ctx: Context<CreateCoin>) -> Result<()> {
        Ok(())
    }`

const SEEDS = `        let seeds: &[&[&[u8]]] = &[&[b"coin", &[ctx.bumps.coin]]];`

const CREATE_FULL = `    pub fn create_coin(ctx: Context<CreateCoin>, name: String, symbol: String, uri: String) -> Result<()> {
${SEEDS}
        let accounts = CreateMetadataAccountsV3 {
            metadata: ctx.accounts.metadata.to_account_info(),
            mint: ctx.accounts.coin.to_account_info(),
            mint_authority: ctx.accounts.coin.to_account_info(),
            payer: ctx.accounts.payer.to_account_info(),
            update_authority: ctx.accounts.coin.to_account_info(),
            system_program: ctx.accounts.system_program.to_account_info(),
            rent: ctx.accounts.rent.to_account_info(),
        };
        let cpi = CpiContext::new_with_signer(ctx.accounts.token_metadata_program.key(), accounts, seeds);
        let data = DataV2 {
            name,
            symbol,
            uri,
            seller_fee_basis_points: 0,
            creators: None,
            collection: None,
            uses: None,
        };
        create_metadata_accounts_v3(cpi, data, true, true, None)?;
        Ok(())
    }`

const INIT_FN = `    pub fn init_player(ctx: Context<InitPlayer>) -> Result<()> {
        ctx.accounts.player_data.health = MAX_HEALTH;
        Ok(())
    }`

const MINT_LINE = "        token_interface::mint_to(cpi, ONE_COIN)?;"
const REFUSE_LINE = "            return err!(ErrorCode::NotEnoughHealth);"

const KILL_FN = `    pub fn kill_enemy(ctx: Context<Battle>) -> Result<()> {
        if ctx.accounts.player_data.health == 0 {
${REFUSE_LINE}
        }
        ctx.accounts.player_data.health -= HIT;

${SEEDS}
        let accounts = MintTo {
            mint: ctx.accounts.coin.to_account_info(),
            to: ctx.accounts.player_tokens.to_account_info(),
            authority: ctx.accounts.coin.to_account_info(),
        };
        let cpi = CpiContext::new_with_signer(ctx.accounts.token_program.key(), accounts, seeds);
${MINT_LINE}
        msg!("Enemy defeated: +1 coin, {} health left", ctx.accounts.player_data.health);
        Ok(())
    }`

const BURN_LINE = "        token_interface::burn(cpi, ONE_COIN)?;"

const HEAL_FN = `    pub fn heal(ctx: Context<Battle>) -> Result<()> {
        let accounts = Burn {
            mint: ctx.accounts.coin.to_account_info(),
            from: ctx.accounts.player_tokens.to_account_info(),
            authority: ctx.accounts.player.to_account_info(),
        };
        let cpi = CpiContext::new(ctx.accounts.token_program.key(), accounts);
${BURN_LINE}
        ctx.accounts.player_data.health = MAX_HEALTH;
        msg!("Healed to {} for one coin", MAX_HEALTH);
        Ok(())
    }`

const TOKEN_PROGRAM_LINE = "    pub token_program: Interface<'info, TokenInterface>,"

const METADATA_ACCOUNT = `    /// CHECK: Token Metadata creates this account; the seeds pin its address
    #[account(
        mut,
        seeds = [b"metadata", token_metadata_program.key().as_ref(), coin.key().as_ref()],
        bump,
        seeds::program = token_metadata_program.key(),
    )]
    pub metadata: UncheckedAccount<'info>,`

/** `CreateCoin` as step 1 writes it (without `token_program`, the planned failure), as it builds, and
 * with the metadata account, the Token Metadata program and `rent` of step 2 */
const createCoin = (v: "broken" | "s1" | "full") => `#[derive(Accounts)]
pub struct CreateCoin<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,
    #[account(
        init,
        payer = payer,
        seeds = [b"coin"],
        bump,
        mint::decimals = 0,
        mint::authority = coin,
    )]
    pub coin: InterfaceAccount<'info, Mint>,${v === "full" ? `\n${METADATA_ACCOUNT}` : ""}${v === "broken" ? "" : `\n${TOKEN_PROGRAM_LINE}`}${v === "full" ? "\n    pub token_metadata_program: Program<'info, Metadata>," : ""}
    pub system_program: Program<'info, System>,${v === "full" ? "\n    pub rent: Sysvar<'info, Rent>," : ""}
}`

const INIT_PLAYER = `#[derive(Accounts)]
pub struct InitPlayer<'info> {
    #[account(mut)]
    pub player: Signer<'info>,
    #[account(
        init,
        payer = player,
        space = 8 + PlayerData::INIT_SPACE,
        seeds = [b"player", player.key().as_ref()],
        bump,
    )]
    pub player_data: Account<'info, PlayerData>,
    #[account(seeds = [b"coin"], bump)]
    pub coin: InterfaceAccount<'info, Mint>,
    #[account(
        init_if_needed,
        payer = player,
        associated_token::mint = coin,
        associated_token::authority = player,
        associated_token::token_program = token_program,
    )]
    pub player_tokens: InterfaceAccount<'info, TokenAccount>,
    pub token_program: Interface<'info, TokenInterface>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub system_program: Program<'info, System>,
}`

const BATTLE = `#[derive(Accounts)]
pub struct Battle<'info> {
    pub player: Signer<'info>,
    #[account(
        mut,
        seeds = [b"player", player.key().as_ref()],
        bump,
    )]
    pub player_data: Account<'info, PlayerData>,
    #[account(mut, seeds = [b"coin"], bump)]
    pub coin: InterfaceAccount<'info, Mint>,
    #[account(
        mut,
        associated_token::mint = coin,
        associated_token::authority = player,
        associated_token::token_program = token_program,
    )]
    pub player_tokens: InterfaceAccount<'info, TokenAccount>,
    pub token_program: Interface<'info, TokenInterface>,
}`

/** The constants sit right over the player they're about, so the three are one block */
const DATA = `const MAX_HEALTH: u8 = 100;
/// The health one fight costs
const HIT: u8 = 10;
/// The coin has 0 decimals, so 1 is one whole coin
const ONE_COIN: u64 = 1;

#[account]
#[derive(InitSpace)]
pub struct PlayerData {
    pub health: u8,
}

#[error_code]
pub enum ErrorCode {
    #[msg("Not enough health")]
    NotEnoughHealth,
}`

type Parts = { imports: number; create?: "empty" | "full"; init?: boolean; kill?: boolean; heal?: boolean; coin?: "broken" | "s1" | "full"; player?: boolean; battle?: boolean; data?: boolean }

/** lib.rs with the pieces written so far, each in its place. Every write is placed by the file as it
 * stands right after it: the functions repeat their seeds and `mint:` lines, the structs `#[account(mut)]` */
function lib(p: Parts) {
  const fns = [p.create === "empty" ? CREATE_EMPTY : p.create === "full" ? CREATE_FULL : null, p.init && INIT_FN, p.kill && KILL_FN, p.heal && HEAL_FN].filter(Boolean)
  const module = fns.length ? `#[program]\nmod battle_coins {\n    use super::*;\n\n${fns.join("\n\n")}\n}` : null
  return [boil(p.imports), module, p.coin && createCoin(p.coin), p.player && INIT_PLAYER, p.battle && BATTLE, p.data && DATA].filter(Boolean).join("\n\n")
}

const S1: Parts = { imports: 1, create: "empty", coin: "s1" }
const S2: Parts = { imports: 2, create: "full", coin: "full" }
const S3: Parts = { ...S2, imports: 3, init: true, kill: true, player: true, battle: true, data: true }
const LIB_BROKEN = lib({ ...S1, coin: "broken" })
const LIB_S1 = lib(S1)
const LIB_S2 = lib(S2)
const LIB_S3 = lib(S3)
const LIB_S4 = lib({ ...S3, imports: 4, heal: true })

/** The line of `pub coin` in the first build, which the planned failure points at */
const COIN_LINE = LIB_BROKEN.split("\n").findIndex((l) => l.trim() === "pub coin: InterfaceAccount<'info, Mint>,") + 1

const EXPLAIN_ERROR = "`init` makes your coin's mint, but a mint isn't an account of your program. It belongs to a token program, which keeps every coin's supply and balances, and Anchor asks that program to set the mint up. `CreateCoin` doesn't name one yet."

const UPGRADES = `Upgrades ${shortKey(PROGRAM_ID).replace("…", "…⁠")} in place · from your wallet`

const FEE_CHIP = {
  label: "Does a failed fight cost a fee?",
  match: /\b(fee|fees|cost)\b/i,
  answer: "Yes, a failed transaction still pays its fee, here from your wallet. Nothing else changes: a failure rolls back everything the instruction did.",
}

const STEPS: Step[] = [
  {
    id: "coin",
    title: "Coin",
    short: "Coin",
    objective: "Make the coin: a mint your program owns",
    learned: "Creating a token mint at a PDA",
    file: LIB,
    start: "",
    target: LIB_S1,
    goal: "build",
    beats: [
      {
        kind: "write",
        id: "s1.boil",
        text: "Same opening as Lumberjack: the import and the program's id. The import also brings in `token_interface`, Anchor's way to talk to Solana's token programs. Routine, so I've written it.",
        writes: { file: LIB, block: boil(1), ref: lib({ imports: 1 }) },
      },
      {
        kind: "say",
        id: "s1.what",
        text: 'A coin on Solana is a mint: an account that records how many exist and who may make more. Yours will sit at a PDA from `"coin"` and be its own mint authority, so only your program can mint it.',
      },
      {
        kind: "write",
        id: "s1.accounts",
        text: "Here's `CreateCoin`. `init` with `mint::` makes the mint: 0 decimals, since a game coin is never split, and the coin's own address as its authority.",
        writes: { file: LIB, block: createCoin("broken"), ref: lib({ imports: 1, coin: "broken" }) },
      },
      {
        kind: "write",
        id: "s1.fn",
        text: "And `create_coin`, empty for now: by the time it runs, Anchor has made the mint.",
        writes: { file: LIB, block: `#[program]\nmod battle_coins {\n    use super::*;\n\n${CREATE_EMPTY}\n}`, ref: LIB_BROKEN },
      },
      {
        kind: "act",
        id: "s1.build",
        act: "build",
        say: "That's your coin, in code. Let's compile it.",
        title: "Build lib.rs",
        context: "Compiles lib.rs on Playground's build server",
        button: "Build",
      },
    ],
    planned: "This one's on purpose. Everyone who makes their first mint meets this error, so let's meet it now.",
    plannedShort: `\`init\` on line ${COIN_LINE} makes a mint, and \`CreateCoin\` names no token program to make it with.`,
    onFail: [
      { kind: "say", id: "f1.explain", text: EXPLAIN_ERROR, quote: { file: LIB, line: COIN_LINE, mark: "coin", tone: "error" } },
      {
        kind: "ask",
        id: "f1.q",
        kicker: "Fix it",
        question: "So what does `CreateCoin` need?",
        options: ["`mut` on `coin`", "A struct of your own for the coin's data, marked `#[account]`", "A token program, as `token_program`"],
        code: false,
        answer: 2,
        right: "Exactly. With `token_program` in the list, `init` asks it to set up the mint. I've added it as an `Interface`, so the coin can live in either token program.",
        why: [
          "`init` already makes `coin` writable. The build is asking for the program that owns mints.",
          "A mint's layout belongs to the token program, and `InterfaceAccount<Mint>` already reads it. You don't define it, you ask for it.",
          null,
        ],
        hint: "Read the error again: it names the field that's missing.",
        writes: { file: LIB, block: TOKEN_PROGRAM_LINE, ref: LIB_S1 },
        key: "pub token_program: Interface<'info, TokenInterface>,",
        typed: "That's the field. Now `init` can ask the token program to make the mint.",
      },
      {
        kind: "act",
        id: "f1.build",
        act: "build",
        say: "Build again. This time it should pass.",
        title: "Build lib.rs",
        context: "Same build, now with `token_program`",
        button: "Build",
      },
    ],
    win: {
      id: "s1.win",
      headline: "Your program can make a coin",
      line: "The IDL has one instruction, `create_coin`. The coin's address is a PDA, so you know it before it exists.",
      stats: [
        { icon: "hammer", text: "Built in 1.6 s" },
        { icon: "braces", text: "1 instruction" },
        { icon: "clock", text: "{took}" },
      ],
    },
    explainStep: "This step writes `CreateCoin`, which makes your coin's mint at a PDA, its own mint authority. The first build fails on purpose: a mint belongs to a token program, and the struct doesn't name one yet.",
    chips: [
      {
        label: "What is a mint?",
        match: /\bmint\b/i,
        answer: "A mint is the token itself: an account that holds the supply, the decimals and who may mint more. Balances are elsewhere, in token accounts, one per holder.",
      },
      {
        label: "Why 0 decimals?",
        match: /decimals?/i,
        answer: "Decimals say where the point goes when an amount is shown. A game coin is never split, so with 0 decimals the amount 1 is one coin. Most tokens use 6 or 9.",
      },
    ],
    errorChips: [
      {
        label: "Token or Token-2022?",
        match: /token[- ]?2022|interface/i,
        answer: "Solana has two token programs: Token, the original, and Token-2022, which adds extensions. `Interface<TokenInterface>` accepts either; this lesson makes the coin with Token, the one Token Metadata has always worked with.",
      },
      {
        label: "Where is this in the docs?",
        match: /\b(docs?|documentation)\b/i,
        answer: "The Anchor docs cover it in [Create a Token Mint](https://www.anchor-lang.com/docs/tokens/basics/create-mint).",
      },
    ],
    answers: [{ match: /why.*(fail|error)/i, answer: EXPLAIN_ERROR, local: true }],
  },
  {
    id: "name",
    title: "Name",
    short: "Name",
    objective: "Give the coin a name, a symbol and an icon, and put it on devnet",
    learned: "Calling another program and signing for a PDA",
    file: LIB,
    start: LIB_S1,
    target: LIB_S2,
    goal: "send",
    beats: [
      {
        kind: "say",
        id: "s2.why",
        text: "Right now your coin is a bare address: wallets and Explorer would show it as Unknown Token. A name, a symbol and an icon live in a metadata account that the Token Metadata program keeps, one per mint.",
      },
      {
        kind: "write",
        id: "s2.accounts",
        text: "`CreateCoin` gets that account, at the address Token Metadata works out from your mint, and the program itself. I've added both, and the `rent` sysvar its call still lists.",
        writes: { file: LIB, block: createCoin("full"), ref: lib({ imports: 1, create: "empty", coin: "full" }) },
      },
      {
        kind: "write",
        id: "s2.imports",
        text: "And the imports, for Token Metadata's call and its accounts.",
        writes: { file: LIB, block: IMPORTS[2], ref: lib({ imports: 2, create: "empty", coin: "full" }) },
      },
      {
        kind: "say",
        id: "s2.sign",
        text: "Token Metadata only names a mint if the mint's authority signs. Yours is the coin's PDA, and nobody holds a key for it.",
      },
      {
        kind: "ask",
        id: "s2.q1",
        kicker: "Question",
        n: 1,
        question: "So how does `create_coin` sign for the coin's PDA?",
        options: ["Your wallet signs for it, since it pays", "The program passes the PDA's seeds with the call", "It doesn't have to: Token Metadata trusts your program"],
        code: false,
        answer: 1,
        right: 'Yes. With `new_with_signer` the program hands over `"coin"` and the bump, and the runtime takes that as the PDA\'s signature, because those seeds and your program make that address. I\'ve written `create_coin` around it.',
        why: [
          "A signature only counts for its own key. Yours isn't the PDA's, and Token Metadata checks the PDA's.",
          null,
          "Token Metadata doesn't know your program. It checks that the mint authority signed, and fails the call if it didn't.",
        ],
        hint: "Only one program can sign for a PDA: the one whose id made the address. What else does it need?",
        writes: { file: LIB, block: CREATE_FULL, ref: LIB_S2 },
        key: SEEDS.trim(),
        typed: "That's the line: the seeds and the bump. I've passed them with the call and filled in the name, the symbol and the icon.",
      },
      {
        kind: "act",
        id: "s2.ship",
        act: "buildDeploy",
        say: "Your program isn't on devnet yet. Build and deploy it.",
        title: "Build and deploy",
        context: "First deploy · about 1.27 devnet SOL from your wallet",
        button: "Build and deploy",
      },
      {
        kind: "act",
        id: "s2.create",
        act: "send",
        ix: "create_coin",
        say: "Now make the coin. The name, the symbol and the icon come from the original tutorial; change them if you like.",
        title: "Create your coin",
        context: "Calls `create_coin` · rent and fees from your wallet",
        button: "Create coin",
        fields: [
          { name: "name", label: "Name", kind: "text", max: 32 },
          { name: "symbol", label: "Symbol", kind: "text", max: 10 },
        ],
        record: "Created your coin",
      },
    ],
    win: {
      id: "s2.win",
      headline: "Your coin has a name and an icon",
      line: "That's Token Metadata's account for your mint, read back from devnet. Explorer and wallets show the same.",
      stats: [
        { icon: "rocket", text: "Live on devnet" },
        { icon: "coins", text: "Rent 0.0071 SOL" },
        { icon: "clock", text: "{took}" },
      ],
      extra: "openTest",
    },
    testWin: "You called `create_coin` from the Call panel. Your coin is on devnet with its name and icon.",
    explainStep: "This step adds the metadata account and the call to Token Metadata, signed with the coin's seeds. Then the program goes to devnet and you make the coin.",
    chips: [
      {
        label: "What is a CPI?",
        match: /\bcpi\b|cross.program/i,
        answer: "A cross program invocation: your program calling another one, here Token Metadata, inside the same transaction. If the call fails, the whole transaction fails.",
      },
      {
        label: "Can someone else make my coin?",
        match: /someone|anyone|else|admin/i,
        answer: "On this program `create_coin` works once: the coin's PDA can only be made one time, and you made it right after deploying. A shared program would also check who calls it, with an admin key.",
      },
      {
        label: "What does the metadata account hold?",
        match: /metadata/i,
        answer: "The name, the symbol and a link to a JSON file with the icon and a description, plus who may update them: your coin's PDA. About 0.0056 SOL of rent, and Token Metadata keeps a 0.01 SOL create fee in it.",
      },
    ],
  },
  {
    id: "reward",
    title: "Reward",
    short: "Reward",
    objective: "Pay the player a coin for every enemy defeated",
    learned: "Minting tokens from a program",
    file: LIB,
    start: LIB_S2,
    target: LIB_S3,
    goal: "move",
    beats: [
      {
        kind: "write",
        id: "s3.player",
        text: "Same player as Lumberjack: an account at a PDA from your wallet, with health instead of energy. 100 to start, 10 lost each fight, and Lumberjack's custom error for when there's none left.",
        writes: { file: LIB, block: DATA, ref: lib({ ...S2, data: true }) },
      },
      {
        kind: "write",
        id: "s3.purse",
        text: "And the player's coin account. Balances don't live in your program or in the mint: every holder has a token account per coin, at an address the Associated Token Program works out from the wallet and the mint. `InitPlayer` makes it, unless it's already there.",
        writes: { file: LIB, block: INIT_PLAYER, ref: lib({ ...S2, data: true, player: true }) },
      },
      {
        kind: "write",
        id: "s3.init",
        text: "`init_player` itself only sets the health: Anchor has made both accounts by the time it runs.",
        writes: { file: LIB, block: INIT_FN, ref: lib({ ...S2, data: true, player: true, init: true }) },
      },
      {
        kind: "ask",
        id: "s3.q2",
        kicker: "Question",
        n: 2,
        question: "A defeated enemy pays one coin. How does `kill_enemy` pay it?",
        options: ["Add 1 to a `coins` field in `PlayerData`", "Transfer one from the payer's coin account", "`mint_to` the player's coin account, signed with the coin's seeds"],
        code: false,
        answer: 2,
        right: "Right. `mint_to` makes a new coin in the player's account, and the supply grows by one. The coin's seeds sign it, as in `create_coin`. I've written `kill_enemy` around it.",
        why: [
          "Then it's a number only your program reads. Wallets and Explorer don't see it, and the player can't send it to anyone.",
          "Someone would have to keep that account stocked and sign every reward. Your program is the mint authority: it can make the coin.",
          null,
        ],
        hint: "Your program can make coins. Where should a coin end up so the player really holds it?",
        writes: { file: LIB, block: KILL_FN, ref: lib({ ...S2, data: true, player: true, init: true, kill: true }) },
        key: MINT_LINE.trim(),
        typed: "That's the line. I've written the health check and the seeds around it.",
      },
      {
        kind: "write",
        id: "s3.accounts",
        text: "And its accounts, `Battle`: your player, the coin and your coin account, all `mut` because a fight changes them. `heal` will take the same ones.",
        writes: { file: LIB, block: BATTLE, ref: lib({ ...S3, imports: 2 }) },
      },
      {
        kind: "write",
        id: "s3.imports",
        text: "The imports grow too: the Associated Token Program, `TokenAccount` and `MintTo`.",
        writes: { file: LIB, block: IMPORTS[3], ref: LIB_S3 },
      },
      {
        kind: "act",
        id: "s3.ship",
        act: "buildDeploy",
        say: "Devnet still runs the program without players. Build and deploy: it keeps its address, and your coin.",
        title: "Build and deploy",
        context: UPGRADES,
        button: "Build and deploy",
      },
      {
        kind: "act",
        id: "s3.join",
        act: "send",
        ix: "init_player",
        say: "Join the game. This creates your player and your coin account.",
        title: "Join the game",
        context: "Calls `init_player` · rent from your wallet",
        button: "Join",
        record: "Joined · 100 health, 0 GOLDSOL",
      },
      {
        kind: "act",
        id: "s3.fight",
        act: "move",
        say: "Now fight. Each win costs 10 health and pays one coin.",
        title: "Defeat an enemy",
        context: "Sends `kill_enemy` · fee from your wallet",
        button: "Defeat enemy",
        moves: [{ ix: "kill_enemy", button: "Defeat enemy" }],
        until: { label: "Defeat until out of health", stop: "refused" },
        record: "Fought",
      },
    ],
    win: {
      id: "s3.win",
      headline: "Ten wins, ten coins",
      line: "Every win minted one {symbol} into your coin account, and the supply grew with it. At 0 health the program refused with `NotEnoughHealth`.",
      stats: [
        { icon: "coins", text: "10 GOLDSOL" },
        { icon: "alert", text: "Error 6000" },
        { icon: "clock", text: "{took}" },
      ],
    },
    testWin: "You fought from the Call panel until the health ran out, and `NotEnoughHealth` came back as error 6000.",
    explainStep: "This step brings in the player and its coin account, and `kill_enemy`, which mints a coin for every win. Then you fight until the health runs out.",
    chips: [
      {
        label: "What is an associated token account?",
        match: /associated|\bata\b/i,
        answer: "The token account at the address worked out from a wallet and a mint. Every wallet and app finds a holder's coins there without asking anyone, which is why rewards go to it.",
      },
      {
        label: "Why init_if_needed?",
        match: /init_if_needed/i,
        answer: "Anyone can create someone's associated account, and wallets do when they receive a coin. Plain `init` would make joining fail if yours already exists.",
      },
      FEE_CHIP,
    ],
  },
  {
    id: "heal",
    title: "Heal",
    short: "Heal",
    objective: "Spend a coin to heal the player",
    learned: "Burning tokens",
    file: LIB,
    start: LIB_S3,
    target: LIB_S4,
    goal: "move",
    beats: [
      { kind: "say", id: "s4.why", text: "Your player has 0 health and 10 coins. `heal` spends one coin to bring the health back to 100." },
      {
        kind: "ask",
        id: "s4.q3",
        kicker: "Question",
        n: 3,
        question: "How should `heal` take the coin?",
        options: ["`burn` it from the player's coin account, signed by the player", "Lower the balance of the player's coin account in `heal`", "Close the player's coin account"],
        code: false,
        answer: 0,
        right: "Yes. `burn` destroys the coin and the supply drops by one: wins add coins, heals take them out. The player signs, because only a holder can spend their coins. I've written `heal`.",
        why: [
          null,
          "That account belongs to the Token program, not to yours. Only the Token program changes a balance, and only when you ask it with a call.",
          "Closing needs the balance at 0, and it gives back the rent. It doesn't spend one coin.",
        ],
        hint: "The coin should be gone for good, and the supply should show it.",
        writes: { file: LIB, block: HEAL_FN, ref: lib({ ...S3, heal: true }) },
        key: BURN_LINE.trim(),
        typed: "That's the line. I've written the rest: the player signs, and the health goes back to 100.",
      },
      {
        kind: "write",
        id: "s4.import",
        text: "And `Burn` in the import.",
        writes: { file: LIB, block: IMPORTS[4], ref: LIB_S4 },
      },
      {
        kind: "act",
        id: "s4.ship",
        act: "buildDeploy",
        say: "Build and deploy the heal. Your player and your coins stay: only the program changes.",
        title: "Build and deploy",
        context: UPGRADES,
        button: "Build and deploy",
      },
      {
        kind: "act",
        id: "s4.heal",
        act: "move",
        say: "Heal.",
        title: "Heal",
        context: "Sends `heal` · burns one coin from your account",
        button: "Heal",
        moves: [{ ix: "heal", button: "Heal" }],
        record: "Healed",
      },
    ],
    win: {
      id: "s4.win",
      headline: "A coin spent on health",
      line: "The burn took one {symbol} out of your account and out of the supply: {was} became {supply}. Your player is back at 100.",
      stats: [
        { icon: "heart", text: "100 health" },
        { icon: "flame", text: "1 GOLDSOL burned" },
        { icon: "clock", text: "{took}" },
      ],
    },
    testWin: "You healed from the Call panel: one {symbol} burned, and your player is back at 100.",
    explainStep: "This step adds `heal`, which burns one coin from your account, signed by you, and brings the health back to 100.",
    chips: [
      {
        label: "What if I have no coins?",
        match: /no coins?|zero|empty|insufficient/i,
        answer: "Then the Token program refuses the burn with its own error, `insufficient funds` (custom program error 0x1), and nothing changes. Try it from the Call panel.",
      },
      {
        label: "Can the program burn my coins without me?",
        match: /without me|take my|steal/i,
        answer: "No. Your coin account's authority is your wallet, so every burn needs your signature. The coin's PDA can make coins, not take them.",
      },
      {
        label: "Why does Heal at full health burn a coin?",
        match: /full health|already 100/i,
        answer: "The program doesn't check: `heal` burns first and sets 100, as the original did. A real game would refuse with its own error when the health is full.",
      },
    ],
  },
]

/** `init` with `mint::` and no `token_program` among the accounts: a mint belongs to a token program */
const mintWithoutTokenProgram: SpecialCheck = ({ bare, file, head, failed }) => {
  if (!/\binit\b[\s\S]*?mint::/.test(bare) || /\btoken_program\s*:/.test(bare)) return null
  const rows = bare.split("\n")
  // The field the `init` attribute sits over
  const opens = rows.findIndex((r) => /mint::/.test(r))
  const at = rows.findIndex((r, i) => i > opens && /^\s*pub\s+\w+\s*:/.test(r))
  if (at === -1) return null
  const name = rows[at].match(/pub\s+(\w+)/)![1]
  const line = at + 1
  const column = rows[at].indexOf(name) + 1
  return {
    ok: false,
    planned: true,
    line,
    column,
    span: name.length,
    log: [
      ...head,
      "error: a non-optional init constraint requires a non-optional token_program field to exist in the account validation struct. Use the Program type to add the token_program field to your validation struct.",
      ` --> ${file}:${line}:${column}`,
      "Build failed",
    ],
    reason: `${failed}: \`init\` on line ${line} makes a mint, and the struct names no token program to make it with.`,
    explain: EXPLAIN_ERROR,
  }
}

/** `associated_token::` with no `associated_token_program` among the accounts: rustc can't find the
 * value Anchor's code reaches for, since Anchor only names it when that account is the first `init` */
const noAssociatedTokenProgram: SpecialCheck = ({ code, bare, file, head, failed }) => {
  if (!/associated_token::mint/.test(bare) || /\bassociated_token_program\s*:/.test(bare)) return null
  const line = lineOf(code, "associated_token::mint")
  return {
    ok: false,
    line,
    log: [...head, "error[E0425]: cannot find value `associated_token_program` in this scope", ` --> ${file}:${line}`, "Build failed"],
    reason: `${failed}: \`associated_token::\` on line ${line} needs \`associated_token_program\` among the accounts.`,
    explain: "An associated token account is created by the Associated Token Program, so it has to be in the instruction's accounts: `pub associated_token_program: Program<'info, AssociatedToken>,`.",
  }
}

const CHECKS = [mintWithoutTokenProgram, payerNotMut, noAssociatedTokenProgram, noSystemProgram]

// ---- The coin and the player: what the program does with them, worked out the way it would

const find = (s: State, id: string) => s.records?.find((r) => r.id === id) ?? null
const symbolOf = (s: State) => String(find(s, "coin")?.values.symbol ?? "GOLDSOL")

function args(_s: State, ix: string): Record<string, string> {
  if (ix === "create_coin") return { name: "Solana Gold", symbol: "GOLDSOL", uri: GOLD_URI }
  return {}
}

/** Token Metadata's own limits on a name, a symbol and the link */
function check(ix: string, given: Record<string, string>): string | null {
  if (ix !== "create_coin") return null
  if (bytes(given.name ?? "") > 32) return "Token Metadata takes names up to 32 characters."
  if (bytes(given.symbol ?? "") > 10) return "Token Metadata takes symbols up to 10 characters."
  if (bytes(given.uri ?? "") > 200) return "Token Metadata takes links up to 200 characters."
  return null
}

const set = (rows: Rec[], id: string, values: Rec["values"]) => rows.map((r) => (r.id === id ? { ...r, values: { ...r.values, ...values } } : r))

/** One send, from a card or the Call panel, answered as devnet would: the coin and the player are made
 * once, a fight at 0 health is refused by the program's own error, a heal with no coins by the Token
 * program's */
function send(s: State, ix: string, given?: Record<string, string>): RecSend | { note: string } {
  const a = { ...args(s, ix), ...given }
  const rows = s.records ?? []
  const coin = find(s, "coin")
  const player = find(s, "player")
  const purse = find(s, "purse")
  const signature = rows.length === 0 && ix === "create_coin" ? CREATE_SIGNATURE : signatureOf(sentSoFar(s) + 300)
  if (ix === "create_coin") {
    if (coin) return { tx: inUse("create_coin", COIN, signature), records: rows, refused: "Already in use · your coin stayed as it was" }
    const why = check(ix, a)
    if (why) return { note: why }
    const rec: Rec = { id: "coin", kind: "Mint", pda: COIN, values: { supply: 0, name: a.name, symbol: a.symbol, uri: a.uri }, rent: MINT_RENT + METADATA_RENT }
    const tx: Tx = {
      instruction: "create_coin",
      said: "",
      signature,
      compute: 61840,
      inner: [...SYSTEM_CPI, ...tokenCpi("InitializeMint2"), `Program ${METADATA_PROGRAM} invoke [2]`, "Program log: IX: Create Metadata Accounts v3", `Program ${METADATA_PROGRAM} success`],
    }
    return { tx, records: [...rows, rec], out: [`Rent ${(MINT_RENT + METADATA_RENT).toFixed(4)} SOL (mint and metadata) · Token Metadata's create fee ${METADATA_FEE} SOL`] }
  }
  if (ix === "init_player") {
    if (!coin) return { note: "Create your coin first, with `create_coin`." }
    if (player) return { tx: inUse("init_player", PLAYER, signature), records: rows, refused: "Already in use · your player stayed as it was" }
    const made: Rec[] = [
      { id: "player", kind: "Player", pda: PLAYER, values: { health: MAX_HEALTH }, rent: PLAYER_RENT },
      { id: "purse", kind: "TokenAccount", pda: PURSE, values: { amount: 0 }, rent: TOKEN_ACCOUNT_RENT },
    ]
    return { tx: { instruction: "init_player", said: "", signature, compute: 24310, inner: [...SYSTEM_CPI, ...ATA_CPI] }, records: [...rows, ...made] }
  }
  if (ix === "kill_enemy" || ix === "heal") {
    if (!player || !purse || !coin) return { note: "Join the game first, with `init_player`." }
    const health = Number(player.values.health)
    const amount = Number(purse.values.amount)
    const supply = Number(coin.values.supply)
    if (ix === "kill_enemy") {
      if (health === 0) {
        const tx: Tx = { instruction: ix, said: "", signature, compute: 3720, error: { name: "NotEnoughHealth", number: 6000, message: "Not enough health", line: lineOf(s.deployedLib ?? "", REFUSE_LINE.trim()) } }
        return { tx, records: rows, refused: "NotEnoughHealth · 6000 · your player stayed as it was" }
      }
      const left = health - HIT
      const tx: Tx = { instruction: ix, said: `Enemy defeated: +1 coin, ${left} health left`, signature, compute: 9640, inner: tokenCpi("MintTo") }
      return { tx, records: set(set(set(rows, "player", { health: left }), "purse", { amount: amount + 1 }), "coin", { supply: supply + 1 }) }
    }
    if (amount === 0) return { tx: insufficientFunds("heal", signature, "Burn"), records: rows, refused: "Insufficient funds · the Token program refused, nothing burned" }
    const tx: Tx = { instruction: ix, said: `Healed to ${MAX_HEALTH} for one coin`, signature, compute: 8210, inner: tokenCpi("Burn") }
    return { tx, records: set(set(set(rows, "player", { health: MAX_HEALTH }), "purse", { amount: amount - 1 }), "coin", { supply: supply - 1 }) }
  }
  return { note: "That call has no card here." }
}

/** Step 2 passes on the coin made, step 3 on `NotEnoughHealth`, step 4 on a heal that landed */
const passes = (_s: State, i: number, ix: string, tx: Tx) =>
  i === 1 ? ix === "create_coin" && !tx.error : i === 2 ? ix === "kill_enemy" && tx.error?.name === "NotEnoughHealth" : i === 3 ? ix === "heal" && !tx.error : false

export const BATTLE_COINS: Lesson = {
  card: { slug: "battle-coins", name: "Battle Coins", level: "Intermediate", framework: "Anchor", ext: "jpg" },
  minutes: 15,
  by: "Jonas Hahn and John",
  program: "battle_coins",
  line: "Give a game a coin of its own: minted for every win, burned to heal",
  intro: "You'll give a game a coin of its own: a token with a name and an icon, minted to the player for every enemy defeated and burned to heal. It builds on Lumberjack's player.",
  proof: "Program log: Enemy defeated: +1 coin, 90 health left",
  badge: "Game coin",
  headline: "You built a coin your game pays and spends",
  proofLine: (_tx, s) => `Your player holds ${Number(find(s, "purse")?.values.amount ?? 0).toLocaleString("en-US")} ${symbolOf(s)} on devnet: minted by your program for every win, burned for every heal.`,
  // The next Intermediate one in Anchor: the same player fights a boss
  next: "boss-battle",
  nextLine: "Boss Battle is a good next one: your player fights a boss, and the program rolls each hit's damage on chain.",
  steps: STEPS,
  // No client.ts: the coin, the player, the fights and the heals go from the cards or the Call panel
  files: { [LIB]: "" },
  preview: LIB_S4,
  programId: PROGRAM_ID,
  idlAccount: IDL_ACCOUNT,
  txSignature: CREATE_SIGNATURE,
  checks: CHECKS,
  story: false,
  runTx: () => ({ instruction: "create_coin", said: "", signature: CREATE_SIGNATURE, compute: 61840, inner: SYSTEM_CPI }),
  records: {
    title: "Coin",
    one: "account",
    empty: "No coin yet. Create sends `create_coin`.",
    show: (r) => ({ label: r.kind === "Mint" ? String(r.values.name) : r.kind === "Player" ? "Player" : "Your coin account", seeds: "", fields: [] }),
    send: (s, ix, given) => send(s, ix, given),
    passes,
    args,
    check,
    tokens: (rows) => {
      const coin = rows.find((r) => r.id === "coin")
      const player = rows.find((r) => r.id === "player")
      const purse = rows.find((r) => r.id === "purse")
      return {
        mint: coin
          ? { name: String(coin.values.name), symbol: String(coin.values.symbol), key: COIN, supply: Number(coin.values.supply), decimals: 0, authority: "the program", metadata: true }
          : null,
        holders: purse ? [{ id: "purse", label: "Your coin account", key: PURSE, owner: "yours", amount: Number(purse.values.amount) }] : [],
        strip: player ? { label: "Player account", key: PLAYER, meter: { value: Number(player.values.health), max: MAX_HEALTH }, lines: [] } : undefined,
      }
    },
  },
  // Step 4's win names the supply around the first heal that landed, whatever came after it
  winVars: (s) => {
    const heal = s.thread.flatMap((t) => (t.kind === "act" ? (t.sends ?? []) : [])).find((x) => x.ix === "heal" && x.ok)
    const supply = (rows?: Rec[]) => String(rows?.find((r) => r.id === "coin")?.values.supply ?? "")
    return { symbol: symbolOf(s), was: supply(heal?.snap.before) || "10", supply: supply(heal?.snap.after) || "9" }
  },
}
