import type { OwnCheck, SpecialCheck } from "./types"

// What every Seahorse lesson shares (Hello Seahorse, Todo App Seahorse): the program is Python in
// `src/<name>.py`, set as the lesson's `main`; the build compiles it to an Anchor program in Rust,
// which opens read only beside it; and Seahorse's own errors stop the build before any Rust is made.
// Give a Seahorse lesson `main`, `generated: { file: GENERATED, of }` and `checks: SEAHORSE_CHECKS`

/** The Rust a Seahorse build writes, as its tab and the tree name it */
export const GENERATED = "src/lib.rs (generated)"

/** The types Seahorse knows for a parameter, besides the program's own classes. `Empty[...]` and
 * `List[...]` are read by the name before the bracket */
const KNOWN = new Set([
  "Signer",
  "Empty",
  "UncheckedAccount",
  "TokenAccount",
  "TokenMint",
  "AssociatedTokenAccount",
  "Program",
  "Clock",
  "PriceAccount",
  "Pubkey",
  "List",
  "Array",
  "str",
  "bool",
  "f64",
  "u8",
  "u16",
  "u32",
  "u64",
  "u128",
  "i8",
  "i16",
  "i32",
  "i64",
  "i128",
])

type Param = { name: string; type: string | null; line: number; column: number }

/** Every parameter of every `@instruction` function, where it sits, and its type if it has one */
function params(bare: string): Param[] {
  const rows = bare.split("\n")
  const out: Param[] = []
  rows.forEach((row, i) => {
    if (!/^\s*@instruction\b/.test(row)) return
    // The decorated function is the next line with code on it
    const at = rows.findIndex((r, k) => k > i && r.trim() !== "")
    const def = at === -1 ? null : rows[at].match(/^(\s*def\s+\w+\s*\()([^)]*)\)/)
    if (!def) return
    let col = def[1].length
    for (const part of def[2].split(",")) {
      const name = part.split(":")[0].trim()
      if (name) {
        const type = part.includes(":") ? part.split(":")[1].trim() : null
        out.push({ name, type, line: at + 1, column: col + part.indexOf(name) + 1 })
      }
      col += part.length + 1
    }
  })
  return out
}

/** A Seahorse compiler error, as the terminal prints it: the error, where, the line, and its help */
function seahorseError(c: Parameters<SpecialCheck>[0], p: Param, error: string, help: string, reason: string, explain: string, planned = false): OwnCheck {
  const row = c.code.split("\n")[p.line - 1]?.trimEnd() ?? ""
  return {
    ok: false,
    planned,
    line: p.line,
    column: p.column,
    span: (p.type ?? p.name).length,
    log: [...c.head, `Error: ${error}`, ` --> ${c.file}:${p.line}:${p.column}`, `${p.line} | ${row}`, `Help: ${help}`, `${c.failed}: Seahorse compile failed`],
    reason: `${c.failed}: ${reason}`,
    explain,
  }
}

/** The errors a Seahorse program's parameters meet first: one with no type (the error every Python
 * developer meets once, so a lesson's planned failure), and a type Seahorse doesn't know */
export const SEAHORSE_CHECKS: SpecialCheck[] = [
  (c) => {
    const p = params(c.bare).find((x) => x.type === null)
    if (!p) return null
    return seahorseError(
      c,
      p,
      "param without type.",
      "all function params must have a type annotation.",
      `\`${p.name}\` on line ${p.line} has no type, and Seahorse needs one on every parameter.`,
      `Seahorse reads each parameter's type to tell an account the call passes from a value it sends. \`${p.name}\` on line ${p.line} has none, so the build stops before any Rust is made. Give it one: \`${p.name}: Signer\` for the wallet that signs, \`${p.name}: str\` for text.`,
      true
    )
  },
  (c) => {
    const own = new Set([...c.bare.matchAll(/class\s+(\w+)\s*\(/g)].map((m) => m[1]))
    const p = params(c.bare).find((x) => x.type !== null && !KNOWN.has(x.type.replace(/\[.*$/, "")) && !own.has(x.type.replace(/\[.*$/, "")))
    if (!p || p.type === null) return null
    const at = { ...p, column: p.column + c.code.split("\n")[p.line - 1].slice(p.column - 1).indexOf(p.type) }
    return seahorseError(
      c,
      at,
      `symbol "${p.type}" not found.`,
      "check the spelling and the case: Seahorse's types are `Signer`, `str`, `u64` and the like.",
      `Seahorse doesn't know a type called \`${p.type}\` (line ${p.line}).`,
      `Types are case sensitive, and Seahorse knows its own set: \`Signer\` for an account that signs, \`str\` for text, numbers like \`u64\`, and the classes your program declares. \`${p.type}\` on line ${p.line} isn't one of them.`
    )
  },
]
