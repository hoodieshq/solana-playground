import { holds, lineOf } from "../check"
import type { State } from "../store"
import { CLIENT, LIB } from "./common"
import { rollOf, slotAt, slotText } from "./games"
import { SYSTEM_CPI, noSystemProgram, payerNotMut, sentSoFar, signatureOf } from "./records"
import type { Lesson, Rec, RecSend, Sent, SpecialCheck, Step, Tx } from "./types"

// Boss Battle: one boss every player hits, an account at the PDA "boss". Step 1 rolls damage from the
// slot with XORShift (the planned failure: `?` in a helper that returns a plain `u64`), step 2 hits the
// boss down to 0 with `saturating_sub`, step 3 has the client work out the next hits before they land.
// After Jonas Hahn and John's Boss Battle. The game card in its `boss` view: health, rolls, next hits

const PROGRAM_ID = "jmDRqbH5jwfRhXF7TwDZB5fBBwM9qK7dTBXhFd5wVFHs"
const IDL_ACCOUNT = "1VRfHZwsRh7XBRMFMMKFqu1sj1DoBoPdXhwh1hhfy315"
/** The boss's address: the PDA from "boss", one for everyone */
const BOSS_PDA = "PyqoMMTbuXq7qHu57PFwKZjydFdKMKFDyH13jMXMRZ1K"
const RESPAWN_SIGNATURE = "KDKu9q7RZ7ju3KKP3fFqhwVXHVDmsBXfmswsBsf1XbTRj7BK1sh9qVuyPysZjRDDs3q7RwhX5ubBX759HH9yRqHB"

/** The boss's rent: 16 bytes, (128 + 16) × 6,960 lamports */
const RENT = 0.00100224
const MAX_HEALTH = 1000

// The program, piece by piece, in the order it sits in lib.rs

const BOIL = `use anchor_lang::prelude::*;

declare_id!("11111111111111111111111111111111");

const MAX_HEALTH: u64 = 1000;
const MAX_DAMAGE: u64 = 500;`

const RESPAWN_FN = `    pub fn respawn(ctx: Context<Respawn>) -> Result<()> {
        ctx.accounts.boss.health = MAX_HEALTH;
        msg!("The boss is back with {} health.", MAX_HEALTH);
        Ok(())
    }`

const ATTACK_FN = `    pub fn attack(ctx: Context<Attack>) -> Result<()> {
        let boss = &mut ctx.accounts.boss;
        if boss.health == 0 {
            return err!(ErrorCode::BossDefeated);
        }
        let damage = roll_damage()?;
        boss.health = boss.health.saturating_sub(damage);
        msg!("You hit the boss for {}. {} health left.", damage, boss.health);
        Ok(())
    }`

const ROLL_FIXED = `fn roll_damage() -> Result<u64> {
    let slot = Clock::get()?.slot;
    Ok(xorshift64(slot) % MAX_DAMAGE)
}`

const ROLL_BROKEN = `fn roll_damage() -> u64 {
    let slot = Clock::get()?.slot;
    xorshift64(slot) % MAX_DAMAGE
}`

const roll = (fixed: boolean) => `/// One damage roll, seeded by the slot the attack lands in
${fixed ? ROLL_FIXED : ROLL_BROKEN}

/// Marsaglia's xorshift64: three shifts and XORs scramble the seed's bits
fn xorshift64(seed: u64) -> u64 {
    let mut x = seed;
    x ^= x << 13;
    x ^= x >> 7;
    x ^= x << 17;
    x
}`

const RESPAWN = `#[derive(Accounts)]
pub struct Respawn<'info> {
    #[account(
        init_if_needed,
        payer = player,
        space = 8 + Boss::INIT_SPACE,
        seeds = [b"boss"],
        bump,
    )]
    pub boss: Account<'info, Boss>,
    #[account(mut)]
    pub player: Signer<'info>,
    pub system_program: Program<'info, System>,
}`

