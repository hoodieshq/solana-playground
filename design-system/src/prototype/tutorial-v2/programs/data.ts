import { PROGRAMS, type Program } from "../ui/programs"

/* What the redesigned flow knows about each catalog program, on top of the product's list. In the
   product most of this would ship in programs.json (proposal for later); here it is written by hand.
   Levels are honest: only memo, noop and record can be called by a beginner without setup */

export type Level = "Beginner" | "Intermediate" | "Advanced"

export type Arg = { name: string; type: string; example: string }

export type Ix = {
  name: string
  args: Arg[]
  /** The accounts it takes, as the IDL names them. Empty: signers only */
  accounts: string[]
  /** What it does, in one plain line */
  line: string
}

export type ProgramMeta = Program & {
  slug: string
  /** The name people read on its card and the banner, in Title Case as the tutorials' (Almaz, 25 Nov);
   * `name` stays the program's folder, the project's name once opened */
  title: string
  level: Level
  minutes: number
  /** Devnet SOL a first deploy takes */
  cost: number
  repo: string
  path: string
  ixs: Ix[]
  /** The instruction the Guide calls first */
  first: string
  /** What the first call needs, said on the preview for the programs a beginner can't call alone */
  needs?: string
  /** The plain line under the name on the preview, longer than the card's */
  about: string
  /** What it is for, the catalog's section. The product's categories are mostly "SPL", which says little */
  topic: Topic
  /** Solana's own copy on devnet, when the id in the source answers there as a program (measured 11/07) */
  devnetId: string | null
  /** Callable without a build: the input is raw bytes, so no IDL is needed (memo and noop). Off for every
   * program since 11/09: calling Solana's copies on devnet is out of scope for now (Sergey) */
  callable?: boolean
  /** What it is written in. Anchor builds on Playground's server; Native is read only for now */
  kind: "anchor" | "native"
  /** Files of its own, for the small examples written by hand: the SPL ones are generated from `ixs` */
  own?: { files: Record<string, string>; main: string }
}

/** Three groups of three or four: five finer topics left two of them with one program each */
export const TOPICS = ["Basics", "Tokens and trading", "Network services"] as const
export type Topic = (typeof TOPICS)[number]

const TOPIC: Record<string, Topic> = {
  "hello-solana": "Basics",
  counter: "Basics",
  "create-account": "Basics",
  "transfer-sol": "Basics",
  favorites: "Basics",
  "spl-memo": "Basics",
  "spl-noop": "Basics",
  "spl-record": "Basics",
  "spl-shared-memory": "Basics",
  "spl-stateless-asks": "Tokens and trading",
  "spl-binary-option": "Tokens and trading",
  "spl-binary-oracle-pair": "Tokens and trading",
  "spl-feature-proposal": "Network services",
  "spl-name-service": "Network services",
}

const SPL_REPO = "solana-labs/solana-program-library"

/* The five small programs a beginner starts from, the basics of solana-developers/program-examples
   (Almaz, 16 Nov: they live in the catalog with the rest, not as a separate bundled set in New project).
   Written by hand, short versions of the repo's own */

const EXAMPLES_REPO = "solana-developers/program-examples"

const BASIC_PROGRAMS: Program[] = [
  { name: "hello-solana", framework: "Native", categories: ["Basics"], icon: "", description: "Logs a message. The smallest program there is." },
  { name: "counter", framework: "Anchor", categories: ["Basics"], icon: "", description: "Stores a number in an account and adds one to it." },
  { name: "create-account", framework: "Anchor", categories: ["Basics"], icon: "", description: "Makes a new account owned by the program." },
  { name: "transfer-sol", framework: "Anchor", categories: ["Basics"], icon: "", description: "Sends SOL from one account to another." },
  { name: "favorites", framework: "Anchor", categories: ["Basics"], icon: "", description: "Saves each wallet's favorite number in its own account." },
]

const anchorReadme = (name: string, about: string, ixs: Ix[], path: string) => `# ${name}

${about}

## Instructions

${ixs.map((ix) => `- \`${ixSignature(ix)}\`: ${ix.line}`).join("\n")}

