import type { State } from "../store"
import { LIB, WALLET, shortKey } from "./common"
import { SYSTEM_CPI, anchorError, bytes, inUse, isU64, noSystemProgram, sentSoFar, signatureOf } from "./records"
import { METADATA_PROGRAM, MINT_RENT, TOKEN_ACCOUNT_RENT, insufficientFunds, tokenCpi, whole } from "./tokens"
import type { Lesson, Rec, RecSend, SpecialCheck, Step, Tx } from "./types"

// SPL Token Vault: a token of the learner's own, made from the chat, then a program that keeps it in a
// vault: a token account at a PDA from "vault", the mint and the owner's key, its own authority. A
// deposit is a transfer the owner's signature authorizes; a withdraw is signed by the program with the
// vault's seeds, and a stranger's key leads to another address. After Jonas Hahn's SPL Token Vault.
// The token card with two rows, your account and your vault

const PROGRAM_ID = "zbMYa8dwVTwq7PBmKM9FhMdKdo5jB3ZHbyMbZjrQgQF2"
const IDL_ACCOUNT = "Bk7nCrffbBwMqb7jmDRqbH5jwfRhXF7TwDZB5fe2HxVd"
/** The token's mint, made from the learner's wallet */
const GOLD = "4rBoePMR3H7bKX5hsK5KMTXuRo7q9ssDRF9mMFbaaNNW"
/** The learner's own GOLD account, at the associated address */
const OWNER_TOKENS = "9zratrjoD1jfjBdwwofVRbV1wP17F5yTRjoPwoDfxkjJ"
/** The vault: the PDA from "vault", the mint and the learner's wallet */
const VAULT = "ZFkySzbZfHmDsVHH1mdPsMm5fwwKFuuV9yo9qwd49DkM"
/** The key "Withdraw as a stranger" signs with, and where its seeds lead */
const STRANGER = "L5z43pRuwjDoVXB59q9FXu9dDTXKhf3ob3H1PjnswmhD"
const STRANGER_VAULT = "7Ugm2CXj9qR779RVqZhhBb1Ks7RjFwjR7djoHhkQ3xP1"
const CREATE_SIGNATURE = signatureOf(501)

/** The original's metadata, the pirate coin */
const GOLD_URI = "https://shdw-drive.genesysgo.net/AzjHvXgqUJortnr5fXDG2aPkp2PfFMvu4Egr57fdiite/PirateCoinMeta"
const DECIMALS = 9
const ONE = 10 ** DECIMALS
const METADATA_RENT = 0.0056

// The program, piece by piece, in the order it sits in lib.rs

const IMPORTS = ["", "use anchor_spl::token_interface::{Mint, TokenAccount, TokenInterface};", "use anchor_spl::token_interface::{self, Mint, TokenAccount, TokenInterface, TransferChecked};"]

const boil = (imports: number) => `use anchor_lang::prelude::*;
${IMPORTS[imports]}

declare_id!("11111111111111111111111111111111");`

const OPEN_FN = `    pub fn open_vault(_ctx: Context<OpenVault>) -> Result<()> {
        Ok(())
    }`

const AUTHORITY_LINE = "            authority: ctx.accounts.owner.to_account_info(),"

const DEPOSIT_FN = `    pub fn deposit(ctx: Context<VaultTransfer>, amount: u64) -> Result<()> {
        let accounts = TransferChecked {
            from: ctx.accounts.owner_tokens.to_account_info(),
            mint: ctx.accounts.mint.to_account_info(),
            to: ctx.accounts.vault.to_account_info(),
${AUTHORITY_LINE}
        };
        let cpi = CpiContext::new(ctx.accounts.token_program.key(), accounts);
        token_interface::transfer_checked(cpi, amount, ctx.accounts.mint.decimals)?;
        msg!("Deposited {} base units into your vault", amount);
        Ok(())
    }`

const SEEDS_LINE = `        let seeds: &[&[&[u8]]] = &[&[b"vault", mint.as_ref(), owner.as_ref(), &[ctx.bumps.vault]]];`

