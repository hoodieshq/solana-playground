import assert from "node:assert/strict"
import { test } from "node:test"

import { checkOwn } from "../../src/prototype/tutorial/check.ts"

// The step 1 target, the same text as LIB_FIXED in data.ts
const TARGET = `use anchor_lang::prelude::*;

declare_id!("11111111111111111111111111111111");

#[program]
mod hello_anchor {
    use super::*;

    pub fn hello(_ctx: Context<Hello>) -> Result<()> {
        msg!("Hello, World!");
        Ok(())
    }
}

#[derive(Accounts)]
pub struct Hello {}`

const NO_STRUCT = TARGET.slice(0, TARGET.indexOf("\n\n#[derive(Accounts)]"))
const NO_OK = TARGET.replace("        Ok(())\n", "")

test("matches the target whatever the whitespace", () => {
  const loose = TARGET.replaceAll("    ", "  ").replace("\n\n#[program]", "\n#[program]")
  assert.deepEqual(checkOwn(loose, TARGET, "src/lib.rs"), { ok: true })
})

test("a missing Hello struct is E0412 on the line that asks for it", () => {
  const r = checkOwn(NO_STRUCT, TARGET, "src/lib.rs")
  assert.equal(r.ok, false)
  if (r.ok) return
  assert.equal(r.line, 9)
  assert.match(r.log.join("\n"), /E0412/)
  assert.match(r.explain, /#\[derive\(Accounts\)\]/)
})

test("a missing Ok(()) is E0308 on the signature line", () => {
  const r = checkOwn(NO_OK, TARGET, "src/lib.rs")
  assert.equal(r.ok, false)
  if (r.ok) return
  assert.equal(r.line, 9)
  assert.match(r.log.join("\n"), /E0308/)
  assert.match(r.explain, /Ok\(\(\)\)/)
})

test("anything else is the step's general error on the first line that differs", () => {
  const r = checkOwn(TARGET.replace('msg!("Hello, World!");', 'msg!("Hi");'), TARGET, "src/lib.rs")
  assert.equal(r.ok, false)
  if (r.ok) return
  assert.equal(r.line, 10)
  assert.equal(r.reason, "Your code doesn't match what this step needs yet.")
})

test("an untouched file fails on line 1", () => {
  const r = checkOwn("// Import anchor", TARGET, "src/lib.rs")
  assert.equal(r.ok, false)
  if (r.ok) return
  assert.equal(r.line, 1)
})

test("the client runs instead of building", () => {
  const r = checkOwn("// Client code...", "const txHash = await pg.program.methods.hello().rpc();", "client/client.ts")
  assert.equal(r.ok, false)
  if (r.ok) return
  assert.equal(r.log[0], "$ run client/client.ts")
})
