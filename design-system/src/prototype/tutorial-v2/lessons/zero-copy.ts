import { lineOf } from "../check"
import type { State } from "../store"
import { LIB, shortKey } from "./common"
import type { Grow, Lesson, Memory, SpecialCheck, Step, Tx } from "./types"

// Zero Copy: the three memory limits a program meets as its accounts grow, and the way past them.
// Step 1, the stack (4 KB): Box the account. Step 2, creating an account (10 KB in one go) and the heap
// (32 KB): grow the map with realloc until Anchor's copy of it no longer fits. Step 3: read it in place
// with zero copy, and the same Grow goes through. After Jonas Hahn's Zero Copy tutorial and the
// anchor-zero-copy-example it is based on, told as one game world: a board, a map, then a map too big
// to copy. Every call goes from the chat, as the Call panel would send it: no client.ts

const PROGRAM_ID = "DPKyo5FHqssmPuuZjDssKysTV3KmRmssoVmKbDmMMMR9"
const IDL_ACCOUNT = "oobfHDoKfmX517qf1qjhqbdHm3bum9FdmfoBo1PusVsK"
export const MAP_PDA = "Mq3sMV15mRYJ9dPbV33aMwXDVM97P9uoFVDu3s3omMq3"
export const BIG_MAP_PDA = "jZ13KwhX5h1MXTq9w3o3fKPq5hB1mriMZKDRsLCs7uy9"
const INIT_SIGNATURE = "XT3XKPZFdPXuXF5Zu1hFSAqRDo1jmZ7PP3MfRqFXLosyjD9kPusVjRVqZPu15KJpqfoKjFX1sFu9qCdud5HHYAaE"
const PAINT_SIGNATURE = "FHh3uKbVfX7qZo91ukeK7Xo2wXubhsPMmb15qPMbfFWfPwuq7oRuhbhRVb9qXHMsVdXysuBjMfV9TwyFZ7u9THTh"

export const KB = 1024
/** What `init` can create in one instruction, and what realloc adds at most each time */
export const STEP_BYTES = 10 * KB
/** The big map's size: 40 KB, its tiles plus the 8 byte discriminator */
export const BIG = 40 * KB
/** The heap a program gets */
export const HEAP = 32 * KB
/** Where the client paints, past the 32 KB a copy could ever hold */
export const PAINT_AT = 35000

// The program, piece by piece, in the order it sits in lib.rs

const BOIL = `use anchor_lang::prelude::*;

declare_id!("11111111111111111111111111111111");`

const INIT_BOARD_FN = `    pub fn init_board(_ctx: Context<InitBoard>) -> Result<()> {
        Ok(())
    }`

const INIT_MAP_FN = `    pub fn init_map(_ctx: Context<InitMap>) -> Result<()> {
        Ok(())
    }`

const GROW_FN = `    pub fn grow(ctx: Context<Grow>, len: u32) -> Result<()> {
        let map = &mut ctx.accounts.map;
        map.tiles.resize(len as usize - 12, 0);
        msg!("The map is {} bytes", len);
        Ok(())
    }`

const BIG_FNS = `    pub fn init_big_map(_ctx: Context<InitBigMap>) -> Result<()> {
        Ok(())
    }

    pub fn grow_big(_ctx: Context<GrowBig>, len: u32) -> Result<()> {
        msg!("The big map is {} bytes", len);
        Ok(())
    }

    pub fn paint(ctx: Context<Paint>, text: String, at: u32) -> Result<()> {
        let mut map = ctx.accounts.big_map.load_mut()?;
        let at = at as usize;
        map.tiles[at..at + text.len()].copy_from_slice(text.as_bytes());
        msg!("Painted {} bytes at {}", text.len(), at);
        Ok(())
    }`

const UNBOXED = `    pub board: Account<'info, Board>,`
const BOXED = `    pub board: Box<Account<'info, Board>>,`

const initBoard = (boxed: boolean) => `#[derive(Accounts)]
pub struct InitBoard<'info> {
    #[account(
        init,
        payer = signer,
        space = 8 + 12 * (1 + 128),
        seeds = [b"board", signer.key().as_ref()],
        bump,
    )]
${boxed ? BOXED : UNBOXED}
    #[account(mut)]
    pub signer: Signer<'info>,
    pub system_program: Program<'info, System>,
}`

const BOARD = `#[account]
pub struct Board {
    pub cells: [Option<Cell>; 12],
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy)]
pub struct Cell {
    pub owner: Pubkey,
    pub unit: Pubkey,
    pub item: Pubkey,
    pub ally: Pubkey,
}`