const ATTACK = `#[derive(Accounts)]
pub struct Attack<'info> {
    #[account(mut, seeds = [b"boss"], bump)]
    pub boss: Account<'info, Boss>,
}`

const BOSS = `#[account]
#[derive(InitSpace)]
pub struct Boss {
    pub health: u64,
}`

const ERRORS = `#[error_code]
pub enum ErrorCode {
    #[msg("The boss is down. Respawn it to attack again")]
    BossDefeated,
}`

type Parts = { boss?: boolean; roll?: "broken" | "fixed"; err?: boolean; attack?: boolean; accounts?: boolean }

const moduleOf = (attack: boolean) => `#[program]\nmod boss_battle {\n    use super::*;\n\n${[RESPAWN_FN, ...(attack ? [ATTACK_FN] : [])].join("\n\n")}\n}`

/** lib.rs with the pieces written so far, each in its place */
function lib(p: Parts) {
  return [BOIL, p.boss && moduleOf(!!p.attack), p.roll && roll(p.roll === "fixed"), p.boss && RESPAWN, p.accounts && ATTACK, p.boss && BOSS, p.err && ERRORS].filter(Boolean).join("\n\n")
}

const S1 = { boss: true, roll: "fixed" } as const
const LIB_BROKEN = lib({ ...S1, roll: "broken" })
const LIB_S1 = lib(S1)
const LIB_S2 = lib({ ...S1, err: true, attack: true, accounts: true })

/** The client of step 3: the program's roll in TypeScript, and the next five slots */
const CLIENT_CODE = [
  "// The program's damage roll in TypeScript: the same three shifts and XORs.",
  "// BigInt, because a JavaScript number can't hold 64 bits",
  "const MAX_DAMAGE = 500n;",
  "const MASK = (1n << 64n) - 1n;",
  "",
  "function xorshift64(seed: bigint): bigint {",
  "  let x = seed;",
  "  x ^= (x << 13n) & MASK;",
  "  x ^= x >> 7n;",
  "  x ^= (x << 17n) & MASK;",
  "  return x;",
  "}",
  "",
  '// "processed": the newest slot this node has seen, so the next ones are still to come',
  'const now = await pg.connection.getSlot("processed");',
  "console.log(`Slot now: ${now}`);",
  "for (let slot = now + 1; slot <= now + 5; slot++) {",
  "  console.log(`slot ${slot}: ${xorshift64(BigInt(slot)) % MAX_DAMAGE} damage`);",
  "}",
].join("\n")

/** The `?` the planned failure points at */
const TRY_LINE = LIB_BROKEN.split("\n").findIndex((l) => l.trim() === "let slot = Clock::get()?.slot;") + 1

const EXPLAIN_ERROR =
  "`Clock::get()` can fail, so it returns a `Result`. `?` takes the clock out of it, or returns the error to whoever called. `roll_damage` returns a plain `u64`, so there's nowhere for that error to go."

