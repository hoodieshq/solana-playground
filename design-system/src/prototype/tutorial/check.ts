import type { Fail } from "./data"

/** What a build of hand-written code finds. The prototype has no compiler, so it compares the
 * file with what the step needs, whitespace aside, and names the two slips newcomers make most */
export type OwnCheck = { ok: true } | (Fail & { explain: string })

const squash = (code: string) => code.replace(/\s+/g, "")

/** The 1-based line that holds `needle`, or 1 */
function lineOf(code: string, needle: string) {
  const i = code.split("\n").findIndex((l) => l.includes(needle))
  return i === -1 ? 1 : i + 1
}

export function checkOwn(code: string, target: string, file: string): OwnCheck {
  if (squash(code) === squash(target)) return { ok: true }
  const rust = file.endsWith(".rs")
  const head = rust ? ["$ anchor build", "Compiling hello_anchor v0.1.0"] : [`$ run ${file}`, "Running client..."]

  if (target.includes("struct Hello") && code.includes("Context<Hello>") && !/struct\s+Hello\b/.test(code)) {
    const line = lineOf(code, "Context<Hello>")
    return {
      ok: false,
      line,
      log: [...head, "error[E0412]: cannot find type `Hello` in this scope", ` --> ${file}:${line}`, "Build failed"],
      reason: `Line ${line} uses Context<Hello>, but there is no Hello struct in the file yet.`,
      explain:
        "In Anchor every instruction receives its accounts through a struct marked `#[derive(Accounts)]`. Your `hello` asks for `Context<Hello>`, but `Hello` is never declared. `hello` reads no accounts, so an empty struct is enough.",
    }
  }

  if (target.includes("Ok(())") && code.includes("Result<()>") && !code.includes("Ok(())")) {
    const line = lineOf(code, "Result<()>")
    return {
      ok: false,
      line,
      log: [...head, "error[E0308]: mismatched types", ` --> ${file}:${line}`, "expected `Result<()>`, found `()`", "Build failed"],
      reason: `Line ${line} promises a Result, but the function never returns one.`,
      explain:
        "Your `hello` says it returns `Result<()>`, but its last line is `msg!`, which returns nothing. End the function with `Ok(())` to tell Anchor the instruction worked.",
    }
  }

  // Otherwise point at the first line the target doesn't have
  const known = new Set(target.split("\n").map(squash))
  const i = code.split("\n").findIndex((l) => squash(l) !== "" && !known.has(squash(l)))
  return {
    ok: false,
    line: i === -1 ? 1 : i + 1,
    log: [...head, rust ? "error: the build didn't produce what this step needs" : "Error: the client didn't get a transaction back", rust ? "Build failed" : "Run failed"],
    reason: "Your code doesn't match what this step needs yet.",
    explain:
      "Something in your code differs from what this step checks for. Compare it with the lesson, or review the fix to see the exact lines this step needs.",
  }
}