const WITHDRAW_FN = `    pub fn withdraw(ctx: Context<VaultTransfer>, amount: u64) -> Result<()> {
        let mint = ctx.accounts.mint.key();
        let owner = ctx.accounts.owner.key();
${SEEDS_LINE}
        let accounts = TransferChecked {
            from: ctx.accounts.vault.to_account_info(),
            mint: ctx.accounts.mint.to_account_info(),
            to: ctx.accounts.owner_tokens.to_account_info(),
            authority: ctx.accounts.vault.to_account_info(),
        };
        let cpi = CpiContext::new_with_signer(ctx.accounts.token_program.key(), accounts, seeds);
        token_interface::transfer_checked(cpi, amount, ctx.accounts.mint.decimals)?;
        msg!("Withdrew {} base units from your vault", amount);
        Ok(())
    }`

const MUT = "    #[account(mut)]"

const openVault = (fixed: boolean) => `#[derive(Accounts)]
pub struct OpenVault<'info> {${fixed ? `\n${MUT}` : ""}
    pub owner: Signer<'info>,
    pub mint: InterfaceAccount<'info, Mint>,
    #[account(
        init,
        payer = owner,
        seeds = [b"vault", mint.key().as_ref(), owner.key().as_ref()],
        bump,
        token::mint = mint,
        token::authority = vault,
    )]
    pub vault: InterfaceAccount<'info, TokenAccount>,
    pub token_program: Interface<'info, TokenInterface>,
    pub system_program: Program<'info, System>,
}`

/** `vault` comes before `owner_tokens` on purpose: Anchor checks constraints in field order, so a
 * stranger fails on the vault's seeds (2006), not on the token account's owner (2015) */
const VAULT_TRANSFER = `#[derive(Accounts)]
pub struct VaultTransfer<'info> {
    pub owner: Signer<'info>,
    pub mint: InterfaceAccount<'info, Mint>,
    #[account(
        mut,
        seeds = [b"vault", mint.key().as_ref(), owner.key().as_ref()],
        bump,
    )]
    pub vault: InterfaceAccount<'info, TokenAccount>,
    #[account(
        mut,
        token::mint = mint,
        token::authority = owner,
    )]
    pub owner_tokens: InterfaceAccount<'info, TokenAccount>,
    pub token_program: Interface<'info, TokenInterface>,
}`

type Parts = { imports: number; module?: boolean; deposit?: boolean; withdraw?: boolean; open?: "broken" | "fixed"; transfer?: boolean }

/** lib.rs with the pieces written so far, each in its place. Every write is placed by the file as it
 * stands right after it: the two transfers repeat most of their lines */
function lib(p: Parts) {
  const fns = [OPEN_FN, p.deposit && DEPOSIT_FN, p.withdraw && WITHDRAW_FN].filter(Boolean)
  const module = p.module ? `#[program]\nmod token_vault {\n    use super::*;\n\n${fns.join("\n\n")}\n}` : null
  return [boil(p.imports), module, p.open && openVault(p.open === "fixed"), p.transfer && VAULT_TRANSFER].filter(Boolean).join("\n\n")
}

const S1: Parts = { imports: 1, module: true, open: "fixed" }
const S2: Parts = { ...S1, imports: 2, deposit: true, transfer: true }
const LIB_BROKEN = lib({ ...S1, open: "broken" })
const LIB_S1 = lib(S1)
const LIB_S2 = lib(S2)
const LIB_S3 = lib({ ...S2, withdraw: true })

/** The lines of `owner` and of `vault` in the first build: the explanation quotes the one, the compiler
 * points at the other */
const OWNER_LINE = LIB_BROKEN.split("\n").findIndex((l) => l.trim() === "pub owner: Signer<'info>,") + 1

const EXPLAIN_ERROR = `\`init\` on \`vault\` takes the rent from \`owner\`, so \`owner\`'s balance changes. An instruction can only change accounts marked writable, and \`owner\` on line ${OWNER_LINE} isn't.`