Source: github.com/${EXAMPLES_REPO}/tree/main/${path}
`

const COUNTER_LIB = `use anchor_lang::prelude::*;

declare_id!("11111111111111111111111111111111");

#[program]
pub mod counter {
    use super::*;

    pub fn initialize_counter(_ctx: Context<InitializeCounter>) -> Result<()> {
        Ok(())
    }

    pub fn increment(ctx: Context<Increment>) -> Result<()> {
        ctx.accounts.counter.count = ctx.accounts.counter.count.checked_add(1).unwrap();
        msg!("Count is now {}", ctx.accounts.counter.count);
        Ok(())
    }
}

#[derive(Accounts)]
pub struct InitializeCounter<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,
    #[account(init, payer = payer, space = 8 + Counter::INIT_SPACE)]
    pub counter: Account<'info, Counter>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct Increment<'info> {
    #[account(mut)]
    pub counter: Account<'info, Counter>,
}

#[account]
#[derive(InitSpace)]
pub struct Counter {
    count: u64,
}
`

const CREATE_ACCOUNT_LIB = `use anchor_lang::prelude::*;
use anchor_lang::system_program::{create_account, CreateAccount};

declare_id!("11111111111111111111111111111111");

#[program]
pub mod create_account_example {
    use super::*;

    pub fn create_system_account(ctx: Context<CreateSystemAccount>) -> Result<()> {
        msg!("Creating a new account: {}", ctx.accounts.new_account.key());
        // Enough lamports to keep an empty account open
        let lamports = Rent::get()?.minimum_balance(0);
        create_account(
            CpiContext::new(
                ctx.accounts.system_program.to_account_info(),
                CreateAccount {
                    from: ctx.accounts.payer.to_account_info(),
                    to: ctx.accounts.new_account.to_account_info(),
                },
            ),
            lamports,
            0,
            &ctx.accounts.system_program.key(),
        )?;
        msg!("Account created");
        Ok(())
    }
}

#[derive(Accounts)]
pub struct CreateSystemAccount<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,
    #[account(mut)]
    pub new_account: Signer<'info>,
    pub system_program: Program<'info, System>,
}
`

const TRANSFER_SOL_LIB = `use anchor_lang::prelude::*;
use anchor_lang::system_program::{transfer, Transfer};

declare_id!("11111111111111111111111111111111");

#[program]
pub mod transfer_sol {
    use super::*;

    pub fn transfer_sol_with_cpi(ctx: Context<TransferSolWithCpi>, amount: u64) -> Result<()> {
        transfer(
            CpiContext::new(
                ctx.accounts.system_program.to_account_info(),
                Transfer {
                    from: ctx.accounts.payer.to_account_info(),
                    to: ctx.accounts.recipient.to_account_info(),
                },
            ),
            amount,
        )?;
        msg!("Sent {} lamports", amount);
        Ok(())
    }
}

#[derive(Accounts)]
pub struct TransferSolWithCpi<'info> {
    #[account(mut)]
    payer: Signer<'info>,
    #[account(mut)]
    recipient: SystemAccount<'info>,
    system_program: Program<'info, System>,
}
`

const FAVORITES_LIB = `use anchor_lang::prelude::*;

declare_id!("11111111111111111111111111111111");

pub const ANCHOR_DISCRIMINATOR_SIZE: usize = 8;

#[program]
pub mod favorites {
    use super::*;

    pub fn set_favorites(ctx: Context<SetFavorites>, number: u64, color: String) -> Result<()> {
        let user = ctx.accounts.user.key();
        msg!("{} likes {} and {}", user, number, color);
        ctx.accounts.favorites.set_inner(Favorites { number, color });
        Ok(())
    }
}

#[account]
#[derive(InitSpace)]
pub struct Favorites {
    pub number: u64,
    #[max_len(50)]
    pub color: String,
}