const STEPS: Step[] = [
  {
    id: "roll",
    title: "Roll the damage",
    short: "Roll",
    objective: "Roll damage on chain from the slot",
    learned: "A program can't roll dice: it scrambles a number every validator agrees on, the slot, with XORShift",
    file: LIB,
    start: "",
    target: LIB_S1,
    goal: "build",
    beats: [
      {
        kind: "write",
        id: "s1.boil",
        text: "The opening and the game's two numbers: the boss starts at 1000 health, and one hit does up to 499.",
        writes: { file: LIB, block: BOIL, ref: lib({}) },
      },
      {
        kind: "write",
        id: "s1.boss",
        text: 'The boss is an account, one for everyone at the seed `"boss"`, the way Lumberjack kept a player. `respawn` creates it the first time and puts it back to full health after: that\'s what `init_if_needed` is for.',
        writes: { file: LIB, block: `${moduleOf(false)}\n\n${RESPAWN}\n\n${BOSS}`, ref: lib({ boss: true }) },
      },
      {
        kind: "say",
        id: "s1.dice",
        text: "Now the damage. Every validator runs your attack and has to get the same result, so a program has no dice. It takes a number they all agree on and scrambles it: XORShift, three shifts and three XORs.",
      },
      {
        kind: "ask",
        id: "s1.q1",
        kicker: "Question",
        n: 1,
        question: "So what can `attack` use as a seed?",
        options: ["A random number from the machine, like `rand::random()`", "A number the player sends with the attack", "The slot the attack lands in, from `Clock`"],
        code: false,
        answer: 2,
        right: "Yes. Every validator sees the same slot, so they all roll the same damage. I've written `xorshift64` and `roll_damage`, which feeds it the slot.",
        why: [
          "Each validator would get a different number and they couldn't agree on the result. `rand` doesn't even build for Solana's target.",
          "Then every player sends the number that rolls 499.",
          null,
        ],
        hint: "It has to be the same for every validator, and not up to the player.",
        writes: { file: LIB, block: roll(false), ref: LIB_BROKEN },
        key: "let slot = Clock::get()?.slot;",
        typed: "That's the seed. I've written the roll around it, and `xorshift64` under it.",
      },
      {
        kind: "act",
        id: "s1.build",
        act: "build",
        say: "Let's compile the roll.",
        title: "Build lib.rs",
        context: "Compiles lib.rs on Playground's build server",
        button: "Build",
      },
    ],
    planned: "This one's on purpose. Everyone who reads the clock in a helper meets it, so let's meet it now.",
    plannedShort: `\`?\` on line ${TRY_LINE} passes an error up, and \`roll_damage\` returns a plain \`u64\` with no room for one.`,
    onFail: [
      { kind: "say", id: "f1.explain", text: EXPLAIN_ERROR, quote: { file: LIB, line: TRY_LINE, mark: "?", tone: "error" } },
      {
        kind: "ask",
        id: "f1.q",
        kicker: "Fix it",
        question: "So what should `roll_damage` return?",
        options: ["fn roll_damage() -> Result<u64> {", "fn roll_damage() -> Option<u64> {", "let slot = Clock::get().slot;"],
        code: true,
        answer: 0,
        right: "Exactly. Now `?` can hand an error up to `attack`, and the roll comes back as `Ok(...)`. I've wrapped the last line.",
        why: [
          null,
          "`Clock::get()` gives a `Result`, and `?` on a `Result` needs a function that returns one. `Option` fails the same way.",
          "Without `?` it's still a `Result`, and a `Result` has no `slot`: the next build stops on E0609.",
        ],
        hint: "The error says which return types accept `?`. Which one does `Clock::get()` give?",
        writes: { file: LIB, block: ROLL_FIXED, ref: LIB_S1, start: LIB_BROKEN },
        key: "fn roll_damage() -> Result<u64> {",
        typed: "That's the signature. I've wrapped the roll in `Ok(...)` to match it.",
      },
      {
        kind: "act",
        id: "f1.build",
        act: "build",
        say: "Build again.",
        title: "Build lib.rs",
        context: "Same build, `roll_damage` returns a `Result`",
        button: "Build",
      },
    ],
    win: {
      id: "s1.win",
      headline: "Your program can roll damage",
      line: "The slot goes in, a number from 0 to 499 comes out, the same on every validator. The IDL has one instruction so far, `respawn`: `attack` calls the roll in the next step.",
      stats: [
        { icon: "hammer", text: "Built in 1.6 s" },
        { icon: "braces", text: "1 instruction" },
        { icon: "clock", text: "{took}" },
      ],
    },
    explainStep:
      "This step writes the boss's account, `respawn`, and the roll: XORShift of the slot the attack lands in, the same on every validator. The first build fails on purpose, on `?` in a function that can't return an error.",
    chips: [
      {
        label: "How does XORShift work?",
        match: /\bxor ?shift\b|\bhow.*\broll\b/i,
        answer: "Each step XORs the number with a shifted copy of itself: left 13, right 7, left 17. Bits from every part of the seed end up everywhere, so slots next to each other give damage that looks unrelated.",
      },
      {
        label: "Doesn't `x << 13` overflow?",
        match: /\boverflow\b|<</i,
        answer: "No. Shifting a `u64` left drops the bits that fall off the top; Rust only refuses a shift of 64 or more.",
      },
    ],
    errorChips: [
      {
        label: "What does ? do?",
        match: /\bwhat does \?|question mark|\?\s*do\b/i,
        answer: "It unwraps a `Result`: the value if it's `Ok`, or an early return of the error if it isn't. So it only works inside a function that returns a `Result` too.",
      },
      {
        label: "Where is this in the docs?",
        match: /\b(docs?|documentation)\b/i,
        answer: 'The Rust book covers it in [Recoverable Errors with Result](https://doc.rust-lang.org/book/ch09-02-recoverable-errors-with-result.html), under "A Shortcut for Propagating Errors".',
      },
    ],
    answers: [{ match: /why.*(fail|error)/i, answer: EXPLAIN_ERROR, local: true }],
  },
  {
    id: "attack",
    title: "Attack",
    short: "Attack",
    objective: "Hit the boss until it falls",
    learned: "Arithmetic on chain must not go below zero: the last hit stops at 0 health instead of failing",
    file: LIB,
    start: LIB_S1,
    target: LIB_S2,
    goal: "move",
    beats: [
      {
        kind: "write",
        id: "s2.err",
        text: "First, a way to say no: once the boss is down, an attack is refused with `BossDefeated`, error 6000, the same kind of custom error as Lumberjack's `NotEnoughEnergy`.",
        writes: { file: LIB, block: ERRORS, ref: lib({ ...S1, err: true }) },
      },
      {
        kind: "say",
        id: "s2.what",
        text: "`attack` checks the boss is up, rolls, and takes the roll off its health. The roll goes up to 499, and the boss can have less than that left.",
      },
      {
        kind: "ask",
        id: "s2.q2",
        kicker: "Question",
        n: 2,
        question: "The roll can be bigger than the health left. What should `attack` do?",
        options: ["boss.health -= damage;", "boss.health = boss.health.saturating_sub(damage);", "boss.health = (boss.health - damage).max(0);"],
        code: true,
        answer: 1,
        right: "Right. `saturating_sub` stops at 0 instead of going under, so the last hit always lands. I've written `attack` around it.",
        why: [
          "When the roll is bigger than the health left, that goes below zero. A `u64` can't, and Playground builds with overflow checks, so the attack fails with `attempt to subtract with overflow` and the last hit never lands.",
          null,
          "The subtraction runs before `max`, so it overflows first. And a `u64` is never below 0, so `max(0)` changes nothing.",
        ],
        hint: "`health` is a `u64`. What happens to 332 minus 470?",
        writes: { file: LIB, block: ATTACK_FN, ref: lib({ ...S1, err: true, attack: true }) },
        key: "boss.health = boss.health.saturating_sub(damage);",
        typed: "That's the line. I've written the rest of `attack` around it.",
      },
      {
        kind: "write",
        id: "s2.accounts",
        text: "And `Attack`: the boss by its seeds, `mut` because the hit changes it. No signer: anyone can hit this boss.",
        writes: { file: LIB, block: ATTACK, ref: LIB_S2 },
      },
      {
        kind: "act",
        id: "s2.ship",
        act: "buildDeploy",
        say: "Build and deploy: the first deploy, so devnet gets the program for the first time.",
        title: "Build and deploy",
        context: "From your Playground wallet · free devnet SOL",
        button: "Build and deploy",
      },
      {
        kind: "act",
        id: "s2.respawn",
        act: "send",
        ix: "respawn",
        say: "Spawn the boss. The first respawn creates it: 1000 health, and a deposit for its 16 bytes.",
        title: "Spawn the boss",
        context: "Sends `respawn` · rent for 16 bytes and fee from your wallet",
        button: "Respawn",
        record: "Spawned the boss",
      },
      {
        kind: "act",
        id: "s2.attack",
        act: "move",
        say: "Attack. Each hit rolls its damage from the slot it lands in.",
        title: "Fight the boss",
        context: "Sends `attack` · fee from your wallet",
        button: "Attack",
        moves: [
          { ix: "attack", button: "Attack" },
          { ix: "respawn", button: "Respawn" },
        ],
        until: { label: "Attack until the boss falls", stop: "passed" },
        record: "Fought the boss",
      },
    ],
    win: {
      id: "s2.win",
      headline: "The boss is down",
      line: "{n} hits, each rolled from its own slot. The last rolled {d} against {h} health left, and `saturating_sub` stopped it at 0.",
      stats: [
        { icon: "zap", text: "{n} hits" },
        { icon: "cpu", text: "2,946 CU a hit" },
        { icon: "clock", text: "{took}" },
      ],
    },
    testWin: "You fought the boss from the Call panel until its health hit 0.",
    explainStep: "This step adds `attack`, which takes the roll off the boss's health and stops at 0 with `saturating_sub`, then fights the boss on devnet until it falls.",
    chips: [
      {
        label: "Can anyone respawn the boss?",
        match: /\brespawn\b|\breset\b/i,
        answer: "Yes, any wallet, even mid fight: `respawn` resets the health whenever it's called. Here that's the game; elsewhere, `init_if_needed` can let someone reset an account you meant to create once.",
      },
      {
        label: "Why is there no signer on Attack?",
        match: /\bsigner\b/i,
        answer: "Nothing in `attack` depends on who hits. The transaction's fee payer signs it anyway; the program just doesn't ask.",
      },
    ],
  },
  {
    id: "predict",
    title: "Predict",
    short: "Predict",
    objective: "Work out the next hits before they land",
    learned: "Pseudo random from public inputs is predictable: anyone can work out the next hits before they land",
    file: CLIENT,
    start: "",
    target: CLIENT_CODE,
    lib: LIB_S2,
    goal: "move",
    beats: [
      {
        kind: "say",
        id: "s3.public",
        text: "Every hit came from a slot and a formula, and both are public. The slot is the cluster's clock, a new one about every 400 ms, and the formula is in your program for anyone to read.",
      },
      {
        kind: "ask",
        id: "s3.q3",
        kicker: "Question",
        n: 3,
        question: "So what can a player do, knowing that?",
        options: ["Work out each coming slot's damage, and attack when a big one is due", "Nothing: slots go by too fast to use", "Only check the damage after the attack, like everyone else"],
        code: false,
        answer: 0,
        right: "Yes. The damage isn't hidden, only scrambled. A client can run the same `xorshift64` and see every hit coming. Let's write one.",
        why: [
          null,
          "A slot lasts about 400 ms. A script works out the next ones in microseconds and sends when the number is right.",
          "Nothing has to wait for the attack: the formula and the slot are both public before it.",
        ],
        hint: "What does a player need to work out a hit? Is any of it secret?",
        skipped: "No problem. The formula and the slot are both public, so a client can work out every hit before it lands. Let's write one.",
      },
      {
        kind: "write",
        id: "s3.client",
        text: "Here it is in client.ts: the same three shifts and XORs, with `BigInt` because a JavaScript number can't hold 64 bits. It reads the slot devnet is on and works out the next five hits.",
        writes: { file: CLIENT, block: CLIENT_CODE, ref: CLIENT_CODE },
      },
      {
        kind: "act",
        id: "s3.run",
        act: "run",
        say: "Run it.",
        title: "Run client.ts",
        context: "Reads the slot · no transaction, nothing to pay",
        button: "Run",
      },
      {
        kind: "act",
        id: "s3.respawn",
        act: "send",
        ix: "respawn",
        say: "The boss is still down from the last step. Respawn it.",
        title: "Respawn the boss",
        context: "Sends `respawn` · fee from your wallet",
        button: "Respawn",
        record: "Respawned the boss",
      },
      {
        kind: "act",
        id: "s3.attack",
        act: "move",
        say: "Now look at the strip, then attack.",
        title: "Call the hit",
        context: "Sends `attack` · fee from your wallet",
        button: "Attack",
        moves: [
          { ix: "attack", button: "Attack" },
          { ix: "respawn", button: "Respawn" },
        ],
        record: "Called the hit",
      },
    ],
    win: {
      id: "s3.win",
      headline: "You called the hit before it landed",
      line: "Your client said slot {slot} would roll {d}, and devnet agreed. Fine for a boss fight; for anything worth money, the roll has to come from somewhere players can't read ahead.",
      stats: [
        { icon: "cpu", text: "Same roll in TypeScript" },
        { icon: "zap", text: "{d} called, {d} hit" },
        { icon: "clock", text: "{took}" },
      ],
    },
    testWin: "You attacked from the Call panel, and the hit was the one the strip called.",
    explainStep: "This step writes a client that runs the same XORShift on the coming slots, then attacks: the hit lands with the damage the client called before it.",
    chips: [
      {
        label: "What do real games use?",
        match: /\breal games?\b|\bvrf\b|\boracle\b/i,
        answer: "A verifiable random function from an oracle, Switchboard or ORAO for example. The number arrives with a proof, after the player has committed to the move, so nobody can read it ahead. It costs a fee and a second transaction.",
      },
      {
        label: "Why read the slot as processed?",
        match: /\bprocessed\b|\bconfirmed\b|\bfinalized\b/i,
        answer: "`processed` is the newest slot the node has seen. `confirmed` and `finalized` lag behind, and the next five slots would already be gone.",
      },
      {
        label: "Could a validator cheat here?",
        match: /\bvalidator\b|\bcheat\b/i,
        answer: "The leader of a slot chooses which transactions go in it, so it could hold an attack back for a better roll. Another reason this is for games without stakes.",
      },
    ],
  },
]