const UPGRADES = `Upgrades ${shortKey(PROGRAM_ID).replace("…", "…⁠")} in place · from your wallet`

const AMOUNT = { name: "amount", label: "Amount", kind: "tokens", decimals: DECIMALS } as const

const STEPS: Step[] = [
  {
    id: "vault",
    title: "Vault",
    short: "Vault",
    objective: "Make a token, then a program that can open a vault for it",
    learned: "Holding tokens in an account a PDA owns",
    file: LIB,
    start: "",
    target: LIB_S1,
    goal: "build",
    beats: [
      {
        kind: "write",
        id: "s1.boil",
        text: "The usual opening: the import and the program's id, with `token_interface` for talking to the token programs. Routine, so I've written it.",
        writes: { file: LIB, block: boil(1), ref: lib({ imports: 1 }) },
      },
      {
        kind: "act",
        id: "s1.token",
        act: "send",
        ix: "create_token",
        say: "A vault needs something to keep. First, a token of your own: Playground creates it from your wallet, with a name, a symbol and an icon, and mints 100 to you.",
        title: "Create your token",
        context: "Token Metadata · 100 to your wallet · about 0.019 devnet SOL",
        button: "Create token",
        fields: [
          { name: "name", label: "Name", kind: "text", max: 32 },
          { name: "symbol", label: "Symbol", kind: "text", max: 10 },
        ],
        stages: ["Creating the mint and its metadata", "Minting 100 to your wallet"],
        record: "Created your token · 100 to your wallet",
      },
      {
        kind: "say",
        id: "s1.what",
        text: "Your 100 sit in a token account your wallet owns. A vault is the same kind of account, owned by an address only your program can sign for: a PDA.",
      },
      {
        kind: "write",
        id: "s1.accounts",
        text: 'Here\'s `OpenVault`. `init` with `token::` makes the vault: an account for your token at a PDA from `"vault"`, the mint and your key, whose authority is its own address.',
        writes: { file: LIB, block: openVault(false), ref: lib({ imports: 1, open: "broken" }) },
      },
      {
        kind: "write",
        id: "s1.fn",
        text: "And `open_vault`, empty: Anchor has made the vault by the time it runs.",
        writes: { file: LIB, block: `#[program]\nmod token_vault {\n    use super::*;\n\n${OPEN_FN}\n}`, ref: LIB_BROKEN },
      },
      {
        kind: "act",
        id: "s1.build",
        act: "build",
        say: "That's a vault, in code. Let's compile it.",
        title: "Build lib.rs",
        context: "Compiles lib.rs on Playground's build server",
        button: "Build",
      },
    ],
    planned: "This one's on purpose. Everyone who pays for an account meets this error once, so let's meet it now.",
    plannedShort: `\`init\` on \`vault\` takes its rent from \`owner\`, and \`owner\` on line ${OWNER_LINE} isn't writable.`,
    onFail: [
      { kind: "say", id: "f1.explain", text: EXPLAIN_ERROR, quote: { file: LIB, line: OWNER_LINE, mark: "owner", tone: "error" } },
      {
        kind: "ask",
        id: "f1.q",
        kicker: "Fix it",
        question: "So what does `owner` need?",
        options: ["`#[account(mut)]` on the line above it", "More devnet SOL in your wallet", "To be the vault's authority"],
        code: false,
        answer: 0,
        right: "Exactly. `mut` lets the instruction take the rent from `owner`. I've added it.",
        why: [
          null,
          "Your wallet has SOL: it just paid for your token. This error comes from the build, before anything is sent.",
          "The authority decides who moves the tokens later, and that's the vault itself, on purpose. The build is asking about who pays now.",
        ],
        hint: "The error is about the payer. What does paying do to an account?",
        writes: { file: LIB, block: MUT, ref: LIB_S1 },
        key: "#[account(mut)]",
        typed: "That's it. `owner` can pay the vault's rent now.",
      },
      {
        kind: "act",
        id: "f1.build",
        act: "build",
        say: "Build again. This time it should pass.",
        title: "Build lib.rs",
        context: "Same build, `owner` writable now",
        button: "Build",
      },
    ],
    win: {
      id: "s1.win",
      headline: "Your program can open vaults",
      line: "The IDL has one instruction, `open_vault`. Your 100 {symbol} are already on devnet, waiting for one.",
      stats: [
        { icon: "hammer", text: "Built in 1.6 s" },
        { icon: "coins", text: "100 GOLD" },
        { icon: "clock", text: "{took}" },
      ],
    },
    explainStep: "This step makes your token from the wallet, then writes `OpenVault`: a token account at a PDA, its own authority. The first build fails on purpose: the account that pays the rent isn't writable.",
    chips: [
      {
        label: "Why is the vault its own authority?",
        match: /authority/i,
        answer: "Its authority is its own address, a PDA, so the only way to sign for it is your program with its seeds. A separate authority PDA would work too; one account is simpler.",
      },
      {
        label: "What are decimals?",
        match: /decimals?|base units?/i,
        answer: "GOLD has 9: one GOLD is 1,000,000,000 base units, and programs only see base units. The card shows whole GOLD and the base units in its tooltip.",
      },
    ],
    errorChips: [
      {
        label: "Why does paying need mut?",
        match: /\bmut\b|writable/i,
        answer: "Paying rent moves SOL out of `owner`, which changes the account. Solana only lets a transaction change accounts it marked writable, and `mut` is how Anchor marks them.",
      },
      {
        label: "Where is this in the docs?",
        match: /\b(docs?|documentation)\b/i,
        answer: "The Anchor docs cover it in [Account Constraints](https://www.anchor-lang.com/docs/references/account-constraints), under `init` and `payer`.",
      },
    ],
    answers: [{ match: /why.*(fail|error)/i, answer: EXPLAIN_ERROR, local: true }],
  },
  {
    id: "deposit",
    title: "Deposit",
    short: "Deposit",
    objective: "Move tokens from your account into the vault",
    learned: "Transferring tokens with a CPI",
    file: LIB,
    start: LIB_S1,
    target: LIB_S2,
    goal: "move",
    beats: [
      {
        kind: "say",
        id: "s2.what",
        text: "A deposit moves tokens from your account into the vault. Your program can't move tokens itself: it asks the token program with a call, and the token program checks that the tokens' owner agreed.",
      },
      {
        kind: "ask",
        id: "s2.q1",
        kicker: "Question",
        n: 1,
        question: "Your wallet signed the deposit. Inside `deposit`, who is the transfer's authority?",
        options: ["The vault, since it receives the tokens", "The program, by its id", "`owner`: your signature on the transaction carries into the call"],
        code: false,
        answer: 2,
        right: "Right. A signature on the transaction counts in every call inside it, so the token program sees that you agreed. I've written `deposit` with `owner` as the authority.",
        why: ["A receiver never signs. The authority is whoever holds the tokens that leave.", "A program can only sign for its own PDAs, and your token account isn't one.", null],
        hint: "Whose tokens are leaving, and who already signed?",
        writes: { file: LIB, block: DEPOSIT_FN, ref: lib({ ...S1, deposit: true }) },
        key: AUTHORITY_LINE.trim(),
        typed: "That's the line. I've written the transfer around it.",
      },
      {
        kind: "write",
        id: "s2.accounts",
        text: "And `VaultTransfer`, the accounts `deposit` takes: your token account, which has to be yours, and your vault, found by its seeds. `withdraw` will take the same ones.",
        writes: { file: LIB, block: VAULT_TRANSFER, ref: lib({ ...S1, deposit: true, transfer: true }) },
      },
      {
        kind: "write",
        id: "s2.import",
        text: "The import gains `TransferChecked`, and `self` for the call.",
        writes: { file: LIB, block: IMPORTS[2], ref: LIB_S2 },
      },
      {
        kind: "act",
        id: "s2.ship",
        act: "buildDeploy",
        say: "Build and deploy: your program goes to devnet.",
        title: "Build and deploy",
        context: "First deploy · about 1.27 devnet SOL from your wallet",
        button: "Build and deploy",
      },
      {
        kind: "act",
        id: "s2.open",
        act: "send",
        ix: "open_vault",
        say: "Open your vault.",
        title: "Open your vault",
        context: "Calls `open_vault` · rent from your wallet",
        button: "Open",
        record: "Opened your vault · 0",
      },
      {
        kind: "act",
        id: "s2.deposit",
        act: "move",
        say: "Now deposit. The card sends whole tokens; the program gets base units.",
        title: "Deposit",
        context: "Sends `deposit` · 10 GOLD is 10,000,000,000 base units",
        button: "Deposit",
        moves: [{ ix: "deposit", button: "Deposit", fields: [AMOUNT] }],
        record: "Deposited",
      },
    ],
    win: {
      id: "s2.win",
      headline: "Your tokens are in the vault",
      line: "{deposited} {symbol} moved from your account into the vault, authorized by your signature. Only your program can sign for them now.",
      stats: [
        { icon: "rocket", text: "Live on devnet" },
        { icon: "coins", text: "10 GOLD in the vault" },
        { icon: "clock", text: "{took}" },
      ],
      extra: "openTest",
    },
    testWin: "You deposited from the Call panel. Your {symbol} is in the vault.",
    explainStep: "This step writes `deposit`, a transfer into the vault that your signature authorizes. Then the program goes to devnet, you open your vault and deposit.",
    chips: [
      {
        label: "Why transfer_checked?",
        match: /transfer_checked|checked/i,
        answer: "It passes the mint and its decimals along with the amount, so the token program can refuse a transfer built for another token or another number of decimals. Plain `transfer` is deprecated for that reason.",
      },
      {
        label: "Can someone deposit into my vault?",
        match: /someone|anyone|else/i,
        answer: "Only you: the vault's seeds include your key, so `deposit` finds the vault from the signer. Anyone can still send tokens to its address directly; that only adds to your vault.",
      },
    ],
  },
  {
    id: "withdraw",
    title: "Withdraw",
    short: "Withdraw",
    objective: "Take tokens back out, and nobody else can",
    learned: "Signing transfers with a PDA, and who may ask",
    file: LIB,
    start: LIB_S2,
    target: LIB_S3,
    goal: "move",
    beats: [
      {
        kind: "say",
        id: "s3.why",
        text: "To give tokens back, the vault has to sign, and only your program can sign for it. So whatever `withdraw` checks is all that stands between your vault and anyone who calls it.",
      },
      {
        kind: "ask",
        id: "s3.q2",
        kicker: "Question",
        n: 2,
        question: "`withdraw` is signed by the program. What stops someone else from emptying your vault?",
        options: [
          "Nothing: anyone can call `withdraw`, and the vault signs anyway",
          "Your key is one of the vault's seeds, so another signer's key leads to another address",
          "The token program remembers who deposited",
        ],
        code: false,
        answer: 1,
        right: 'Yes. `VaultTransfer` finds the vault from `"vault"`, the mint and the signer\'s key, so a stranger\'s signature points at an address with nothing in it, and Anchor refuses. I\'ve written `withdraw`: it signs with the same seeds.',
        why: ["That was the original's vault, and its own last page warned about it. The lock has to come from somewhere in the program.", null, "It only checks that the vault's authority signed. It keeps balances, not history."],
        hint: "Look at how `VaultTransfer` finds the vault. What in there can't a stranger change?",
        writes: { file: LIB, block: WITHDRAW_FN, ref: LIB_S3 },
        key: SEEDS_LINE.trim(),
        typed: "That's the line: the vault's seeds, with your key in them. I've written the transfer it signs.",
      },
      {
        kind: "act",
        id: "s3.ship",
        act: "buildDeploy",
        say: "Build and deploy the withdraw.",
        title: "Build and deploy",
        context: UPGRADES,
        button: "Build and deploy",
      },
      {
        kind: "act",
        id: "s3.stranger",
        act: "send",
        ix: "withdraw",
        signer: "stranger",
        say: "Try it the way a thief would: a second wallet signs a withdraw from your vault. Your wallet only pays the fee.",
        title: "Withdraw as a stranger",
        context: `Signed by \`${shortKey(STRANGER)}\` · your vault's address`,
        button: "Try it",
        record: "A stranger tried: refused",
      },
      {
        kind: "say",
        id: "s3.leftright",
        text: "Left is your vault, the account that was passed in. Right is where the stranger's seeds lead. They don't match, so nothing moved.",
      },
      {
        kind: "act",
        id: "s3.withdraw",
        act: "move",
        say: "Now you.",
        title: "Withdraw",
        context: "Sends `withdraw` · signed by your program for the vault",
        button: "Withdraw",
        moves: [{ ix: "withdraw", button: "Withdraw", fields: [AMOUNT] }],
        record: "Withdrew",
      },
    ],
    win: {
      id: "s3.win",
      headline: "Only you can empty your vault",
      line: "The stranger's key made a different address, and Anchor refused with error 2006. Your withdraw went through, signed by the program with your vault's seeds.",
      stats: [
        { icon: "alert", text: "Error 2006 for the stranger" },
        { icon: "coins", text: "100 GOLD back" },
        { icon: "clock", text: "{took}" },
      ],
    },
    testWin: "You withdrew from the Call panel, signed by the program with your vault's seeds.",
    explainStep: "This step writes `withdraw`, a transfer out of the vault the program signs with the vault's seeds. A stranger tries first and is refused; then you withdraw.",
    chips: [
      {
        label: "What signed the withdraw?",
        match: /signed|sign/i,
        answer: 'Your program, for the vault: it passed `"vault"`, the mint, your key and the bump with the call, and the runtime took that as the vault\'s signature.',
      },
      {
        label: "Could a game pay players from a vault?",
        match: /game|pay players|reward/i,
        answer: "Yes, with a different lock: a vault the program fills once, and a `withdraw` that only pays when the player did something, like Battle Coins' rewards. The seeds then name the game, not the player.",
      },
      {
        label: "Why not my wallet as the vault's authority?",
        match: /my wallet|authority/i,
        answer: "Then your wallet could move the tokens without the program, and a withdraw signed by the program would fail. With the vault as its own authority, the program and its checks are the only way out.",
      },
    ],
  },
]