const INIT_MAP = `#[derive(Accounts)]
pub struct InitMap<'info> {
    #[account(
        init,
        payer = signer,
        space = 10 * 1024,
        seeds = [b"map", signer.key().as_ref()],
        bump,
    )]
    pub map: Account<'info, Map>,
    #[account(mut)]
    pub signer: Signer<'info>,
    pub system_program: Program<'info, System>,
}`

const GROW = `#[derive(Accounts)]
#[instruction(len: u32)]
pub struct Grow<'info> {
    #[account(
        mut,
        realloc = len as usize,
        realloc::payer = signer,
        realloc::zero = true,
    )]
    pub map: Account<'info, Map>,
    #[account(mut)]
    pub signer: Signer<'info>,
    pub system_program: Program<'info, System>,
}`

const MAP = `#[account]
pub struct Map {
    pub tiles: Vec<u8>,
}`

const BIG_ACCOUNTS = `#[derive(Accounts)]
pub struct InitBigMap<'info> {
    #[account(
        init,
        payer = signer,
        space = 10 * 1024,
        seeds = [b"big_map", signer.key().as_ref()],
        bump,
    )]
    pub big_map: AccountLoader<'info, BigMap>,
    #[account(mut)]
    pub signer: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(len: u32)]
pub struct GrowBig<'info> {
    #[account(
        mut,
        realloc = len as usize,
        realloc::payer = signer,
        realloc::zero = true,
    )]
    pub big_map: AccountLoader<'info, BigMap>,
    #[account(mut)]
    pub signer: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct Paint<'info> {
    #[account(mut)]
    pub big_map: AccountLoader<'info, BigMap>,
    pub signer: Signer<'info>,
}`

const BIG_MAP = `#[account(zero_copy)]
pub struct BigMap {
    pub tiles: [u8; 40952],
}`

type Parts = { board?: boolean; init?: "unboxed" | "boxed"; fnBoard?: boolean; map?: boolean; initMap?: boolean; fnMap?: boolean; grow?: boolean; fnGrow?: boolean; big?: boolean; bigAccounts?: boolean; fnBig?: boolean }

/** lib.rs with the pieces written so far, each in its place. Every write is placed by the file as it
 * stands right after it, so the pieces still to come never pull their lines in: the program repeats
 * `}`, `bump,`, `pub signer` and the rest in every accounts struct */
function lib(p: Parts) {
  const fns = [p.fnBoard && INIT_BOARD_FN, p.fnMap && INIT_MAP_FN, p.fnGrow && GROW_FN, p.fnBig && BIG_FNS].filter(Boolean)
  const module = fns.length ? `#[program]\nmod zero_copy {\n    use super::*;\n\n${fns.join("\n\n")}\n}` : null
  return [
    BOIL,
    module,
    p.init && initBoard(p.init === "boxed"),
    p.board && BOARD,
    p.initMap && INIT_MAP,
    p.grow && GROW,
    p.map && MAP,
    p.bigAccounts && BIG_ACCOUNTS,
    p.big && BIG_MAP,
  ]
    .filter(Boolean)
    .join("\n\n")
}

const S1 = { board: true, init: "boxed", fnBoard: true } as const
const S2 = { ...S1, map: true, initMap: true, fnMap: true, grow: true, fnGrow: true }
const S3 = { ...S2, big: true, bigAccounts: true, fnBig: true }
const LIB_BROKEN = lib({ ...S1, init: "unboxed" })
const LIB_S1 = lib(S1)
const LIB_S2 = lib(S2)
const LIB_S3 = lib(S3)

/** The line of the board account in the first build, which the planned failure points at */
const BOARD_LINE = LIB_BROKEN.split("\n").findIndex((l) => l === UNBOXED) + 1

const EXPLAIN_ERROR = `A program gets 4 KB of stack. While it checks the accounts, Anchor reads \`board\` into a local on the stack: about 1.5 KB, plus what \`init\` needs around it. Line ${BOARD_LINE} together goes 304 bytes past the limit.`

const UPGRADES = `Upgrades ${shortKey(PROGRAM_ID).replace("…", "…⁠")} in place · from your wallet`