#[derive(Accounts)]
pub struct SetFavorites<'info> {
    #[account(mut)]
    pub user: Signer<'info>,
    #[account(
        init_if_needed,
        payer = user,
        space = ANCHOR_DISCRIMINATOR_SIZE + Favorites::INIT_SPACE,
        seeds = [b"favorites", user.key().as_ref()],
        bump,
    )]
    pub favorites: Account<'info, Favorites>,
    pub system_program: Program<'info, System>,
}
`

type MetaEntry = Omit<ProgramMeta, keyof Program | "slug" | "title" | "topic" | "kind">

/** An Anchor basic: its entry, with its lib.rs and a README as its files */
function anchorBasic(slug: string, path: string, librs: string, m: Omit<MetaEntry, "repo" | "path" | "devnetId" | "own">): MetaEntry {
  return {
    ...m,
    repo: EXAMPLES_REPO,
    path,
    devnetId: null,
    own: { files: { "src/lib.rs": librs, "README.md": anchorReadme(slug, m.about, m.ixs, path) }, main: "src/lib.rs" },
  }
}

const BASIC_META: Record<string, MetaEntry> = {
  "hello-solana": {
    devnetId: null,
    level: "Beginner",
    minutes: 3,
    cost: 0.14,
    repo: EXAMPLES_REPO,
    path: "basics/hello-solana/native",
    first: "hello",
    about: "Writes one line to the transaction log and returns. No accounts and no input, so it shows the bare shape every program has.",
    ixs: [{ name: "hello", args: [], accounts: [], line: "Logs a greeting and the program's own id." }],
  },
  counter: anchorBasic("counter", "basics/counter/anchor", COUNTER_LIB, {
    level: "Beginner",
    minutes: 8,
    cost: 1.21,
    first: "initialize_counter",
    about: "Keeps one number in an account of its own. You make the account, then each call adds one to it, so you see a program keep state between calls.",
    ixs: [
      { name: "initialize_counter", args: [], accounts: ["payer", "counter", "system_program"], line: "Makes the counter account, starting at zero." },
      { name: "increment", args: [], accounts: ["counter"], line: "Adds one to the count." },
    ],
  }),
  "create-account": anchorBasic("create-account", "basics/create-account/anchor", CREATE_ACCOUNT_LIB, {
    level: "Beginner",
    minutes: 6,
    cost: 1.18,
    first: "create_system_account",
    about: "Asks the System Program to make a new account and pays its rent. The first cross program call most programs make.",
    ixs: [{ name: "create_system_account", args: [], accounts: ["payer", "new_account", "system_program"], line: "Creates a new empty account and pays its rent." }],
  }),
  "transfer-sol": anchorBasic("transfer-sol", "basics/transfer-sol/anchor", TRANSFER_SOL_LIB, {
    level: "Beginner",
    minutes: 6,
    cost: 1.19,
    first: "transfer_sol_with_cpi",
    about: "Moves SOL from your wallet to another account by calling the System Program, the way most programs pay or refund.",
    ixs: [{ name: "transfer_sol_with_cpi", args: [{ name: "amount", type: "u64", example: "1000000" }], accounts: ["payer", "recipient", "system_program"], line: "Sends lamports from the payer to the recipient." }],
  }),
  favorites: anchorBasic("favorites", "basics/favorites/anchor", FAVORITES_LIB, {
    level: "Beginner",
    minutes: 10,
    cost: 1.33,
    first: "set_favorites",
    about: "Gives every wallet its own account, found from the wallet's address, and saves a favorite number and color there.",
    ixs: [
      { name: "set_favorites", args: [{ name: "number", type: "u64", example: "7" }, { name: "color", type: "string", example: "purple" }], accounts: ["user", "favorites", "system_program"], line: "Saves your favorite number and color." },
    ],
  }),
}

const META: Record<string, MetaEntry> = {
  ...BASIC_META,
  "spl-memo": {
    devnetId: "MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr",
    level: "Beginner",
    minutes: 5,
    cost: 0.52,
    repo: SPL_REPO,
    path: "memo/program",
    first: "memo",
    about: "Checks that a piece of text is valid UTF-8 and writes it to the transaction log. One instruction and no accounts to set up, so it makes a good first program.",
    ixs: [{ name: "memo", args: [{ name: "text", type: "string", example: "gm from Playground" }], accounts: [], line: "Checks the text is valid UTF-8 and writes it to the log." }],
  },
  "spl-noop": {
    devnetId: "noopb9bkMVfRPU8AsbpTUg8AQkHtKwMYZiFUjNRtMmV",
    level: "Beginner",
    minutes: 3,
    cost: 0.14,
    repo: SPL_REPO,
    path: "noop/program",
    first: "noop",
    about: "Takes any instruction and does nothing with it. Programs use it to put data into the transaction log cheaply, and it is the smallest program you can deploy.",
    ixs: [{ name: "noop", args: [], accounts: [], line: "Does nothing and succeeds." }],
  },
  "spl-record": {
    devnetId: null,
    level: "Beginner",
    minutes: 10,
    cost: 0.61,
    repo: SPL_REPO,
    path: "record/program",
    first: "initialize",
    about: "Keeps a small piece of data in an account that only its authority can change. You make a record, write to it, and read it back.",
    ixs: [
      { name: "initialize", args: [], accounts: ["record", "authority"], line: "Makes a record account owned by your wallet." },
      { name: "write", args: [{ name: "offset", type: "u64", example: "0" }, { name: "data", type: "bytes", example: "hello" }], accounts: ["record", "authority"], line: "Writes bytes into the record at an offset." },
      { name: "set_authority", args: [], accounts: ["record", "authority", "new_authority"], line: "Hands the record to another wallet." },
      { name: "close_account", args: [], accounts: ["record", "authority", "receiver"], line: "Closes the record and returns its rent." },
    ],
  },
  "spl-binary-option": {
    devnetId: "betw959P4WToez4DkuXwNsJszqbpe3HuY56AcG5yevx",
    level: "Advanced",
    minutes: 25,
    cost: 1.08,
    repo: SPL_REPO,
    path: "binary-option/program",
    first: "initialize_binary_option",
    needs: "The first call needs a token mint for the escrow. In this prototype the Guide makes one for you.",
    about: "Two parties bet on an event: one takes the long side, the other the short side, and the winner collects both deposits once the outcome is settled.",
    ixs: [
      { name: "initialize_binary_option", args: [{ name: "decimals", type: "u8", example: "2" }], accounts: ["binary_option", "long_mint", "short_mint", "escrow_mint", "authority"], line: "Opens a new option with its long and short mints." },
      { name: "trade", args: [{ name: "size", type: "u64", example: "10" }, { name: "buy_price", type: "u64", example: "60" }, { name: "sell_price", type: "u64", example: "40" }], accounts: ["binary_option", "buyer", "seller", "escrow"], line: "Matches a buyer and a seller at a price." },
      { name: "settle", args: [], accounts: ["binary_option", "winning_mint", "authority"], line: "Names the side that won." },
      { name: "collect", args: [], accounts: ["binary_option", "collector", "escrow"], line: "Pays out a holder of the winning side." },
    ],
  },
  "spl-binary-oracle-pair": {
    devnetId: null,
    level: "Advanced",
    minutes: 25,
    cost: 0.97,
    repo: SPL_REPO,
    path: "binary-oracle-pair/program",
    first: "init_pool",
    needs: "The first call needs a deposit mint and two slot numbers. In this prototype the Guide fills them in.",
    about: "Every deposit mints one pass token and one fail token. After the decision window an oracle picks which of the two can be redeemed for the deposit.",
    ixs: [
      { name: "init_pool", args: [{ name: "mint_end_slot", type: "u64", example: "250000000" }, { name: "decide_end_slot", type: "u64", example: "250100000" }], accounts: ["pool", "authority", "deposit_mint", "pass_mint", "fail_mint"], line: "Opens a pool with its deposit and decision windows." },
      { name: "deposit", args: [{ name: "amount", type: "u64", example: "100" }], accounts: ["pool", "user", "deposit_account"], line: "Deposits and mints a pass and a fail token." },
      { name: "withdraw", args: [{ name: "amount", type: "u64", example: "100" }], accounts: ["pool", "user"], line: "Redeems winning tokens for the deposit." },
      { name: "decide", args: [{ name: "decision", type: "bool", example: "true" }], accounts: ["pool", "oracle"], line: "The oracle picks pass or fail." },
    ],
  },
  "spl-feature-proposal": {
    devnetId: "Feat1YXHhH6t1juaWF74WLcfv4XoNocjXA6sPWHNgAse",
    level: "Intermediate",
    minutes: 15,
    cost: 0.74,
    repo: SPL_REPO,
    path: "feature-proposal/program",
    first: "propose",
    about: "Proposes a new feature for the cluster and mints tokens to the people who can vote on it. Once enough tokens are sent back, the feature turns on.",
    ixs: [
      { name: "propose", args: [{ name: "tokens_to_mint", type: "u64", example: "1000" }, { name: "deadline", type: "i64", example: "1798761600" }], accounts: ["funder", "feature_proposal", "mint", "distributor", "acceptance"], line: "Opens a proposal and mints its voting tokens." },
      { name: "tally", args: [], accounts: ["feature_proposal", "acceptance", "feature"], line: "Counts the votes and turns the feature on if they pass." },
    ],
  },
  "spl-name-service": {
    devnetId: "namesLPneVptA9Z5rqUDD9tMTWEJwofgaYwp8cawRkX",
    level: "Intermediate",
    minutes: 15,
    cost: 0.83,
    repo: SPL_REPO,
    path: "name-service/program",
    first: "create",
    about: "Registers names (domains, handles, links) as accounts that one owner controls, and lets that owner update or hand them over.",
    ixs: [
      { name: "create", args: [{ name: "name", type: "string", example: "playground-demo" }, { name: "space", type: "u32", example: "64" }], accounts: ["name_account", "owner", "payer"], line: "Registers a name you own." },
      { name: "update", args: [{ name: "offset", type: "u32", example: "0" }, { name: "data", type: "bytes", example: "https://beta.solpg.io" }], accounts: ["name_account", "owner"], line: "Writes data under the name." },
      { name: "transfer", args: [{ name: "new_owner", type: "pubkey", example: "your wallet" }], accounts: ["name_account", "owner"], line: "Hands the name to another owner." },
      { name: "delete", args: [], accounts: ["name_account", "owner", "refund"], line: "Deletes the name and refunds its rent." },
    ],
  },
  "spl-shared-memory": {
    devnetId: null,
    level: "Intermediate",
    minutes: 10,
    cost: 0.21,
    repo: SPL_REPO,
    path: "shared-memory/program",
    first: "write",
    about: "A program called by another program writes its answer into a shared account, so the caller can read it back. A building block for cross-program calls.",
    ixs: [{ name: "write", args: [{ name: "offset", type: "u64", example: "0" }, { name: "data", type: "bytes", example: "hello" }], accounts: ["shared_account"], line: "Copies bytes into the shared account." }],
  },
  "spl-stateless-asks": {
    // The id in the source may not be the program's (11/07), so it counts as not on devnet
    devnetId: null,
    level: "Advanced",
    minutes: 25,
    cost: 0.68,
    repo: SPL_REPO,
    path: "stateless-asks/program",
    first: "accept_offer",
    needs: "The first call needs two token accounts with an approval between them. In this prototype the Guide prepares them.",
    about: "Swaps one token for another with no escrow account. The maker approves a program address to move their tokens, and a taker completes the swap in one call.",
    ixs: [
      { name: "accept_offer", args: [{ name: "maker_size", type: "u64", example: "1" }, { name: "taker_size", type: "u64", example: "10" }], accounts: ["maker", "taker", "maker_src", "maker_dst", "taker_src", "taker_dst", "authority"], line: "Completes a swap the maker approved." },
    ],
  },
}

const LEVEL_ORDER: Level[] = ["Beginner", "Intermediate", "Advanced"]

/** Easiest first, so the top of the list is where a beginner starts; the product's order within a level.
 * token-vesting and spl-stake-pool are out (11/07): the team dropped the first, the second is over the
 * project limits */
/** Each program's line rewritten to fill two lines of a card, no more and no less (Almaz, 25 Nov: every card
 * the same two lines). Near 50 to 75 characters; the ones not here already fit */
const LINES: Record<string, string> = {
  "transfer-sol": "Sends SOL from one account to another through the System Program.",
  "spl-noop": "Does nothing and returns. Callers use it to leave data in the log.",
  "spl-memo": "Checks that a text is valid UTF-8 and writes it to the transaction log.",
  "spl-record": "Stores data in an account that only its authority can write or close.",
  "spl-shared-memory": "Hands data back to a calling program by writing it into a shared account.",
  "spl-binary-option": "A bet on an event: two sides pay in tokens, and the winner takes them.",
  "spl-binary-oracle-pair": "Mints a pass and a fail token per deposit; an oracle picks which redeems.",
  "spl-stateless-asks": "Swaps one token for another in one call, with no escrow account.",
  "spl-feature-proposal": "Proposes a new cluster feature; it turns on once enough holders vote.",
  "spl-name-service": "Issues and manages names on Solana: domains, public keys, URLs and handles.",
}

/** The programs' names for people: the folders' names read as code (Almaz, 25 Nov) */
const TITLES: Record<string, string> = {
  "hello-solana": "Hello Solana",
  counter: "Counter",
  "create-account": "Create Account",
  "transfer-sol": "Transfer SOL",
  favorites: "Favorites",
  "spl-memo": "SPL Memo",
  "spl-noop": "SPL Noop",
  "spl-record": "SPL Record",
  "spl-shared-memory": "SPL Shared Memory",
  "spl-binary-option": "SPL Binary Option",
  "spl-binary-oracle-pair": "SPL Binary Oracle Pair",
  "spl-stateless-asks": "SPL Stateless Asks",
  "spl-feature-proposal": "SPL Feature Proposal",
  "spl-name-service": "SPL Name Service",
}

export const CATALOG: ProgramMeta[] = [...BASIC_PROGRAMS, ...PROGRAMS]
  .filter((p) => p.name in META)
  .map((p) => ({ ...p, description: LINES[p.name] ?? p.description, slug: p.name, title: TITLES[p.name] ?? p.name, topic: TOPIC[p.name], kind: p.framework === "Anchor" ? ("anchor" as const) : ("native" as const), ...META[p.name] }))
  .sort((a, b) => LEVEL_ORDER.indexOf(a.level) - LEVEL_ORDER.indexOf(b.level))

/** The catalog a search leaves: name, line, framework and topic */
export function searchCatalog(query: string) {
  const q = query.trim().toLowerCase()
  if (!q) return CATALOG
  return CATALOG.filter((p) => [p.name, p.title, p.description, p.framework, p.topic].some((f) => f.toLowerCase().includes(q)))
}

export const programBySlug = (slug: string) => CATALOG.find((p) => p.slug === slug)

// A function, not a const: the basics' READMEs call it while the module is still loading
export function ixSignature(ix: Ix) {
  return `${ix.name}(${ix.args.map((a) => `${a.name}: ${a.type}`).join(", ")})`
}

// ----- Files ---------------------------------------------------------------------------------------

const pascal = (s: string) => s.replace(/(^|_)(\w)/g, (_, __, c: string) => c.toUpperCase())
const crate = (slug: string) => slug.replace(/-/g, "_")

const rustType = (t: string) => (t === "string" ? "String" : t === "bytes" ? "Vec<u8>" : t === "pubkey" ? "Pubkey" : t)

function memoProcessor() {
  return `//! Program state processor