/** A payer that isn't `mut`, pointed at the account being created as Anchor points at it */
const payerNotWritable: SpecialCheck = ({ bare, file, head, failed }) => {
  const rows = bare.split("\n")
  for (const m of bare.matchAll(/payer\s*=\s*(\w+)/g)) {
    const who = m[1]
    if (new RegExp(`#\\[account\\(\\s*mut\\s*\\)\\]\\s*pub\\s+${who}\\b`).test(bare)) continue
    // The field the `init` attribute sits over
    const from = bare.slice(0, m.index).split("\n").length - 1
    const at = rows.findIndex((r, i) => i > from && /^\s*pub\s+\w+\s*:/.test(r))
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
      log: [...head, "error: the payer specified for an init constraint must be mutable.", ` --> ${file}:${line}:${column}`, "Build failed"],
      reason: `${failed}: \`init\` on \`${name}\` takes its rent from \`${who}\`, and \`${who}\` isn't writable.`,
      explain: EXPLAIN_ERROR,
    }
  }
  return null
}

const CHECKS = [payerNotWritable, noSystemProgram]

// ---- The token and the vault: what the wallet and the program do with them, worked out the way they would

const find = (s: State, id: string) => s.records?.find((r) => r.id === id) ?? null
const symbolOf = (s: State) => String(find(s, "gold")?.values.symbol ?? "GOLD")
const amountOf = (s: State, id: string) => Number(find(s, id)?.values.amount ?? 0)