const STEPS: Step[] = [
  {
    id: "stack",
    title: "Stack",
    short: "Stack",
    objective: "Fit a big account into 4 KB of stack",
    learned: "The stack limit, and Box to move an account to the heap",
    file: LIB,
    start: "",
    target: LIB_S1,
    goal: "build",
    beats: [
      {
        kind: "write",
        id: "s1.boil",
        text: "Same opening as every Anchor program: the import and the program's id.",
        writes: { file: LIB, block: BOIL, ref: lib({}) },
      },
      {
        kind: "write",
        id: "s1.board",
        text: "A game board: 12 cells, each four keys of 32 bytes, so 128 bytes a cell, or empty. A program has 4 KB of stack and 32 KB of heap to work in, and this board is the first thing to test them.",
        writes: { file: LIB, block: BOARD, ref: lib({ board: true }) },
      },
      {
        kind: "say",
        id: "s1.size",
        text: "`InitBoard` creates the board's account, and `space` says how many bytes it gets. Rent is paid on every one of them, so it should be what the board needs.",
      },
      {
        kind: "ask",
        id: "s1.q1",
        kicker: "Question",
        n: 1,
        question: "How much space does the board's account need?",
        options: ["space = 12 * 128,", "space = 8 + 12 * (1 + 128),", "space = 10 * 1024,"],
        code: true,
        answer: 1,
        right: "Yes. 8 bytes of discriminator first, then each cell: 1 byte that says whether it's there, and its 128. That's 1,556 bytes. I've written `InitBoard` around it.",
        why: [
          "Close. Each cell is an `Option`: one more byte says whether it's there. And Anchor puts an 8 byte discriminator in front of every account.",
          null,
          "That's the most `init` can create, not what the board needs. Rent is paid on every byte.",
        ],
        hint: "Count what Anchor adds in front of the account, and what an `Option` adds to each cell.",
        writes: { file: LIB, block: initBoard(false), ref: lib({ board: true, init: "unboxed" }) },
        key: "space = 8 + 12 * (1 + 128),",
        typed: "That's the size: 8 bytes of discriminator, then 1 + 128 a cell. I've written `InitBoard` around it.",
      },
      {
        kind: "write",
        id: "s1.init",
        text: "And `init_board`. It does nothing itself: the accounts struct creates the board.",
        writes: { file: LIB, block: `#[program]\nmod zero_copy {\n    use super::*;\n\n${INIT_BOARD_FN}\n}`, ref: LIB_BROKEN },
      },
      {
        kind: "act",
        id: "s1.build",
        act: "build",
        say: "1.5 KB in 4 KB of stack. Let's build it.",
        title: "Build lib.rs",
        context: "Compiles lib.rs on Playground's build server",
        button: "Build",
      },
    ],
    planned: "This one's on purpose. Every program with a big account meets the stack limit, so let's meet it now.",
    plannedShort: `Line ${BOARD_LINE} reads \`board\` onto the stack, and with what \`init\` needs it goes past 4 KB.`,
    onFail: [
      { kind: "say", id: "f1.explain", text: EXPLAIN_ERROR, quote: { file: LIB, line: BOARD_LINE, mark: "Account<'info, Board>", tone: "error" } },
      {
        kind: "ask",
        id: "f1.q",
        kicker: "Fix it",
        question: "So where should `board` go?",
        options: ["Nowhere: take it as `UncheckedAccount`", "Fewer cells, so it fits", "On the heap: `Box<Account<'info, Board>>`"],
        code: false,
        answer: 2,
        right: "Exactly. `Box` puts the account on the heap, and the stack keeps only a pointer to it. I've changed line " + BOARD_LINE + ".",
        why: [
          "That skips Anchor's checks of the account, and `init` needs a real account type to create it.",
          "That changes the game to fit the limit. The board can stay as it is if it isn't on the stack.",
          null,
        ],
        hint: "A program has two places to keep things in memory. The board is in the small one.",
        writes: { file: LIB, block: BOXED, ref: LIB_S1, start: LIB_BROKEN },
        key: "pub board: Box<Account<'info, Board>>,",
        typed: "That's it. `Box` puts the board on the heap, and the stack only keeps a pointer.",
      },
      {
        kind: "act",
        id: "f1.build",
        act: "build",
        say: "Build again. The stack only holds a pointer now.",
        title: "Build lib.rs",
        context: "Same build, with `board` boxed",
        button: "Build",
      },
    ],
    win: {
      id: "s1.win",
      headline: "The board fits.",
      line: "On the stack it's a 16 byte pointer now; the board itself is on the heap, which has 32 KB.",
      stats: [],
    },
    explainStep:
      "This step sizes a board account and meets the first memory limit: 4 KB of stack. Box moves the account to the heap, so the stack only holds a pointer.",
    chips: [
      {
        label: "Why is the stack so small?",
        match: /\bstack\b/i,
        answer:
          "Every instruction runs in a small, fixed frame so validators can run thousands of them side by side. 4 KB of stack and 32 KB of heap is what each one gets.",
      },
      {
        label: "What is the discriminator?",
        match: /\bdiscriminator\b/i,
        answer: "8 bytes Anchor writes at the start of every account: a hash of its type's name. It's how Anchor knows a `Board` account is a `Board` before reading it.",
      },
    ],
    errorChips: [
      {
        label: "What does Box do?",
        match: /\bbox\b/i,
        answer: "`Box<T>` puts the value on the heap and keeps a pointer to it, 16 bytes here, where the value would have been. Anchor reads the account the same way; only where it lands changes.",
      },
      {
        label: "Where is this in the docs?",
        match: /\b(docs?|documentation)\b/i,
        answer: "The Solana docs list the limits under [Programs, Limitations](https://solana.com/docs/programs/limitations): 4 KB of stack per frame, 32 KB of heap.",
      },
    ],
    answers: [{ match: /why.*(fail|error)/i, answer: EXPLAIN_ERROR, local: true }],
  },
  {
    id: "grow",
    title: "Grow past the heap",
    short: "Grow",
    objective: "Create a map as big as init allows, then grow it until the heap can't hold a copy",
    learned: "The 10 KB limit on creating an account, realloc, and the 32 KB heap",
    file: LIB,
    start: LIB_S1,
    target: LIB_S2,
    goal: "grow",
    beats: [
      {
        kind: "say",
        id: "s2.why",
        text: "The board has done its job: it met the stack. Next, a map of the game world, one byte a tile, that grows as the world does. `init` creates an account by calling the System Program, and that kind of call has a limit of its own.",
      },
      {
        kind: "ask",
        id: "s2.q2",
        kicker: "Question",
        n: 2,
        question: "What's the biggest map `init` can create?",
        options: ["space = 40 * 1024,", "space = 10 * 1024,", "space = 10 * 1024 * 1024,"],
        code: true,
        answer: 1,
        right: "Yes, 10 KB. A call from one program into another can't create more than that. I've written `InitMap` with it.",
        why: [
          "40 KB is fine for an account, just not in one go: `init` goes through a call into the System Program, and those stop at 10 KB.",
          null,
          "10 MB is the most an account can ever hold. It gets there 10 KB at a time.",
        ],
        hint: "`init` doesn't create the account itself: it asks the System Program to, from inside your program.",
        writes: { file: LIB, block: INIT_MAP, ref: lib({ ...S1, initMap: true }) },
        key: "space = 10 * 1024,",
        typed: "That's the limit, 10 KB. I've written `InitMap` with it.",
      },
      {
        kind: "write",
        id: "s2.map",
        text: "The map keeps its tiles in a `Vec`, and Anchor reads it the way it reads every account so far: it copies the whole account in. 10 KB is only the start, though: an account can grow after it's made, up to 10 KB more each instruction.",
        writes: { file: LIB, block: MAP, ref: lib({ ...S1, initMap: true, map: true }) },
      },
      {
        kind: "ask",
        id: "s2.q3",
        kicker: "Question",
        n: 3,
        question: "Which constraint grows `map` to `len` bytes?",
        options: ["space = len as usize,", "realloc = len as usize,", "init_if_needed,"],
        code: true,
        answer: 1,
        right: "Right. `realloc` resizes an account that's already there; `realloc::payer` pays the rent for the new bytes and `realloc::zero` clears them. I've written `Grow` around it.",
        why: [
          "`space` only counts when the account is created. The map will already exist.",
          null,
          "That creates the account if it's missing. The map will be there; it needs more room.",
        ],
        hint: "By the time it grows, the map exists. Which constraint changes the size of one that does?",
        writes: { file: LIB, block: GROW, ref: lib({ ...S1, initMap: true, grow: true, map: true }) },
        key: "realloc = len as usize,",
        typed: "That's the one. I've written the rest of `Grow` around it: who pays, and that new bytes start at zero.",
      },
      {
        kind: "write",
        id: "s2.fns",
        text: "And the two instructions. `init_map` does nothing itself: `InitMap` creates the map. `grow` fills the `Vec` out to the new size, so the map uses every byte it has. To do that, Anchor first copies the whole map into the heap.",
        writes: { file: LIB, block: `${INIT_MAP_FN}\n\n${GROW_FN}`, ref: LIB_S2 },
      },
      {
        kind: "act",
        id: "s2.deploy",
        act: "deploy",
        say: "Deploy, and you can make the map.",
        title: "Deploy to devnet",
        context: "From your Playground wallet · free devnet SOL",
        button: "Deploy",
      },
      {
        kind: "act",
        id: "s2.create",
        act: "send",
        ix: "init_map",
        say: "Create your map, at the most one instruction can make.",
        title: "Create your map",
        context: "Sends `init_map` · about 0.072 SOL of rent",
        button: "Create",
        record: "Created your map · 10 KB",
      },
      {
        kind: "act",
        id: "s2.grow",
        act: "grow",
        ix: "grow",
        say: "Now grow it, 10 KB a press, toward 40 KB. Watch the heap.",
        title: "Grow the map",
        context: "Sends `grow` with 10 KB more · about 0.071 SOL more rent",
        button: "Grow +10 KB",
      },
    ],
    win: {
      id: "s2.win",
      headline: "Out of memory at 40 KB.",
      line: "The account could grow. The program couldn't read it: `Account` copies the whole map into the heap, and a 40 KB copy doesn't fit in 32.",
      stats: [],
    },
    testWin: "You grew the map from the Call panel until the heap ran out.",
    explainStep:
      "This step creates a map as big as `init` allows, 10 KB, then grows it with `realloc`, 10 KB at a time, until reading it no longer fits in the 32 KB heap.",
    chips: [
      {
        label: "Why only 10 KB at a time?",
        match: /10 ?kb|at a time/i,
        answer: "`init` creates through a call into the System Program, and such a call can't make more than 10 KB. After that, an instruction may add at most 10 KB to an account's size: three of them take a 10 KB account to 40 KB.",
      },
      {
        label: "Where did the heap go?",
        match: /\bheap\b/i,
        answer: "`Account<Map>` copies the whole account into the heap before your code runs. At 30 KB the copy fits in the 32 KB heap; at 40 KB it doesn't, so the program runs out of memory before your first line.",
      },
      {
        label: "What does the rent cost?",
        match: /\b(rent|cost)\b/i,
        answer: "About 0.072 SOL for 10 KB, from your Playground wallet in devnet SOL, so nothing real is spent. Rent is a deposit: close the account and it comes back.",
      },
    ],
  },
  {
    id: "zero-copy",
    title: "Zero copy",
    short: "Zero copy",
    objective: "Grow a map past the heap and write into it, with no copy",
    learned: "Zero copy accounts with AccountLoader",
    file: LIB,
    start: LIB_S2,
    target: LIB_S3,
    goal: "send",
    beats: [
      {
        kind: "say",
        id: "s3.why",
        text: "Zero copy reads the account where it is: the program gets a view of its bytes, and nothing is copied into the heap. In return the struct has a fixed size and layout, so no `Vec`. That's a new kind of account, so a new map.",
      },
      {
        kind: "ask",
        id: "s3.q4",
        kicker: "Question",
        n: 4,
        question: "Which line lets the program read `BigMap` in place?",
        options: ["#[account(zero_copy)]", "#[derive(Clone, Copy)]", "Box<Account<'info, BigMap>>"],
        code: true,
        answer: 0,
        right: "Yes. `zero_copy` lays the struct out as plain bytes and reads it in place. 40,952 bytes of tiles, plus the 8 byte discriminator: 40 KB. I've written `BigMap`.",
        why: [
          null,
          "`Copy` makes copying cheap to write, not free: the account still comes in through Borsh, into the heap.",
          "`Box` moves the copy to the heap, and at 40 KB the heap is too small for it.",
        ],
        hint: "You don't want a smaller copy. You want no copy.",
        writes: { file: LIB, block: BIG_MAP, ref: lib({ ...S2, big: true }) },
        typed: "That's the attribute. I've written `BigMap` under it: 40 KB with its discriminator.",
      },
      {
        kind: "write",
        id: "s3.accounts",
        text: "A zero copy account comes in through `AccountLoader` instead of `Account`: the same three structs as the map's, to create, grow and write.",
        writes: { file: LIB, block: BIG_ACCOUNTS, ref: lib({ ...S2, big: true, bigAccounts: true }) },
      },
      {
        kind: "write",
        id: "s3.fns",
        text: "And the instructions. `paint` calls `load_mut` for a view of the bytes, and copies its text into one slice of them.",
        writes: { file: LIB, block: BIG_FNS, ref: LIB_S3 },
      },
      {
        kind: "act",
        id: "s3.ship",
        act: "buildDeploy",
        say: "Build and deploy the zero copy map.",
        title: "Build and deploy",
        context: UPGRADES,
        button: "Build and deploy",
      },
      {
        kind: "act",
        id: "s3.create",
        act: "send",
        ix: "init_big_map",
        say: "Create the big map. Like the first one, it starts at 10 KB.",
        title: "Create the big map",
        context: "Sends `init_big_map` · about 0.072 SOL of rent",
        button: "Create",
        record: "Created the big map · 10 KB",
      },
      {
        kind: "act",
        id: "s3.grow",
        act: "grow",
        ix: "grow_big",
        say: "Now the same press as before, on the big map. Watch the heap this time.",
        title: "Grow the big map",
        context: "Sends `grow_big` with 10 KB more · about 0.071 SOL more rent",
        button: "Grow +10 KB",
      },
      {
        kind: "act",
        id: "s3.paint",
        act: "send",
        ix: "paint",
        say: "40 KB, and the heap never held a byte of it. Now write into the map past the 32 KB mark, where no copy could ever reach.",
        title: "Paint at byte 35,000",
        context: "Sends `paint` with \"gm\" · `load_mut` writes in place",
        button: "Paint",
        record: "Painted \"gm\" at byte 35,000",
      },
    ],
    win: {
      id: "s3.win",
      headline: "40 KB, read in place.",
      line: "The map is bigger than the heap, and `paint` wrote into it without copying a byte of it. The same way goes up to 10 MB.",
      stats: [],
    },
    testWin: "You painted the big map from the Call panel, past the 32 KB a copy could hold.",
    explainStep: "This step makes a 40 KB map with zero copy: the program reads its bytes in place through `AccountLoader`, so growing it takes nothing from the heap, and `paint` writes past the 32 KB mark.",
    chips: [
      {
        label: "When should I use zero copy?",
        match: /when.*zero.?copy|zero.?copy.*when/i,
        answer: "Only for accounts too big to copy: past a few KB, or ones you read a slice of. For small accounts plain `Account` is simpler, and it handles `Vec`, `String` and enums.",
      },
      {
        label: "What does load_mut do?",
        match: /\bload(_mut)?\b/i,
        answer: "It borrows the account's data as `&mut BigMap`: a view of the bytes where they are. Writes go straight into the account, with nothing to copy back.",
      },
      {
        label: "Why not change the old map?",
        match: /\b(old|first|same) map\b|\bchange.*map\b/i,
        answer: "The old map's bytes are laid out for a `Vec`: a length, then the tiles. A zero copy struct reads them as a fixed array, so the same bytes would mean something else. A new account starts with the layout it's read with.",
      },
    ],
  },
]

