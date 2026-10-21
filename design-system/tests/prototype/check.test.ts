import assert from "node:assert/strict"
import { test } from "node:test"

import { checkOwn, helloSays, holds, msgLine } from "../../src/prototype/tutorial/check.ts"

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

test("comments are ignored, on their own lines and after code", () => {
  const commented = `// Import anchor\n${TARGET.replace("Ok(())", "Ok(()) // done").replace("#[program]", "/* the program */\n#[program]")}`
  assert.deepEqual(checkOwn(commented, TARGET, "src/lib.rs"), { ok: true })
})

test("pub mod is the same program as mod", () => {
  assert.deepEqual(checkOwn(TARGET.replace("mod hello_anchor", "pub mod hello_anchor"), TARGET, "src/lib.rs"), { ok: true })
})

test("msg! can say anything", () => {
  assert.deepEqual(checkOwn(TARGET.replace('msg!("Hello, World!");', 'msg!("Hi there, {{friend}}");'), TARGET, "src/lib.rs"), { ok: true })
})

test("msg! still needs a {} for each value it logs", () => {
  const named = TARGET.replace('msg!("Hello, World!");', 'msg!("Hello, {}!", name);')
  assert.deepEqual(checkOwn(named.replace('"Hello, {}!"', '"Hey {}"'), named, "src/lib.rs"), { ok: true })
  assert.equal(checkOwn(named.replace('"Hello, {}!"', '"Hey"'), named, "src/lib.rs").ok, false)
})

test("a commented out struct still counts as missing", () => {
  const r = checkOwn(TARGET.replace("pub struct Hello {}", "// pub struct Hello {}"), TARGET, "src/lib.rs")
  assert.equal(r.ok, false)
  if (r.ok) return
  assert.match(r.log.join("\n"), /E0412/)
})

test("a line the step doesn't have is named in the error", () => {
  const r = checkOwn(TARGET.replace("        Ok(())", '        let x = 1;\n        Ok(())'), TARGET, "src/lib.rs")
  assert.equal(r.ok, false)
  if (r.ok) return
  assert.equal(r.line, 11)
  assert.equal(r.reason, "Build failed: line 11 isn't part of this step (`let x = 1;`).")
  assert.match(r.log.join("\n"), /src\/lib\.rs:11/)
})

test("a missing line is quoted", () => {
  const r = checkOwn(TARGET.replace("    use super::*;\n", ""), TARGET, "src/lib.rs")
  assert.equal(r.ok, false)
  if (r.ok) return
  assert.equal(r.reason, "Build failed: a line this step needs is missing (`use super::*;`).")
})

test("an empty file says so", () => {
  for (const empty of ["", "// Import anchor"]) {
    const r = checkOwn(empty, TARGET, "src/lib.rs")
    assert.equal(r.ok, false)
    if (r.ok) return
    assert.equal(r.line, 1)
    assert.equal(r.reason, "Build failed: the file is empty, so there is nothing to build.")
  }
})

test("the client passes without its comment", () => {
  const call = `// Call the hello instruction
const txHash = await pg.program.methods.hello().rpc();
console.log(\`Use 'solana confirm -v \${txHash}' to see the logs\`);`
  assert.deepEqual(checkOwn(call.split("\n").slice(1).join("\n"), call, "client/client.ts"), { ok: true })
})

test("the client runs instead of building", () => {
  const r = checkOwn("", "const txHash = await pg.program.methods.hello().rpc();", "client/client.ts")
  assert.equal(r.ok, false)
  if (r.ok) return
  assert.equal(r.log[0], "$ run client/client.ts")
  assert.match(r.reason, /^Run failed: /)
})

test("curly quotes count as straight ones", () => {
  const curly = TARGET.replace('"11111111111111111111111111111111"', "“11111111111111111111111111111111”").replace('"Hello, World!"', "“Hello, World!”")
  assert.deepEqual(checkOwn(curly, TARGET, "src/lib.rs"), { ok: true })
  const call = "console.log(‘hi’);"
  assert.deepEqual(checkOwn(call, "console.log('hi');", "client/client.ts"), { ok: true })
})

test("every reason starts with what failed, and none asks to type", () => {
  const cases = [NO_STRUCT, NO_OK, "", TARGET.replace("    use super::*;\n", ""), TARGET.split("\n").reverse().join("\n")]
  for (const code of cases) {
    const r = checkOwn(code, TARGET, "src/lib.rs")
    assert.equal(r.ok, false)
    if (r.ok) return
    assert.match(r.reason, /^Build failed: /)
    assert.doesNotMatch(r.explain, /\btype (the|it|your)\b/i)
  }
})

test("E0412 points at the Hello inside Context<Hello>", () => {
  const r = checkOwn(NO_STRUCT, TARGET, "src/lib.rs")
  assert.equal(r.ok, false)
  if (r.ok) return
  assert.equal(r.column, 32)
  assert.equal(r.span, 5)
  assert.match(r.log.join("\n"), /src\/lib\.rs:9:32/)
})

test("a lesson block is held whatever the whitespace, comments and quotes", () => {
  const block = `#[program]
mod hello_anchor {
    use super::*;

    pub fn hello(_ctx: Context<Hello>) -> Result<()> {
        msg!("Hello, World!");
        Ok(())
    }
}`
  assert.equal(holds(TARGET, block), true)
  assert.equal(holds(TARGET.replaceAll("    ", "  ").replace("Ok(())", "Ok(()) // done"), block), true)
  assert.equal(holds(TARGET.replace('"Hello, World!"', "“Hi”"), block), true)
  assert.equal(holds(NO_OK, block), false)
  assert.equal(holds("", block), false)
  assert.equal(holds(TARGET, ""), false)
})

test("a held block needs its lines in a row", () => {
  assert.equal(holds("use anchor_lang::prelude::*;\nlet x = 1;\nOk(())", "use anchor_lang::prelude::*;\nOk(())"), false)
  assert.equal(holds("let x = 1;\nuse anchor_lang::prelude::*;\n\nOk(())", "use anchor_lang::prelude::*;\nOk(())"), true)
})

test("hello says what its msg! says, with the name filled in", () => {
  const named = TARGET.replace('msg!("Hello, World!");', 'msg!("Hello, {}!", name);')
  assert.equal(helloSays(TARGET, null), "Hello, World!")
  assert.equal(helloSays(named, "Almaz"), "Hello, Almaz!")
  assert.equal(helloSays(named, "$& co"), "Hello, $& co!")
  // Saved before step 4 asked for a name: the step 3 line
  assert.equal(helloSays(named, null), "Hello, World!")
  assert.equal(helloSays(TARGET.replace('"Hello, World!"', '"Hi there"'), null), "Hi there")
  assert.equal(helloSays(TARGET.replace('msg!("Hello, World!");', '// msg!("Nope");\n        msg!("Yes");'), null), "Yes")
  assert.equal(helloSays("", null), "Hello, World!")
  assert.equal(msgLine(TARGET), 10)
})