function args(s: State, ix: string): Record<string, string> {
  if (ix === "create_token") return { name: "Gold", symbol: "GOLD", uri: GOLD_URI }
  if (ix === "deposit") return { amount: String(10 * ONE) }
  // The withdraw starts at what the vault holds
  if (ix === "withdraw") return { amount: String(amountOf(s, "vault") || 10 * ONE) }
  return {}
}

function check(ix: string, given: Record<string, string>): string | null {
  if ((ix === "deposit" || ix === "withdraw") && !isU64(given.amount ?? "")) return "`amount` is a `u64`, in base units: a whole number from 0."
  return null
}

const set = (rows: Rec[], id: string, amount: number) => rows.map((r) => (r.id === id ? { ...r, values: { ...r.values, amount } } : r))

/** The wallet's two transactions for "Create your token", as Umi sends them, for the terminal */
const umiLog = (name: string, symbol: string, signature: string) => [
  "$ createFungible(umi, { mint, name, symbol, uri, decimals: 9 }).sendAndConfirm(umi)",
  `Program ${METADATA_PROGRAM} invoke [1]`,
  `Program ${METADATA_PROGRAM} success`,
  `Created ${name} (${symbol}) · mint ${GOLD}`,
  "$ mintV1(umi, { mint, amount: 100_000_000_000n, tokenOwner }).sendAndConfirm(umi)",
  `Minted 100 ${symbol} to ${shortKey(WALLET)} · account ${OWNER_TOKENS}`,
  `Signature: ${signature}`,
]