// The planned failure: the board read onto the stack. A build log prints the linker's own words
const CHECKS: SpecialCheck[] = [
  ({ code, bare, file, head, failed }) => {
    if (!/pub\s+board\s*:\s*Account\s*</.test(bare)) return null
    const line = lineOf(code, "pub board")
    const row = bare.split("\n")[line - 1] ?? ""
    const column = row.indexOf("Account") + 1
    return {
      ok: false,
      planned: true,
      line,
      column,
      span: "Account<'info, Board>".length,
      log: [
        ...head,
        "Error: Function _ZN9zero_copy9InitBoard14try_accounts Stack offset of 4400 exceeded max offset of 4096 by 304 bytes, please minimize large stack variables",
        ` --> ${file}:${line}:${column}`,
        "Build failed",
      ],
      reason: `${failed}: \`board\` on line ${line} doesn't fit in 4 KB of stack.`,
      explain: EXPLAIN_ERROR,
    }
  },
]

// ---- The memory: what growing and painting do, worked out the way the runtime would

const kb = (bytes: number) => `${Math.round(bytes / KB)} KB`

function signatureOf(n: number) {
  const A = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz"
  let x = (n + 7) * 2246822519
  return Array.from({ length: 88 }, () => {
    x = (x ^ (x << 13)) >>> 0
    x = (x ^ (x >>> 17)) >>> 0
    x = (x ^ (x << 5)) >>> 0
    return A[x % 58]
  }).join("")
}