/** `?` inside a function whose return type has no room for an error: rustc's E0277. The planned failure */
const tryInPlainFn: SpecialCheck = ({ code, bare, file, head, failed }) => {
  const rows = bare.split("\n")
  for (const [i, row] of rows.entries()) {
    const sig = row.match(/^\s*(?:pub\s+)?fn\s+(\w+)\s*\([^)]*\)\s*->\s*([^{]+?)\s*\{\s*$/)
    if (!sig || /^(Result|Option)\b/.test(sig[2])) continue
    const end = rows.findIndex((r, k) => k > i && /^\s*\}\s*$/.test(r) && r.search(/\S/) <= row.search(/\S/))
    const at = rows.slice(i + 1, end === -1 ? undefined : end).findIndex((r) => /\)\?/.test(r))
    if (at === -1) continue
    const line = i + 2 + at
    const text = code.split("\n")[line - 1] ?? ""
    const column = text.indexOf(")?") + 2
    const sigText = (code.split("\n")[i] ?? "").trimEnd()
    return {
      ok: false,
      planned: true,
      line,
      column,
      span: 1,
      log: [
        ...head,
        "error[E0277]: the `?` operator can only be used in a function that returns `Result` or `Option` (or another type that implements `FromResidual`)",
        ` --> ${file}:${line}:${column}`,
        "   |",
        `${i + 1} | ${sigText}`,
        `   | ${"-".repeat(sigText.trim().length)} this function should return \`Result\` or \`Option\` to accept \`?\``,
        `${line} | ${text.trimEnd()}`,
        `   | ${" ".repeat(column - 1)}^ cannot use the \`?\` operator in a function that returns \`${sig[2].trim()}\``,
        "Build failed",
      ],
      reason: `${failed}: \`?\` on line ${line} passes an error up, and \`${sig[1]}\` returns a plain \`${sig[2].trim()}\`.`,
      explain: EXPLAIN_ERROR,
    }
  }
  return null
}