use {
    solana_program::{
        account_info::AccountInfo, entrypoint::ProgramResult, msg,
        program_error::ProgramError, pubkey::Pubkey,
    },
    std::str::from_utf8,
};

/// Instruction processor
pub fn process_instruction(
    _program_id: &Pubkey,
    accounts: &[AccountInfo],
    input: &[u8],
) -> ProgramResult {
    let account_info_iter = &mut accounts.iter();
    let mut missing_required_signature = false;
    for account_info in account_info_iter {
        if let Some(address) = account_info.signer_key() {
            msg!("Signed by {:?}", address);
        } else {
            missing_required_signature = true;
        }
    }
    if missing_required_signature {
        return Err(ProgramError::MissingRequiredSignature);
    }

    let memo = from_utf8(input).map_err(|err| {
        msg!("Invalid UTF-8, from byte {}", err.valid_up_to());
        ProgramError::InvalidInstructionData
    })?;
    msg!("Memo (len {}): {:?}", memo.len(), memo);

    Ok(())
}
`
}

/** noop as Solana has it: one function that takes any input and returns */
const noopProcessor = () => `//! Program state processor

use solana_program::{account_info::AccountInfo, entrypoint::ProgramResult, pubkey::Pubkey};

/// Instruction processor: takes any input and does nothing with it
pub fn process_instruction(
    _program_id: &Pubkey,
    _accounts: &[AccountInfo],
    _input: &[u8],
) -> ProgramResult {
    Ok(())
}
`

/** hello-solana as the examples repo has it: log a line, return */
const helloProcessor = () => `//! Program state processor