const SYSTEM_CPI = ["Program 11111111111111111111111111111111 invoke [2]", "Program 11111111111111111111111111111111 success"]

/** The bytes of tiles `BigMap` holds: 40 KB less the discriminator */
const TILES = BIG - 8
/** The longest text paint takes from the panel: enough for a word, short enough for one log line */
const TEXT_MAX = 32

/** A grow the runtime refuses: more than 10 KB added in one instruction */
const tooBig = (instruction: string, signature: string): Tx => ({
  instruction,
  said: "",
  signature,
  compute: 2410,
  error: {
    name: "InvalidRealloc",
    number: 0,
    message: "an account can grow by at most 10,240 bytes in one instruction",
    line: 0,
    log: ["Program log: Error: an account can grow by at most 10,240 bytes in one instruction"],
    failed: "Failed to reallocate account data",
  },
})

/** A panic in the program, as the runtime logs it */
const panicked = (instruction: string, signature: string, message: string, line: number): Tx => ({
  instruction,
  said: "",
  signature,
  compute: 3870,
  error: { name: "Panic", number: 0, message, line, log: [`Program log: panicked at src/lib.rs:${line}: ${message}`], failed: "SBF program panicked" },
})

/** One press of Grow. On the map, realloc resizes it and `Account<Map>` copies the whole map into the
 * heap for `grow` to resize: up to 30 KB the copy fits in the 32 KB heap, at 40 KB it doesn't, and a
 * failed grow rolls back, so the map keeps its size. On the zero copy map (`grow_big`) nothing is
 * copied: the heap stays empty however big it gets. The chat grows 10 KB a press; the Call panel takes
 * any `len`, and the runtime answers it as devnet would: more than 10 KB at once is refused */