/** `Clock::get().slot` without `?`: a `Result` has no `slot` */
const slotWithoutTry: SpecialCheck = ({ code, bare, file, head, failed }) => {
  if (!/Clock::get\(\)\s*\.\s*slot/.test(bare)) return null
  const line = lineOf(code, "Clock::get()")
  return {
    ok: false,
    line,
    log: [...head, "error[E0609]: no field `slot` on type `Result<Clock, ProgramError>`", ` --> ${file}:${line}`, "Build failed"],
    reason: `${failed}: \`Clock::get()\` on line ${line} returns a \`Result\`, which has no \`slot\`.`,
    explain: "`Clock::get()` can fail, so it hands back a `Result`, and a `Result` has no `slot`. Keep the `?` and let `roll_damage` return a `Result<u64>` instead.",
  }
}

const CHECKS: SpecialCheck[] = [tryInPlainFn, slotWithoutTry, noSystemProgram, payerNotMut]

// ---- The boss: what the program does with it, worked out the way it would

const bossOf = (s: State) => s.records?.find((r) => r.id === "boss") ?? null

/** The rolls the card lists, oldest first: the slot, the damage and the health before the hit */
type Roll = [number, number, number]
const rollsOf = (r: Rec | null): Roll[] => JSON.parse(String(r?.values.rolls ?? "[]")) as Roll[]