use solana_program::{account_info::AccountInfo, entrypoint::ProgramResult, msg, pubkey::Pubkey};

/// Instruction processor: says hello and returns
pub fn process_instruction(
    program_id: &Pubkey,
    _accounts: &[AccountInfo],
    _input: &[u8],
) -> ProgramResult {
    msg!("Hello, Solana!");
    msg!("Our program's Program ID: {}", program_id);
    Ok(())
}
`

/** The programs whose input is raw bytes, with no list of instructions to unpack */
export const RAW = ["spl-memo", "spl-noop", "hello-solana"]

function processor(p: ProgramMeta) {
  if (p.slug === "spl-memo") return memoProcessor()
  if (p.slug === "spl-noop") return noopProcessor()
  if (p.slug === "hello-solana") return helloProcessor()
  const arms = p.ixs
    .map((ix) => {
      const fields = ix.args.map((a) => a.name).join(", ")
      const pat = ix.args.length ? `Instruction::${pascal(ix.name)} { ${fields} }` : `Instruction::${pascal(ix.name)}`
      const call = `process_${ix.name}(program_id, accounts${ix.args.length ? `, ${fields}` : ""})`
      return `        ${pat} => {\n            msg!("Instruction: ${pascal(ix.name)}");\n            ${call}\n        }`
    })
    .join("\n")
  const fns = p.ixs
    .map(
      (ix) => `fn process_${ix.name}(
    program_id: &Pubkey,
    accounts: &[AccountInfo],${ix.args.map((a) => `\n    ${a.name}: ${rustType(a.type)},`).join("")}
) -> ProgramResult {
    let account_info_iter = &mut accounts.iter();${ix.accounts.map((a) => `\n    let ${a}_info = next_account_info(account_info_iter)?;`).join("")}
    // ${ix.line}
    Ok(())
}`
    )
    .join("\n\n")
  return `//! Program state processor