function grow(s: State, ix = "grow", args?: Record<string, string>): { memory: Memory; row: Grow; tx: Tx } {
  const memory = s.memory ?? { map: STEP_BYTES, big: null }
  const n = s.thread.reduce((k, t) => k + (t.kind === "act" ? (t.grows?.length ?? 0) : 0), 0) + s.thread.filter((t) => t.kind === "result" && t.act === "test").length
  const signature = signatureOf(n)
  if (ix === "grow_big") {
    const from = memory.big ?? STEP_BYTES
    const len = args?.len !== undefined ? Number(args.len) : Math.min(BIG, from + STEP_BYTES)
    if (len > from + STEP_BYTES) {
      const tx = tooBig("grow_big", signature)
      return { memory, row: { ok: false, at: Date.now(), size: from, heap: 0, tx }, tx }
    }
    const tx: Tx = { instruction: "grow_big", said: `The big map is ${len} bytes`, signature, compute: 3140, inner: SYSTEM_CPI }
    return { memory: { ...memory, big: len }, row: { ok: true, at: Date.now(), size: len, heap: 0, tx }, tx }
  }
  const from = memory.map
  const len = args?.len !== undefined ? Number(args.len) : from + STEP_BYTES
  if (len > from + STEP_BYTES) {
    const tx = tooBig("grow", signature)
    return { memory, row: { ok: false, at: Date.now(), size: from, heap: from, tx }, tx }
  }
  // `grow` resizes the Vec to len less the discriminator and the Vec's own length: under 12 it underflows
  if (len < 12) {
    const tx = panicked("grow", signature, "attempt to subtract with overflow", lineOf(s.deployedLib ?? "", "tiles.resize"))
    return { memory, row: { ok: false, at: Date.now(), size: from, heap: from, tx }, tx }
  }
  const heap = len
  if (heap > HEAP) {
    const tx: Tx = {
      instruction: "grow",
      said: "",
      signature,
      compute: 18204,
      error: {
        name: "OutOfMemory",
        number: 0,
        message: "memory allocation failed, out of memory",
        line: lineOf(s.deployedLib ?? "", "tiles.resize"),
        log: ["Program log: Error: memory allocation failed, out of memory"],
        failed: "SBF program panicked",
      },
    }
    return { memory, row: { ok: false, at: Date.now(), size: from, heap, tx }, tx }
  }
  const tx: Tx = { instruction: "grow", said: `The map is ${len} bytes`, signature, compute: 9810 }
  return { memory: { ...memory, map: len }, row: { ok: true, at: Date.now(), size: len, heap, tx }, tx }
}