/** One send, from a card or the Call panel, answered as devnet would: a vault is opened once, a transfer
 * of more than an account holds is refused by the Token program, and a stranger's withdraw by Anchor's
 * seeds check */
function send(s: State, ix: string, given?: Record<string, string>, _row?: string, signer?: "stranger"): RecSend | { note: string } {
  const a = { ...args(s, ix), ...given }
  const rows = s.records ?? []
  const gold = find(s, "gold")
  const vault = find(s, "vault")
  const signature = rows.length === 0 ? CREATE_SIGNATURE : signatureOf(sentSoFar(s) + 500)
  if (ix === "create_token") {
    if (gold) return { note: "Your token is already made." }
    if (bytes(a.name) > 32 || bytes(a.symbol) > 10) return { note: "Token Metadata takes names up to 32 characters and symbols up to 10." }
    const made: Rec[] = [
      { id: "gold", kind: "Mint", pda: GOLD, values: { supply: 100 * ONE, name: a.name, symbol: a.symbol }, rent: MINT_RENT + METADATA_RENT },
      { id: "mine", kind: "TokenAccount", pda: OWNER_TOKENS, values: { amount: 100 * ONE }, rent: TOKEN_ACCOUNT_RENT },
    ]
    const tx: Tx = { instruction: "create_token", said: "", signature, compute: 38420 }
    return { tx, records: made, log: umiLog(a.name, a.symbol, signature) }
  }
  if (ix === "open_vault") {
    if (!gold) return { note: "Create your token first." }
    if (vault) return { tx: inUse("open_vault", VAULT, signature), records: rows, refused: "Already in use · your vault stayed as it was" }
    const rec: Rec = { id: "vault", kind: "TokenAccount", pda: VAULT, values: { amount: 0 }, rent: TOKEN_ACCOUNT_RENT }
    return { tx: { instruction: "open_vault", said: "", signature, compute: 14620, inner: [...SYSTEM_CPI, ...tokenCpi("InitializeAccount3")] }, records: [...rows, rec] }
  }
  if (ix === "deposit" || ix === "withdraw") {
    if (!vault) return { note: "Open your vault first, with `open_vault`." }
    if (ix === "withdraw" && signer === "stranger") {
      const tx = anchorError("withdraw", signature, "ConstraintSeeds", 2006, "A seeds constraint was violated", "vault", 5120)
      tx.error!.log = [...tx.error!.log!, "Program log: Left:", `Program log: ${VAULT}`, "Program log: Right:", `Program log: ${STRANGER_VAULT}`]
      return { tx, records: rows, refused: "ConstraintSeeds · 2006 · nothing moved" }
    }
    const amount = Number(a.amount)
    const from = ix === "deposit" ? "mine" : "vault"
    const to = ix === "deposit" ? "vault" : "mine"
    if (amount > amountOf(s, from)) return { tx: insufficientFunds(ix, signature, "TransferChecked"), records: rows, refused: "Insufficient funds · the Token program refused, nothing moved" }
    const said = ix === "deposit" ? `Deposited ${amount} base units into your vault` : `Withdrew ${amount} base units from your vault`
    const tx: Tx = { instruction: ix, said, signature, compute: ix === "deposit" ? 6480 : 8930, inner: tokenCpi("TransferChecked") }
    return { tx, records: set(set(rows, from, amountOf(s, from) - amount), to, amountOf(s, to) + amount) }
  }
  return { note: "That call has no card here." }
}