use {
    crate::instruction::Instruction,
    solana_program::{
        account_info::{next_account_info, AccountInfo},
        entrypoint::ProgramResult,
        msg,
        pubkey::Pubkey,
    },
};

/// Instruction processor
pub fn process_instruction(
    program_id: &Pubkey,
    accounts: &[AccountInfo],
    input: &[u8],
) -> ProgramResult {
    let instruction = Instruction::unpack(input)?;
    match instruction {
${arms}
    }
}

${fns}
`
}

function instruction(p: ProgramMeta) {
  const variants = p.ixs
    .map((ix) => `    /// ${ix.line}\n    ${pascal(ix.name)}${ix.args.length ? ` {\n${ix.args.map((a) => `        ${a.name}: ${rustType(a.type)},`).join("\n")}\n    }` : ""},`)
    .join("\n")
  return `//! Instruction types

use {
    borsh::{BorshDeserialize, BorshSerialize},
    solana_program::{program_error::ProgramError, pubkey::Pubkey},
};

/// Instructions supported by the program
#[derive(Clone, Debug, PartialEq, BorshSerialize, BorshDeserialize)]
pub enum Instruction {
${variants}
}

impl Instruction {
    /// Unpacks a byte buffer into an Instruction
    pub fn unpack(input: &[u8]) -> Result<Self, ProgramError> {
        Self::try_from_slice(input).map_err(|_| ProgramError::InvalidInstructionData)
    }
}
`
}