/** Step 2 passes when the heap runs out: a copy past 32 KB, not a grow refused for its size */
const growPasses = (_s: State, i: number, row: Grow) => i === 1 && !row.ok && row.heap > HEAP

/** Step 3's Grow is done at 40 KB, all `BigMap` holds: then the script goes on to Paint */
const grownEnough = (_s: State, row: Grow) => row.ok && row.heap === 0 && row.size >= BIG

/** A call from the chat or the Call panel, worked out the way the program would answer it. A call that
 * would fail on devnet before it does anything (a second init, painting a map that isn't 40 KB yet)
 * isn't sent: the note says why. One that the program itself fails on (painting past the map's end)
 * goes, and comes back failed. `out` is the account after it, for the chat's card */
function panel(s: State, ix: string, given?: Record<string, string>): { tx: Tx; memory: Memory; out?: string[] } | { note: string } {
  const memory = s.memory ?? { map: 0, big: null }
  const a = { ...args(s, ix), ...given }
  const n = s.thread.filter((t) => t.kind === "result" && (t.act === "test" || t.act === "send")).length + 40
  const tx = (instruction: string, said = "", inner?: string[]): Tx => ({ instruction, said, signature: signatureOf(n), compute: 5200, inner })
  if (ix === "init_board")
    return memory.board
      ? { note: "Your board already exists. `init` creates an account once, so a second call would fail." }
      : { tx: tx("init_board", "", SYSTEM_CPI), memory: { ...memory, board: true } }
  if (ix === "init_map")
    return memory.map > 0
      ? { note: "Your map already exists. `init` creates an account once, so a second call would fail." }
      : { tx: { ...tx("init_map", "", SYSTEM_CPI), signature: INIT_SIGNATURE, compute: 6120 }, memory: { ...memory, map: STEP_BYTES }, out: [`Map: ${STEP_BYTES} bytes`] }
  if (ix === "grow") {
    if (memory.map === 0) return { note: "Create the map first, with `init_map`." }
    const r = grow(s, "grow", a)
    return { tx: r.tx, memory: r.memory }
  }
  if (ix === "init_big_map")
    return memory.big !== null
      ? { note: "Your big map already exists. `init` creates an account once." }
      : { tx: tx("init_big_map", "", SYSTEM_CPI), memory: { ...memory, big: STEP_BYTES }, out: [`Big map: ${STEP_BYTES} bytes`] }
  if (ix === "grow_big") {
    if (memory.big === null) return { note: "Create the big map first, with `init_big_map`." }
    if (Number(a.len) > BIG) return { note: "`BigMap` holds 40 KB, 40,960 bytes. A bigger account would only add bytes it never reads." }
    const r = grow(s, "grow_big", a)
    return { tx: r.tx, memory: r.memory }
  }
  if (ix === "paint") {
    if (memory.big !== BIG) return { note: "`load_mut` needs the big map at its full 40 KB first: grow it with `grow_big`." }
    const text = a.text ?? ""
    const at = Number(a.at)
    const bytes = new TextEncoder().encode(text).length
    // The slice `tiles[at..at + len]` past the 40,952 tiles: Rust stops the program there
    if (at + bytes > TILES)
      return { tx: panicked("paint", signatureOf(n), `range end index ${at + bytes} out of range for slice of length ${TILES}`, lineOf(s.deployedLib ?? "", "copy_from_slice")), memory }
    return {
      tx: { ...tx("paint", `Painted ${bytes} bytes at ${at}`), signature: at === PAINT_AT && text === "gm" ? PAINT_SIGNATURE : signatureOf(n), compute: 2214 },
      memory: { ...memory, painted: at, text },
      out: [`Big map: ${BIG} bytes, painted at byte ${at}`],
    }
  }
  return { note: "Grow sends from its own form." }
}

