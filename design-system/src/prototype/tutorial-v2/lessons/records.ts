import { lineOf } from "../check"
import type { State } from "../store"
import type { SpecialCheck, Tx } from "./types"

// What the Data family's lessons share (Counter PDA, Expense Tracker, Bank Simulator, Todo App Seahorse):
// keys and signatures made up the same way every time, rent and dollars as the cards print them, the
// System Program's refusal of an address already in use, and the compiler errors a first account meets

const A = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz"

/** A base58 string of `length` from a number: the same for the same number on every reload */
export function base58(n: number, length: number) {
  let x = (n + 11) * 2654435761
  return Array.from({ length }, () => {
    x = (x ^ (x << 13)) >>> 0
    x = (x ^ (x >>> 17)) >>> 0
    x = (x ^ (x << 5)) >>> 0
    return A[x % 58]
  }).join("")
}

/** A transaction signature, 88 characters */
export const signatureOf = (n: number) => base58(n, 88)

/** An address for a record the script has no example for: #4 and on */
export const pdaOf = (n: number) => base58(n * 31 + 7, 44)

/** How many transactions the lesson has sent so far, for the next signature: every move, every send
 * card and every call from the Call panel */
export const sentSoFar = (s: State) =>
  s.thread.reduce((n, t) => n + (t.kind === "act" ? (t.sends?.length ?? 0) : t.kind === "result" && !!t.tx ? 1 : 0), 0)

/** Rent as the cards print it: 0.0015 SOL */
export const sol = (n: number) => `${n.toFixed(4)} SOL`