function lib(p: ProgramMeta) {
  const mods = RAW.includes(p.slug) ? ["entrypoint", "processor"] : ["entrypoint", "instruction", "processor"]
  return `//! ${p.description}

#![deny(missing_docs)]

${mods.map((m) => `pub mod ${m};`).join("\n")}

// Export current sdk types for downstream users
pub use solana_program;

solana_program::declare_id!("11111111111111111111111111111111");
`
}

const entrypoint = () => `//! Program entrypoint

#![cfg(not(feature = "no-entrypoint"))]

use solana_program::{account_info::AccountInfo, entrypoint::ProgramResult, pubkey::Pubkey};

solana_program::entrypoint!(process_instruction);
fn process_instruction(
    program_id: &Pubkey,
    accounts: &[AccountInfo],
    instruction_data: &[u8],
) -> ProgramResult {
    crate::processor::process_instruction(program_id, accounts, instruction_data)
}
`

const cargo = (p: ProgramMeta) => `[package]
name = "${crate(p.slug)}"
version = "1.0.0"
description = "${p.description.replace(/"/g, "'")}"
edition = "2021"

[features]
no-entrypoint = []

[dependencies]
borsh = "1.5.1"
solana-program = "2.0.3"

[lib]
crate-type = ["cdylib", "lib"]
`