/** Step 2 passes on a deposit that landed, step 3 on your own withdraw */
const passes = (_s: State, i: number, ix: string, tx: Tx) => (i === 1 ? ix === "deposit" && !tx.error : i === 2 ? ix === "withdraw" && !tx.error : false)

/** The last deposit that landed, in whole tokens, for step 2's win */
function lastDeposit(s: State) {
  const sent = s.thread.flatMap((t) => (t.kind === "act" ? (t.sends ?? []) : [])).filter((x) => x.ix === "deposit" && x.ok)
  const m = sent[sent.length - 1]?.tx.said.match(/(\d+) base units/)
  return m ? whole(Number(m[1]), DECIMALS) : "10"
}

export const SPL_TOKEN_VAULT: Lesson = {
  card: { slug: "spl-token-vault", name: "SPL Token Vault", level: "Intermediate", framework: "Anchor", ext: "png" },
  minutes: 12,
  by: "Jonas Hahn",
  program: "token_vault",
  line: "Make a token, keep it in a vault only your program can open",
  intro: "You'll make a token of your own, then a program that keeps it in a vault: deposit, withdraw, and watch a stranger get refused.",
  proof: "Program log: Deposited 10000000000 base units into your vault",
  badge: "Token vault",
  headline: "You built a vault only you can open",
  proofLine: (_tx, s) => `Your vault on devnet holds ${whole(amountOf(s, "vault"), DECIMALS)} ${symbolOf(s)} and opens only for your key: a stranger got error 2006.`,
  // The end of the Intermediate Anchor path leads up a level
  next: "zero-copy",
  nextLine: "Zero Copy is a good next one: what happens when an account grows past what a program can copy, and the way past it.",
  steps: STEPS,
  // No client.ts: the token is made from a card, and the vault's calls go from the cards or the Call panel
  files: { [LIB]: "" },
  preview: LIB_S3,
  programId: PROGRAM_ID,
  idlAccount: IDL_ACCOUNT,
  txSignature: CREATE_SIGNATURE,
  checks: CHECKS,
  story: false,
  runTx: () => ({ instruction: "open_vault", said: "", signature: CREATE_SIGNATURE, compute: 14620, inner: SYSTEM_CPI }),
  records: {
    title: "Token",
    one: "account",
    empty: "No token yet.",
    show: (r) => ({ label: r.id === "vault" ? "Your vault" : r.kind === "Mint" ? String(r.values.name) : "Your token account", seeds: "", fields: [] }),
    send,
    passes,
    args,
    check,
    tokens: (rows) => {
      const gold = rows.find((r) => r.id === "gold")
      const symbol = String(gold?.values.symbol ?? "GOLD")
      const holder = (id: string, label: string, key: string, owner: string) => {
        const r = rows.find((x) => x.id === id)
        return r ? [{ id, label, key, owner, amount: Number(r.values.amount) }] : []
      }
      return {
        mint: gold ? { name: String(gold.values.name), symbol, key: GOLD, supply: Number(gold.values.supply), decimals: DECIMALS, authority: "your wallet", metadata: true } : null,
        holders: [...holder("mine", `Your ${symbol} account`, OWNER_TOKENS, "yours"), ...holder("vault", "Your vault", VAULT, "owned by the vault itself")],
      }
    },
  },
  winVars: (s) => ({ symbol: symbolOf(s), deposited: lastDeposit(s) }),
}
