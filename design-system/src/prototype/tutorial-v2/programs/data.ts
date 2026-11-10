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
}

/** Three groups of three or four: five finer topics left two of them with one program each */
export const TOPICS = ["Basics", "Tokens and trading", "Network services"] as const
export type Topic = (typeof TOPICS)[number]

const TOPIC: Record<string, Topic> = {
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

const META: Record<string, Omit<ProgramMeta, keyof Program | "slug" | "topic">> = {
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
export const CATALOG: ProgramMeta[] = PROGRAMS.filter((p) => p.name in META).map((p) => ({ ...p, slug: p.name, topic: TOPIC[p.name], ...META[p.name] })).sort(
  (a, b) => LEVEL_ORDER.indexOf(a.level) - LEVEL_ORDER.indexOf(b.level)
)

export const programBySlug = (slug: string) => CATALOG.find((p) => p.slug === slug)

export const ixSignature = (ix: Ix) => `${ix.name}(${ix.args.map((a) => `${a.name}: ${a.type}`).join(", ")})`

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

/** The two programs whose input is raw bytes, with no list of instructions to unpack */
const RAW = ["spl-memo", "spl-noop"]

function processor(p: ProgramMeta) {
  if (p.slug === "spl-memo") return memoProcessor()
  if (p.slug === "spl-noop") return noopProcessor()
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

export const WALLET_KEY = fakeKey("playground-wallet")