/** Whether the program on devnet has `attack` yet */
const attacks = (s: State) => s.deployedLib !== null && holds(s.deployedLib, "pub fn attack(ctx: Context<Attack>) -> Result<()> {")

/** One send, from a card or the Call panel, answered as devnet would. An attack lands in the slot after
 * the one the clock is at, and rolls what `xorshift64` gives for it, so the client's strip is right */
function send(s: State, ix: string): RecSend | { note: string } {
  const boss = bossOf(s)
  const records = s.records ?? []
  const signature = records.length ? signatureOf(sentSoFar(s) + 77) : RESPAWN_SIGNATURE
  if (ix === "respawn") {
    const said = `The boss is back with ${MAX_HEALTH} health.`
    if (!boss) {
      const created: Rec = { id: "boss", kind: "Boss", pda: BOSS_PDA, values: { health: MAX_HEALTH, rolls: "[]", hits: 0, predicting: false }, rent: RENT }
      return { tx: { instruction: "respawn", said, signature, compute: 7930, inner: SYSTEM_CPI }, records: [created] }
    }
    return { tx: { instruction: "respawn", said, signature, compute: 3410 }, records: records.map((r) => (r.id === "boss" ? { ...r, values: { ...r.values, health: MAX_HEALTH, hits: 0 } } : r)) }
  }
  if (ix === "attack") {
    if (!boss) return { note: "Spawn the boss first, with `respawn`." }
    if (!attacks(s)) return { note: "Devnet still runs the program without `attack`. Build and deploy it first." }
    const health = Number(boss.values.health)
    if (health === 0) {
      const tx: Tx = {
        instruction: "attack",
        said: "",
        signature,
        compute: 2210,
        error: { name: "BossDefeated", number: 6000, message: "The boss is down. Respawn it to attack again", line: lineOf(s.deployedLib ?? "", "err!(ErrorCode::BossDefeated)") },
      }
      return { tx, records, refused: "BossDefeated · error 6000 · the boss stayed at 0" }
    }
    const slot = slotAt(s, Date.now()) + 1
    const damage = rollOf(slot)
    const left = Math.max(0, health - damage)
    const rolls = JSON.stringify([...rollsOf(boss), [slot, damage, health]].slice(-5))
    const tx: Tx = { instruction: "attack", said: `You hit the boss for ${damage}. ${left} health left.`, signature, compute: 2946 }
    const hits = Number(boss.values.hits) + 1
    // `fell` keeps how many hits the boss took to fall, for the finish once it's been respawned
    const values = { ...boss.values, health: left, rolls, hits, ...(left === 0 ? { fell: hits } : {}) }
    return { tx, records: records.map((r) => (r.id === "boss" ? { ...r, values } : r)) }
  }
  return { note: "That call has no card here." }
}

