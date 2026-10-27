import type { Fail } from "./data"

/** What a build of hand-written code finds. The prototype has no compiler, so it compares the
 * file with what the step needs, ignoring what a compiler would ignore or let through, and names
 * the two slips newcomers make most */
export type OwnCheck = { ok: true } | (Fail & { explain: string })

const DECLARE = /(declare_id!\(\s*")[^"]*("\s*\))/g

/** The file with its program id in `declare_id!`, as Playground writes it in once the program has an
 * address */
export const withId = (code: string, id: string) => code.replace(DECLARE, (_, open: string, close: string) => `${open}${id}${close}`)

/** Whitespace goes, and so does the program id: which address `declare_id!` holds is Playground's to
 * fill, never a difference the lesson checks */
const squash = (code: string) => withId(code, "").replace(/\s+/g, "")

/** Whether two versions of a file differ only in whitespace or the program id, which no build would
 * notice */
export const sameCode = (a: string, b: string) => squash(a) === squash(b)

// A string first, so a // inside one isn't taken for a comment, then either kind of comment
const COMMENT = /("(?:[^"\\\n]|\\.)*"|`(?:[^`\\]|\\.)*`)|\/\/[^\n]*|\/\*[\s\S]*?\*\//g

/** The code without its comments. A comment that spans lines leaves its line breaks behind, so
 * every line keeps its number for the error that points at it */
export function uncomment(code: string) {
  return code.replace(COMMENT, (m, str: string | undefined) => str ?? m.replace(/[^\n]/g, ""))
}

/** One line as the check compares it. Whitespace goes; `pub mod` is the same program as `mod`;
 * what `msg!` says is up to whoever writes it, as long as it fills as many `{}` as the step's does */
function norm(line: string) {
  return squash(
    line
      .replace(/\bpub\s+mod\b/g, "mod")
      .replace(/msg!\(\s*"((?:[^"\\]|\\.)*)"/g, (_, text: string) => `msg!("${"{}".repeat(text.split("{}").length - 1)}"`)
  )
}

const lines = (code: string) => uncomment(code).split("\n").map(norm)

/** The 1-based line that holds `needle`, comments aside, or 1 */
function lineOf(code: string, needle: string) {
  const i = uncomment(code).split("\n").findIndex((l) => l.includes(needle))
  return i === -1 ? 1 : i + 1
}

/** A line of code to quote in a message. Prose reads ticks as code, so a line with its own can't be quoted */
const quote = (line: string) => (line.includes("`") ? "" : ` (\`${line.trim()}\`)`)

/** Curly quotes as straight ones. A tablet's keyboard curls them as you type, and code copied out
 * of a document often has them. A compiler would refuse them, but that slip isn't what a step teaches */
export const straightQuotes = (code: string) => code.replace(/[“”]/g, '"').replace(/[‘’]/g, "'")

/** Whether the file holds a piece of code, such as a block of the lesson, judged the way a build is:
 * whitespace, blank lines and comments aside, curly quotes as straight ones, any text in `msg!`.
 * Its lines have to come in a row, in the same order */
export function holds(file: string, snippet: string): boolean {
  const want = lines(straightQuotes(snippet)).filter(Boolean)
  if (want.length === 0) return false
  const have = lines(straightQuotes(file)).filter(Boolean)
  for (let i = 0; i + want.length <= have.length; i++) if (want.every((l, k) => have[i + k] === l)) return true
  return false
}

/** A line as Type it myself compares it: read the way a build is, and a trailing semicolon left off
 * or added is no reason to call the answer wrong */
const loose = (line: string) => norm(straightQuotes(line)).replace(/;+$/, "")

/** The 1-based line of the file that holds the answer's key line, the one line the learner types for
 * the question, or null. A line may say more around it, `const txHash = ` before the call, say */
export function typedKey(file: string, key: string): number | null {
  const want = loose(key)
  if (!want) return null
  const i = uncomment(straightQuotes(file)).split("\n").findIndex((l) => loose(l).includes(want))
  return i === -1 ? null : i + 1
}

/** The block with the learner's own words in its `msg!` line, when their typed line has one with as
 * many `{}`: the assistant fills in the rest, it doesn't change what they wrote */
export function withOwnText(block: string, typed: string) {
  const MSG = /msg!\(\s*"((?:[^"\\]|\\.)*)"/
  const own = straightQuotes(typed).match(MSG)?.[1]
  if (own === undefined) return block
  return block.replace(MSG, (m, text: string) => (text.split("{}").length === own.split("{}").length ? `msg!("${own}"` : m))
}

/** What a program's `msg!` logs, with each `{}` filled by `name` as Anchor would. Without a name
 * it's the step 3 line, Hello, World!, whatever the file says now. Read from the first `msg!`
 * that isn't commented out, so code written by hand speaks for itself */
