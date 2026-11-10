import { MAIN_FILE, filesOf, type Ix, type ProgramMeta } from "./data"

/* Read mode (research/program-redesign/delta/CONSENSUS-delta.md 2.3): a catalog program the build server
   can't build is read with the assistant along a path of stops. Calling Solana's copies on devnet is out of
   scope for now (Sergey, 11/09), so no path ends in a call. The path comes from the data, the answers are canned over it */

export type Stop = "overview" | "instructions" | "accounts" | "call"

export const STOP_LABEL: Record<Stop, string> = { overview: "Overview", instructions: "Instructions", accounts: "Accounts", call: "Call on devnet" }

export const STOP_CONTEXT: Record<Exclude<Stop, "call">, (name: string) => string> = {
  overview: () => "Where a call comes in and what runs first.",
  instructions: (name) => `What ${name} can be asked to do, and where each one is handled.`,
  accounts: () => "The accounts each instruction reads and writes.",
}

/** Overview and Instructions always; Accounts when any instruction takes accounts; Call on devnet last
 * for a program that is callable without a build and answers on devnet */
export function readPath(meta: ProgramMeta): Stop[] {
  return [
    "overview",
    "instructions",
    ...(meta.ixs.some((ix) => ix.accounts.length) ? (["accounts"] as const) : []),
    ...(meta.callable && meta.devnetId ? (["call"] as const) : []),
  ]
}

/** A range in a file: a line link's target */
export type Ref = { file: string; from: number; to?: number }

/** Words and line links, in order; a link ends its sentence */
export type Part = string | Ref

const INSTRUCTION_FILE = "src/instruction.rs"

/** The line a piece of code is on, 1 based; the first line when it isn't there */
export function lineOf(meta: ProgramMeta, file: string, needle: string) {
  const at = (filesOf(meta)[file] ?? "").split("\n").findIndex((l) => l.includes(needle))
  return at + 1 || 1
}

const RAW = (meta: ProgramMeta) => meta.slug === "spl-memo" || meta.slug === "spl-noop"

/** The Overview stop's answer, and the lines it quotes */
export function overview(meta: ProgramMeta): { parts: Part[]; quote: Ref } {
  const entry = lineOf(meta, MAIN_FILE, "pub fn process_instruction(")
  if (meta.slug === "spl-memo")
    return {
      parts: [
        "A call comes in at `entrypoint.rs` and goes straight to `process_instruction`, at ",
        { file: MAIN_FILE, from: entry },
        ". There's no list of instructions: the whole input is the memo's text. It's checked as UTF-8 and written to the log, at ",
        { file: MAIN_FILE, from: 30, to: 34 },
        ".",
      ],
      quote: { file: MAIN_FILE, from: 34 },
    }
  if (meta.slug === "spl-noop")
    return {
      parts: ["A call comes in at `entrypoint.rs` and goes straight to `process_instruction`, at ", { file: MAIN_FILE, from: entry }, ". It reads nothing and returns `Ok(())`, so any input succeeds."],
      quote: { file: MAIN_FILE, from: entry + 5 },
    }
  const unpack = lineOf(meta, MAIN_FILE, "Instruction::unpack(input)")
  return {
    parts: [
      "A call comes in at `entrypoint.rs`, which hands it to `process_instruction`, at ",
      { file: MAIN_FILE, from: entry },
      `. It unpacks the input into one of ${meta.ixs.length} instructions, listed in \`instruction.rs\`, and runs the matching function, at `,
      { file: MAIN_FILE, from: unpack, to: unpack + 1 },
      ".",
    ],
    quote: { file: MAIN_FILE, from: unpack, to: unpack + 1 },
  }
}

/** Where an instruction is in the code: its variant, or the one function of a program with no list */
export function ixRef(meta: ProgramMeta, ix: Ix): Ref {
  if (RAW(meta)) return { file: MAIN_FILE, from: lineOf(meta, MAIN_FILE, "pub fn process_instruction(") }
  const pascal = ix.name.replace(/(^|_)(\w)/g, (_, __, c: string) => c.toUpperCase())
  const from = lineOf(meta, INSTRUCTION_FILE, `    ${pascal}`)
  return { file: INSTRUCTION_FILE, from: from - 1, to: from }
}

/** The Instructions stop's lead, before the box of rows */
export function instructionsLead(meta: ProgramMeta): Part[] {
  if (meta.slug === "spl-memo")
    return [
      "memo has one instruction, and its input is the text itself. Lines 19 to 28 check that every account passed in signed the transaction: ",
      { file: MAIN_FILE, from: 19, to: 28 },
      ". Line 30 reads the input as UTF-8, and line 34 writes it to the log: ",
      { file: MAIN_FILE, from: 30, to: 34 },
      ".",
    ]
  if (meta.slug === "spl-noop") return ["noop has one instruction, and it takes anything: no accounts, any bytes, and nothing comes back but success."]
  return [`${meta.name} can be asked to do ${meta.ixs.length} things. Each one is a variant of \`Instruction\` in \`instruction.rs\`, handled by its own function in \`processor.rs\`.`]
}

/** The roles an account plays, read the same way the Call panel reads them */
export const isSigner = (name: string) => /authority|signer|owner/.test(name)