/** The client of step 3: it reads the slot and works out the next five hits, with no transaction. From
 * then on the card shows them */
function run(s: State) {
  const now = slotAt(s, Date.now())
  const out = [`Slot now: ${now}`, ...[1, 2, 3, 4, 5].map((k) => `slot ${now + k}: ${rollOf(now + k)} damage`)]
  return { tx: null, out, records: (s.records ?? []).map((r) => (r.id === "boss" ? { ...r, values: { ...r.values, predicting: true } } : r)) }
}

/** A hit as the card lists it: the damage, its slot, what's left, and whether the client called it */
function sentLine(x: Sent) {
  if (x.ix !== "attack") return null
  const boss = x.snap.after.find((r) => r.id === "boss") ?? null
  const last = rollsOf(boss).at(-1)
  if (!last) return null
  const left = Number(boss?.values.health ?? 0)
  return `−${last[1]} · slot ${slotText(last[0])} · ${left} left${left === 0 ? " · down" : ""}${boss?.values.predicting ? " · called it" : ""}`
}

/** Step 2 passes on the hit that takes the boss to 0, step 3 on a hit the client called */
const passes = (s: State, i: number, ix: string, tx: Tx) =>
  ix === "attack" && !tx.error && (i === 1 ? Number(bossOf(s)?.values.health) === 0 : i === 2 ? !!bossOf(s)?.values.predicting : false)

