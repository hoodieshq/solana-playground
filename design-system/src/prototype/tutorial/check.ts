import type { Fail } from "./data"

/** What a build of hand-written code finds. The prototype has no compiler, so it compares the
 * file with what the step needs, ignoring what a compiler would ignore or let through, and names
 * the two slips newcomers make most */
export type OwnCheck = { ok: true } | (Fail & { explain: string })

const squash = (code: string) => code.replace(/\s+/g, "")

/** Whether two versions of a file differ only in whitespace, which no build would notice */
export const sameCode = (a: string, b: string) => squash(a) === squash(b)

// A string first, so a // inside one isn't taken for a comment, then either kind of comment
const COMMENT = /("(?:[^"\\\n]|\\.)*"|`(?:[^`\\]|\\.)*`)|\/\/[^\n]*|\/\*[\s\S]*?\*\//g

/** The code without its comments. A comment that spans lines leaves its line breaks behind, so
 * every line keeps its number for the error that points at it */
function uncomment(code: string) {
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

export function checkOwn(written: string, target: string, file: string): OwnCheck {
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

  // The rest share one shape: a line to point at, said in the log the way a compiler would
  const fail = (line: number, error: string, reason: string, explain: string): OwnCheck => ({
    ok: false,
    line,
    log: [...head, `${rust ? "error" : "Error"}: ${error}`, ` --> ${file}:${line}`, rust ? "Build failed" : "Run failed"],
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

  // A line the step has nowhere is the one to look at
  const known = new Set(want)
  const extra = mine.findIndex((l) => l !== "" && !known.has(l))
  if (extra !== -1) {
    const line = extra + 1
    return fail(
      line,
      `line ${line} isn't part of this step`,
      `${failed}: line ${line} isn't part of this step${quote(code.split("\n")[extra])}.`,
      `Line ${line} isn't in the code this step builds. Compare it with the lesson, or review the fix to see the exact lines this step needs.`
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