/** One plain line per account */
export const accountLine = (name: string) => (/payer|funder/.test(name) ? "Pays the rent for new accounts." : isSigner(name) ? "Your wallet, signing the call." : "Read and written by the program.")

/** The chips under each stop's answer */
export function chipsFor(stop: Stop, meta: ProgramMeta): string[] {
  const ix = meta.ixs[0]
  if (stop === "overview") return ["What's an entrypoint?", "What happens to a bad input?"]
  if (stop === "instructions") return [`What does ${ix.name} check?`, `What would a call to ${ix.name} send?`]
  if (stop === "accounts") {
    const signed = meta.ixs.find((i) => i.accounts.some(isSigner)) ?? ix
    return [`Why does ${signed.name} need a signer?`, `Who pays for ${meta.ixs.find((i) => i.accounts.length)?.accounts[0] ?? "an account"}?`]
  }
  return ["What's in the log?", "What did the fee pay for?"]
}

/** The landing's chips, the honest answer first */
export const LANDING_CHIPS = ["Why can't I build this?", "What is a Native program?", "What is it used for?"]

export const WHY = "Why can't I build this?"

export function whyAnswer(meta: ProgramMeta) {
  const can = meta.callable && meta.devnetId ? "You can read it, ask about any line, and call the copy Solana runs on devnet." : "You can read it and ask about any line."
  return `Playground's build server builds Anchor programs for now. ${meta.name} is written in Native Rust, without Anchor, so it can't be built or deployed here yet. ${can}`
}

const CANT_RUN = "Playground can't build this program yet, so a change here couldn't run."

/** The assistant's canned answers in read mode. It explains and never writes code (Sergey, 11/07) */
export function readAnswer(meta: ProgramMeta, text: string): string {
  const t = text.toLowerCase()
  const ix = meta.ixs.find((i) => t.includes(i.name)) ?? meta.ixs[0]
  if (t.includes("build") || t.includes("deploy")) return whyAnswer(meta)
  if (t.includes("native program"))
    return "A Native program is written in plain Rust against `solana_program`, without a framework like Anchor. It reads its own input bytes and checks its own accounts, which Anchor would do for it."
  if (t.includes("used for")) return meta.about
  if (/\b(change|make it|fix|add|write)\b/.test(t))
    return meta.slug === "spl-memo"
      ? `Line 34 does the logging; a second \`msg!\` under it would log twice. ${CANT_RUN}`
      : `Each instruction has its own function in \`processor.rs\`: a change to what \`${ix.name}\` does goes in \`process_${ix.name}\`. ${CANT_RUN}`
  if (t.includes("entrypoint"))
    return "The entrypoint is the one function Solana calls for every transaction that names the program. `entrypoint!` in `entrypoint.rs` registers `process_instruction`, and everything starts there."
  if (t.includes("bad input"))
    return meta.slug === "spl-memo"
      ? "Bytes that aren't valid UTF-8 stop at line 30: the program logs where the text went wrong and returns `InvalidInstructionData`, so the whole transaction fails and nothing is written."
      : meta.slug === "spl-noop"
        ? "There's no bad input for noop: it never reads the bytes, so every call succeeds."
        : "`Instruction::unpack` returns `InvalidInstructionData` when the bytes don't match any instruction, so the call fails before any function runs."
  if (t.includes("check"))
    return meta.slug === "spl-memo"
      ? "Two things: every account passed in must have signed (lines 19 to 28), and the input must be valid UTF-8 (line 30). Either one failing stops the call."
      : `\`${ix.name}\` checks that the accounts it gets are the ones it expects, in order, with \`next_account_info\`. ${ix.line}`
  if (t.includes("send"))
    return meta.slug === "spl-memo"
      ? "The text's UTF-8 bytes as the instruction data, the memo program's id, and no accounts unless you want signers checked."
      : `The instruction's tag and its arguments (${ix.args.map((a) => `\`${a.name}\``).join(", ") || "none"}) packed with Borsh, plus ${ix.accounts.length || "no"} accounts in the order the function reads them.`
  if (t.includes("signer"))
    return "A signer is a wallet that approved the transaction. The instruction changes something that wallet owns, so the program checks the signature before it writes."
  if (t.includes("who pays"))
    return "The wallet that sends the transaction pays: the rent that keeps an account open, and the fee. On devnet that's test SOL."
  if (t.includes("log")) return "The log is what the program printed with `msg!` while it ran, plus Solana's own lines: which program was invoked, how many compute units it used, and whether it succeeded."
  if (t.includes("fee")) return "The fee pays the validators for processing the transaction: about 0.000005 test SOL for one signature. It's paid even when the call fails."
  if (t === "call" || t.includes("call it") || t.includes("can i call"))
    return meta.devnetId
      ? `Solana runs ${meta.name} on devnet, but calling it from Playground comes later. For now you read it and ask about any line.`
      : `${meta.name} isn't on devnet, so there's nothing to call. You can read it and ask about any line.`
  if (t.includes("account"))
    return "An account is where Solana keeps data. A program can only read and write the accounts a call passes in, which is why every instruction lists them."
  return `${meta.about} Ask about any line, or what an instruction checks.`
}