export const BOSS_BATTLE: Lesson = {
  card: { slug: "boss-battle", name: "Boss Battle", level: "Intermediate", framework: "Anchor", ext: "png" },
  minutes: 12,
  by: "Jonas Hahn and John",
  program: "boss_battle",
  line: "Fight a boss whose damage is rolled on chain, then see every hit coming",
  intro: "You'll build a boss fight on devnet: damage rolled from the slot with XORShift, a boss that falls at 0 without an overflow, and a client that works out the next hits before they land.",
  proof: "Program log: You hit the boss for 401. 599 health left.",
  badge: "Pseudo random",
  headline: "You rolled damage on chain, and saw it coming",
  proofLine: (_tx, s) => {
    const v = winVars(s)
    return `The boss fell in ${bossOf(s)?.values.fell ?? v.n} hits on devnet, and your client called ${v.d} damage before the hit landed.`
  },
  // The next Intermediate one in Anchor: time on chain, from a game into money
  next: "bank-simulator",
  nextLine: "Bank Simulator is a good next one: a bank account on chain whose balance earns interest, worked out every time the account is touched.",
  steps: STEPS,
  files: { [LIB]: "", [CLIENT]: "" },
  preview: LIB_S2,
  programId: PROGRAM_ID,
  idlAccount: IDL_ACCOUNT,
  txSignature: RESPAWN_SIGNATURE,
  checks: CHECKS,
  story: false,
  runTx: () => ({ instruction: "respawn", said: `The boss is back with ${MAX_HEALTH} health.`, signature: RESPAWN_SIGNATURE, compute: 7930, inner: SYSTEM_CPI }),
  run,
  records: {
    title: "Slot",
    one: "slot",
    empty: "No boss yet. Respawn sends `respawn`.",
    show: (r) => ({ label: "Boss", seeds: '"boss"', fields: [["health", String(r.values.health)]] }),
    send: (s, ix) => send(s, ix),
    passes,
    args: () => ({}),
    check: () => null,
    view: "boss",
    sentLine: (_s, x) => sentLine(x),
  },
  winVars: (s) => winVars(s),
}

/** The numbers a win and the finish read: hits since the last respawn, and the last hit */
function winVars(s: State): Record<string, string> {
  const boss = bossOf(s)
  const last = rollsOf(boss).at(-1)
  return { n: String(boss?.values.hits ?? 0), d: String(last?.[1] ?? 0), h: String(last?.[2] ?? 0), slot: last ? slotText(last[0]) : "" }
}