export function readme(p: ProgramMeta) {
  return `# ${p.name}

${p.about}

## Instructions

${p.ixs.map((ix) => `- \`${ixSignature(ix)}\`: ${ix.line}`).join("\n")}

## Build

\`\`\`
cargo build-sbf
\`\`\`

Source: github.com/${p.repo}/tree/master/${p.path}
`
}

/** The files the import brings, in the order the tree lists them */
export function filesOf(p: ProgramMeta): Record<string, string> {
  if (p.own) return p.own.files
  const files: Record<string, string> = {
    "src/entrypoint.rs": entrypoint(),
    ...(RAW.includes(p.slug) ? {} : { "src/instruction.rs": instruction(p) }),
    "src/lib.rs": lib(p),
    "src/processor.rs": processor(p),
    "Cargo.toml": cargo(p),
    "README.md": readme(p),
  }
  return files
}

/** The file a program opens on: where its instructions are handled */
export const MAIN_FILE = "src/processor.rs"

/** The file a catalog program opens on: its own main file, or the SPL layout's processor */
export const mainOf = (p: ProgramMeta) => p.own?.main ?? MAIN_FILE


// ----- Fake chain values -------------------------------------------------------------------------

const B58 = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz"

/** A base58 string that is always the same for the same seed */
export function fakeKey(seed: string, length = 44) {
  let h = 2166136261
  for (const c of seed) h = Math.imul(h ^ c.charCodeAt(0), 16777619)
  let out = ""
  for (let i = 0; i < length; i++) {
    h = Math.imul(h ^ (h >>> 13), 0x5bd1e995) ^ i
    out += B58[Math.abs(h) % 58]
  }
  return out
}

/** The Playground wallet, the one the account menu and the wallet chip show (7xKX…gAsU): the deploy log
 * signed with a key of its own, NntWXC…, and the two never matched (Nikita, 20 Nov) */
export const WALLET_KEY = "7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU"
export const shortKey = (k: string) => `${k.slice(0, 4)}…${k.slice(-4)}`