export function helloSays(lib: string, name: string | null): string {
  const text = uncomment(straightQuotes(lib)).match(/msg!\(\s*"((?:[^"\\]|\\.)*)"/)?.[1]
  if (!text || (name === null && text.includes("{}"))) return "Hello, World!"
  // A function, so a name with $& in it stays as typed
  return name === null ? text : text.replaceAll("{}", () => name)
}

/** The line of the file the first `msg!` sits on, comments aside, for the peek that shows it */
export const msgLine = (lib: string) => lineOf(lib, "msg!")

/** `start` is the file as the step found it, so a build before any change can say just that */
export function checkOwn(written: string, target: string, file: string, start?: string): OwnCheck {
  const code = straightQuotes(written)
  const mine = lines(code)
  const want = lines(target)
  if (mine.join("") === want.join("")) return { ok: true }

  const rust = file.endsWith(".rs")
  const head = rust ? ["$ anchor build", "Compiling hello_anchor v0.1.0"] : [`$ run ${file}`, "Running client..."]
  // Every reason starts the same way, so the status line reads alike whatever went wrong
  const failed = rust ? "Build failed" : "Run failed"
  const bare = uncomment(code)

  if (target.includes("struct Hello") && bare.includes("Context<Hello>") && !/struct\s+Hello\b/.test(bare)) {
    const line = lineOf(code, "Context<Hello>")
    // rustc points at the missing type itself, the Hello inside the brackets
    const column = bare.split("\n")[line - 1].indexOf("Context<Hello>") + "Context<".length + 1
    return {
      ok: false,
      line,
      column,
      span: "Hello".length,
      log: [...head, "error[E0412]: cannot find type `Hello` in this scope", ` --> ${file}:${line}:${column}`, "Build failed"],
      reason: `${failed}: \`Context<Hello>\` on line ${line} needs a \`Hello\` struct.`,
      explain:
        "In Anchor every instruction receives its accounts through a struct marked `#[derive(Accounts)]`. Your `hello` asks for `Context<Hello>`, but `Hello` is never declared. `hello` reads no accounts, so an empty struct is enough.",
    }
  }

  if (target.includes("Ok(())") && bare.includes("Result<()>") && !bare.includes("Ok(())")) {
    const line = lineOf(code, "Result<()>")
    return {
      ok: false,
      line,
      log: [...head, "error[E0308]: mismatched types", ` --> ${file}:${line}`, "expected `Result<()>`, found `()`", "Build failed"],
      reason: `${failed}: line ${line} promises a \`Result\`, but the function never returns one.`,
      explain:
        "Your `hello` says it returns `Result<()>`, but its last line is `msg!`, which returns nothing. End the function with `Ok(())` to tell Anchor the instruction worked.",
    }
  }

  // The struct is there but not marked: Context<Hello> needs Hello to list accounts
  if (target.includes("#[derive(Accounts)]") && /struct\s+Hello\b/.test(bare) && !/#\[\s*derive\s*\(\s*Accounts\s*\)\s*\]/.test(bare) && bare.includes("Context<Hello>")) {
    const line = lineOf(code, "Context<Hello>")
    const column = bare.split("\n")[line - 1].indexOf("Context<Hello>") + 1
    return {
      ok: false,
      line,
      column,
      span: "Context<Hello>".length,
      log: [...head, "error[E0277]: the trait bound `Hello: Accounts<'_>` is not satisfied", ` --> ${file}:${line}:${column}`, "Build failed"],
      reason: `${failed}: \`Hello\` on line ${lineOf(code, "struct Hello")} isn't marked \`#[derive(Accounts)]\`.`,
      explain:
        "`Context<Hello>` needs `Hello` to be a list of accounts, and `#[derive(Accounts)]` is what makes a struct one. Your `struct Hello` is there without it, so put `#[derive(Accounts)]` on the line above it.",
    }
  }

  // A `msg!` with more or fewer values than its text has `{}`: rustc's own format check
  for (const [i, row] of bare.split("\n").entries()) {
    const m = row.match(/msg!\(\s*"((?:[^"\\]|\\.)*)"\s*((?:,[^)]*)?)\)/)
    if (!m) continue
    const holes = m[1].split("{}").length - 1
    const given = m[2].trim() ? m[2].split(",").length - 1 : 0
    if (holes === given) continue
    const line = i + 1
    const column = row.indexOf("msg!") + 1
    const error =
      holes > given
        ? `${holes} positional argument${holes === 1 ? "" : "s"} in format string, but ${given === 0 ? "no arguments were" : `${given} ${given === 1 ? "argument was" : "arguments were"}`} given`
        : `${given === 1 ? "argument never used" : "multiple unused formatting arguments"}`
    return {
      ok: false,
      line,
      column,
      span: row.trimEnd().length - column + 1,
      log: [...head, `error: ${error}`, ` --> ${file}:${line}:${column}`, "Build failed"],
      reason: `${failed}: the \`msg!\` on line ${line} has ${holes} \`{}\` and ${given} value${given === 1 ? "" : "s"} to fill ${holes === 1 ? "it" : "them"}.`,
      explain:
        holes > given
          ? `Each \`{}\` in a \`msg!\` text takes the next value after the text. Line ${line} has ${holes} and ${given === 0 ? "no values" : given}, so the compiler has nothing to put in. Add \`, name\` after the text, or take the \`{}\` out.`
          : `Line ${line} passes a value to \`msg!\`, but its text has no \`{}\` to put it in. Add \`{}\` where it should go, or drop the value.`,
    }
  }

  // The rest share one shape: a line to point at, said in the log the way a compiler would
  const fail = (line: number, error: string, reason: string, explain: string, column?: number, span?: number): OwnCheck => ({
    ok: false,
    line,
    column,
    span,
    log: [...head, `${rust ? "error" : "Error"}: ${error}`, ` --> ${file}:${line}${column ? `:${column}` : ""}`, rust ? "Build failed" : "Run failed"],
    reason,
    explain,
  })

  if (mine.every((l) => l === ""))
    return fail(
      1,
      "the file has no code in it",
      `${failed}: the file is empty, so there is nothing to ${rust ? "build" : "run"}.`,
      "There is no code in the file yet. Follow the lesson, or review the fix to see the lines this step needs."
    )

  // Built as the step found it: the old line isn't wrong, it just hasn't changed yet, so point at
  // the first one the step changes
  if (start !== undefined && sameCode(code, straightQuotes(start))) {
    const at = mine.findIndex((l, i) => l !== want[i])
    const line = at === -1 ? 1 : at + 1
    return fail(
      line,
      "nothing in the file has changed yet",
      `${failed}: nothing in the file has changed yet. This step starts at line ${line}.`,
      `The file is still as the last step left it. This step changes line ${line}. Follow the lesson, or review the fix to see the lines it needs.`
    )
  }

  // A line the step has nowhere is the one to look at
  const known = new Set(want)
  const extra = mine.findIndex((l) => l !== "" && !known.has(l))
  if (extra !== -1) {
    const line = extra + 1
    const row = bare.split("\n")[extra]
    // A word on a line of its own, BROKEN say, is what the compiler can name exactly: where it stands
    // decides the error, an item's place or a statement's inside a function
    const word = row
      .trim()
      .match(/^[A-Za-z_]\w*;?$/)?.[0]
      .replace(/;$/, "")
    if (word && !["pub", "fn", "mod", "use", "struct", "let", "const"].includes(word)) {
      const column = row.indexOf(word) + 1
      const depth = bare
        .split("\n")
        .slice(0, extra)
        .join("\n")
        .split("")
        .reduce((d, c) => d + (c === "{" ? 1 : c === "}" ? -1 : 0), 0)
      const inside = rust ? depth >= 2 : true
      const error = !rust ? `TS2304: Cannot find name '${word}'.` : inside ? `cannot find value \`${word}\` in this scope` : `expected item, found \`${word}\``
      return {
        ok: false,
        line,
        column,
        span: word.length,
        log: [
          ...head,
          rust && inside ? `error[E0425]: ${error}` : rust ? `error: ${error}` : `error ${error}`,
          ` --> ${file}:${line}:${column}`,
          rust ? "Build failed" : "Run failed",
        ],
        reason: `${failed}: \`${word}\` on line ${line} isn't ${rust && !inside ? "a declaration" : "declared anywhere"}.`,
        explain:
          rust && !inside
            ? `Outside a function the compiler only expects declarations: \`use\`, \`fn\`, \`struct\`, \`mod\`. \`${word}\` on line ${line} is none of them, so it stops there. If it's a slip, delete it.`
            : `\`${word}\` on line ${line} isn't declared anywhere in ${file.split("/").pop()}, so the compiler can't tell what it is. If it's a slip, delete it. If you meant something by it, compare the line with the lesson.`,
      }
    }
    // Anything else is a line the lesson's check doesn't know. The prototype has no compiler to say
    // more, so it says it's the lesson speaking, not rustc
    return fail(
      line,
      `lesson check: line ${line} isn't in the code this step ${rust ? "builds" : "runs"}`,
      `${failed}: line ${line} isn't in the code this step ${rust ? "builds" : "runs"}${quote(code.split("\n")[extra])}.`,
      `This one comes from the lesson's check, not the compiler: line ${line} isn't in the code this step ${rust ? "builds" : "runs"}. Compare it with the lesson, or review the fix to see the exact lines.`,
      row.search(/\S/) + 1,
      row.trim().length
    )
  }

  // Every line belongs, so one the step needs is missing, or they're in another order
  const have = new Set(mine)
  const gone = want.findIndex((l) => l !== "" && !have.has(l))
  if (gone !== -1) {
    const line = Math.min(gone + 1, mine.length)
    return fail(
      line,
      "a line this step needs is missing",
      `${failed}: a line this step needs is missing${quote(target.split("\n")[gone])}.`,
      "Everything you wrote belongs to this step, but a line it needs isn't there yet. Compare your code with the lesson, or review the fix to see where it goes."
    )
  }
  return fail(
    1,
    "the lines are out of order",
    `${failed}: the lines are all there, but not in the order this step needs.`,
    "Your code has every line this step needs, in a different order, and the order matters. Compare it with the lesson, or review the fix to see it laid out."
  )
}