/** What a call is given unless the panel says otherwise: the next 10 KB, "gm" at byte 35,000 */
function args(s: State, ix: string): Record<string, string> {
  const memory = s.memory ?? { map: STEP_BYTES, big: null }
  if (ix === "grow") return { len: String(memory.map + STEP_BYTES) }
  if (ix === "grow_big") return { len: String(Math.min(BIG, (memory.big ?? 0) + STEP_BYTES)) }
  if (ix === "paint") return { text: "gm", at: String(PAINT_AT) }
  return {}
}

/** Whether the panel can send what was typed: a u32 is a whole number, the text fits one log line */
function check(given: Record<string, string>): string | null {
  for (const [name, v] of Object.entries(given)) {
    if (name === "text") {
      if (new TextEncoder().encode(v).length > TEXT_MAX) return `\`text\` takes at most ${TEXT_MAX} bytes here.`
    } else if (!/^\d+$/.test(v.trim()) || Number(v) > 4294967295) return `\`${name}\` is a \`u32\`: a whole number from 0.`
  }
  return null
}

export const ZERO_COPY: Lesson = {
  card: { slug: "zero-copy", name: "Zero Copy", level: "Advanced", framework: "Anchor", ext: "jpg" },
  minutes: 12,
  by: "Jonas Hahn",
  program: "zero_copy",
  line: "Make accounts bigger than a program's memory",
  intro: "You'll grow a game's accounts past every memory limit a program has: 4 KB of stack, 10 KB to create an account, 32 KB of heap. Then you'll grow a map past the heap without copying it.",
  proof: `Program log: Painted 2 bytes at ${PAINT_AT}`,
  badge: "Big accounts",
  headline: "You read 40 KB without copying it.",
  // Where the last paint landed: step 3's, or one the learner sent from the Call panel
  proofLine: (_tx, s) => `Your big map is ${kb(BIG)} on devnet, more than the heap holds, and \`paint\` wrote into it at byte ${(s.memory?.painted ?? PAINT_AT).toLocaleString("en-US")}.`,
  // The only Advanced tutorial: there is no next one of its level
  nextLine: "Zero Copy is the last Advanced tutorial in Playground. Try the Call panel: paint somewhere else in the big map, or read it back in the IDL's shape.",
  steps: STEPS,
  // No client.ts: every call goes from the chat, or the Call panel
  files: { [LIB]: "" },
  preview: LIB_S3,
  programId: PROGRAM_ID,
  idlAccount: IDL_ACCOUNT,
  txSignature: INIT_SIGNATURE,
  checks: CHECKS,
  story: false,
  runTx: () => ({ instruction: "init_map", said: "", signature: INIT_SIGNATURE, compute: 6120 }),
  memory: { grow, growPasses, grownEnough, panel, args, check, panelPasses: (i, ix) => i === 2 && ix === "paint", pda: MAP_PDA, bigPda: BIG_MAP_PDA },
}