/** Cents as dollars: $1,234.50 */
export const dollars = (cents: number) => `$${(cents / 100).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

/** The System Program creating an account inside the instruction, as the logs show it */
export const SYSTEM_CPI = ["Program 11111111111111111111111111111111 invoke [2]", "Program 11111111111111111111111111111111 success"]

/** `init` at an address that already holds an account: the System Program refuses before the program
 * runs a line, and the transaction fails with its error, not one of the program's */
export function inUse(instruction: string, pda: string, signature: string, compute = 3290): Tx {
  return {
    instruction,
    said: "",
    signature,
    compute,
    error: {
      name: "AlreadyInUse",
      number: 0,
      message: "Allocate: account already in use",
      line: 0,
      log: [
        "Program 11111111111111111111111111111111 invoke [2]",
        `Allocate: account Address { address: ${pda}, base: None } already in use`,
        "Program 11111111111111111111111111111111 failed: custom program error: 0x0",
      ],
      failed: "custom program error: 0x0",
    },
  }
}

/** One of Anchor's own errors, numbered from 2000 and 3000, as it logs them */
export function anchorError(instruction: string, signature: string, name: string, number: number, message: string, account: string, compute = 4210): Tx {
  return {
    instruction,
    said: "",
    signature,
    compute,
    error: {
      name,
      number,
      message,
      line: 0,
      log: [`Program log: AnchorError caused by account: ${account}. Error Code: ${name}. Error Number: ${number}. Error Message: ${message}.`],
    },
  }
}

/** A string too long for the bytes its account was sized for: Anchor can't write the account back */
export const tooLong = (instruction: string, signature: string, account: string) => anchorError(instruction, signature, "AccountDidNotSerialize", 3004, "Failed to serialize the account", account)

/** An account the instruction expects to exist, and doesn't: a deleted expense, say */
export const missing = (instruction: string, signature: string, account: string) =>
  anchorError(instruction, signature, "AccountNotInitialized", 3012, "The program expected this account to be already initialized", account)

/** The bytes of a string as it's stored */
export const bytes = (text: string) => new TextEncoder().encode(text).length

/** Whether the last send of `ix` that came back did so without an error */
export const landed = (s: State, ix: string) =>
  s.thread.some((t) => (t.kind === "act" && (t.sends ?? []).some((x) => x.ix === ix && x.ok)) || (t.kind === "result" && t.tx?.instruction === ix && !t.tx.error))

/** A whole number a `u64` holds */
export const isU64 = (v: string) => /^\d+$/.test(v.trim()) && Number(v) <= Number.MAX_SAFE_INTEGER

// ---- Compiler errors a first account meets, for every Anchor lesson of the family

type Found = ReturnType<SpecialCheck>

/** Each `#[account(...)]` over a field, with the field's name and the line the attribute opens on */
function attributes(bare: string) {
  return [...bare.matchAll(/#\[account\(([\s\S]*?)\)\]\s*\n\s*pub\s+(\w+)/g)].map((m) => ({ body: m[1], field: m[2], line: bare.slice(0, m.index).split("\n").length }))
}

/** `init` with no `space`: the account would have no size, and Anchor won't guess one */
export function initWithoutSpace(explain: string, planned = true): SpecialCheck {
  return ({ bare, file, head, failed }): Found => {
    const a = attributes(bare).find((a) => /\binit\b/.test(a.body) && !/\bspace\s*=/.test(a.body))
    if (!a) return null
    const rows = bare.split("\n")
    const at = rows.findIndex((r, i) => i >= a.line - 1 && /^\s*init\s*,/.test(r))
    const line = at === -1 ? a.line : at + 1
    const column = (rows[line - 1] ?? "").indexOf("init") + 1
    return {
      ok: false,
      planned,
      line,
      column,
      span: "init".length,
      log: [...head, "error: space must be provided with init", ` --> ${file}:${line}:${column}`, "Build failed"],
      reason: `${failed}: \`init\` on line ${line} creates an account, and nothing says how big it is.`,
      explain,
    }
  }
}

/** A `String` in an `InitSpace` struct with no `#[max_len]` over it: the derive can't count it */
export function stringWithoutMaxLen(explain: string, planned = false): SpecialCheck {
  return ({ bare, file, head, failed }): Found => {
    const rows = bare.split("\n")
    for (const [i, row] of rows.entries()) {
      if (!/^\s*pub\s+\w+\s*:\s*String\s*,/.test(row)) continue
      // Inside a struct that derives InitSpace, and no max_len on the line over it
      let open = i - 1
      while (open >= 0 && !/\bpub\s+struct\b/.test(rows[open])) open--
      if (open < 0 || !rows.slice(Math.max(0, open - 3), open).some((r) => /#\[derive\([^)]*InitSpace/.test(r))) continue
      if (/#\[max_len\(/.test(rows[i - 1] ?? "")) continue
      const line = i + 1
      const column = row.indexOf("String") + 1
      return {
        ok: false,
        planned,
        line,
        column,
        span: "String".length,
        log: [...head, "error: Expected max_len attribute.", ` --> ${file}:${line}:${column}`, "Build failed"],
        reason: `${failed}: \`InitSpace\` can't count the \`String\` on line ${line}: it has no fixed length.`,
        explain,
      }
    }
    return null
  }
}

/** `init` with no `system_program` among the accounts: only the System Program creates accounts */
export const noSystemProgram: SpecialCheck = ({ code, bare, file, head, failed }) => {
  if (!attributes(bare).some((a) => /\binit\b/.test(a.body)) || /\bsystem_program\s*:/.test(bare)) return null
  const line = lineOf(code, "init,")
  return {
    ok: false,
    line,
    log: [
      ...head,
      "error: the init constraint requires the system_program field to exist in the account validation struct. Use the Program type to add the system_program field to your validation struct.",
      ` --> ${file}:${line}`,
      "Build failed",
    ],
    reason: `${failed}: \`init\` on line ${line} needs \`system_program\` among the accounts.`,
    explain: "`init` asks the System Program to create the account, so it has to be in the instruction's accounts: `pub system_program: Program<'info, System>,`.",
  }
}

/** A payer that isn't `mut`: paying rent changes its balance */
export const payerNotMut: SpecialCheck = ({ code, bare, file, head, failed }) => {
  for (const m of bare.matchAll(/payer\s*=\s*(\w+)/g)) {
    const who = m[1]
    if (new RegExp(`#\\[account\\(\\s*mut\\s*\\)\\]\\s*pub\\s+${who}\\b`).test(bare)) continue
    const line = lineOf(code, `pub ${who}`)
    return {
      ok: false,
      line,
      log: [...head, "error: the payer specified for an init constraint must be mutable.", ` --> ${file}:${line}`, "Build failed"],
      reason: `${failed}: \`${who}\` on line ${line} pays for the account, so it has to be \`mut\`.`,
      explain: `\`payer = ${who}\` takes the rent from \`${who}\`, which changes its balance, so Anchor needs it writable. Put \`#[account(mut)]\` on the line above \`pub ${who}\`.`,
    }
  }
  return null
}

/** `close` on an account that isn't `mut`: closing empties its lamports */
export const closeNotMut: SpecialCheck = ({ bare, file, head, failed }) => {
  const a = attributes(bare).find((a) => /\bclose\s*=/.test(a.body) && !/\bmut\b/.test(a.body))
  if (!a) return null
  const line = a.line
  return {
    ok: false,
    line,
    log: [...head, "error: mut must be provided before close", ` --> ${file}:${line}`, "Build failed"],
    reason: `${failed}: \`close\` on line ${line} changes the account, so it has to be \`mut\` too.`,
    explain: "Closing an account sets its lamports to zero and hands them on, so Anchor needs it writable. Put `mut,` above `close` in the same attribute.",
  }
}

/** `Clock::get()` used without `?`: it returns a `Result`, which has no `unix_timestamp` */
export const clockWithoutTry: SpecialCheck = ({ code, bare, file, head, failed }) => {
  if (!/Clock::get\(\)\s*\.\s*unix_timestamp/.test(bare)) return null
  const line = lineOf(code, "Clock::get()")
  return {
    ok: false,
    line,
    log: [...head, "error[E0609]: no field `unix_timestamp` on type `Result<Clock, ProgramError>`", ` --> ${file}:${line}`, "Build failed"],
    reason: `${failed}: \`Clock::get()\` on line ${line} returns a \`Result\`. Add \`?\` to get the clock out of it.`,
    explain: "`Clock::get()` can fail, so it hands back a `Result`. `?` takes the clock out of it, or returns the error: `Clock::get()?.unix_timestamp`.",
  }
}