/** Where a lesson block sits in the code the step builds: the first and last line it takes there,
 * 0-based, matched the way `holds` reads code. Null when the block isn't part of it */
function placeIn(reference: string[], block: string[]): [number, number] | null {
  const want = block.filter(Boolean)
  if (want.length === 0) return null
  const at = reference.map((l, i) => [l, i] as const).filter(([l]) => l !== "")
  for (let i = 0; i + want.length <= at.length; i++)
    if (want.every((l, k) => at[i + k][0] === l)) return [at[i][1], at[i + want.length - 1][1]]
  return null
}

/** The file with a lesson block put in where the step's code has it, for Add to file. `reference`
 * is the code the lesson builds up to. The file is rebuilt from it, keeping each line the file
 * already has and the block's own, so blocks land in order whatever order they're added in and a
 * line the block replaces goes. `start` is the file as the step found it: its lines may go, being the
 * ones the step changes. Code neither knows, typed by hand, would be lost that way, so then the block
 * goes at the end instead. Returns the new file and the lines the block took, counted from 1 */
export function insertBlock(file: string, block: string, reference: string | undefined, start = ""): { code: string; lines: number[] } {
  const append = () => {
    const head = file.replace(/\s+$/, "")
    const code = head ? `${head}\n\n${block}` : block
    const from = head ? head.split("\n").length + 2 : 1
    return { code, lines: block.split("\n").map((_, i) => from + i) }
  }
  if (!reference) return append()
  const ref = reference.split("\n")
  const refNorm = lines(reference)
  const place = placeIn(refNorm, lines(straightQuotes(block)))
  const mine = lines(straightQuotes(file)).filter(Boolean)
  const known = new Set([...refNorm, ...lines(start)])
  if (!place || mine.some((l) => !known.has(l))) return append()

  const have = new Set(mine)
  const kept = (i: number) => (i >= place[0] && i <= place[1]) || (refNorm[i] !== "" && have.has(refNorm[i]))
  // A comment goes with the line under it, and a blank line stays only between two kept lines
  const keep = ref.map((_, i) => kept(i))
  const own = ref.map((_, i) => i >= place[0] && i <= place[1])
  for (let i = ref.length - 2; i >= 0; i--)
    if (refNorm[i] === "" && ref[i].trim() !== "" && keep[i + 1]) {
      keep[i] = true
      own[i] = own[i + 1]
    }
  const out: string[] = []
  const taken: number[] = []
  let gap = false
  ref.forEach((line, i) => {
    if (!keep[i]) {
      if (ref[i].trim() === "" && out.length) gap = true
      return
    }
    if (gap && out[out.length - 1] !== "") out.push("")
    gap = false
    if (line.trim() === "" && out[out.length - 1] === "") return
    out.push(line)
    if (own[i]) taken.push(out.length)
  })
  while (out[out.length - 1] === "") out.pop()
  return { code: out.join("\n"), lines: taken }
}

/** The fix for a file: the code the step needs, with what the learner wrote kept wherever it already
 * matches. A line they have is kept as they typed it, its comment and its `msg!` text included, and a
 * comment of theirs goes in above the line it sat over. Only lines the step doesn't have are left out */
export function fixOf(file: string, target: string): string {
  const mine = file.split("\n")
  const mineNorm = lines(straightQuotes(file))
  const want = target.split("\n")
  const wantNorm = lines(target)
  const out: string[] = []
  let notes: string[] = []
  let next = 0
  mine.forEach((row, i) => {
    if (mineNorm[i] === "") {
      // A line of comment alone waits for the code under it; a blank one is the target's to place
      if (row.trim() !== "") notes.push(row)
      return
    }
    const at = wantNorm.findIndex((l, k) => k >= next && l === mineNorm[i])
    if (at === -1) return
    out.push(...want.slice(next, at), ...notes, row)
    notes = []
    next = at + 1
  })
  out.push(...want.slice(next), ...notes)
  return out.join("\n")
}
