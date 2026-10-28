# Lessons: the tutorials the chat flow runs

The prototype runs more than one tutorial now. The chat flow (store, runner, cards, desktop, tablet and
phone screens) is shared; each tutorial is a lesson module in this folder. Hello Anchor was the first and
set the patterns; Lumberjack (Intermediate) and Zero Copy (Advanced) are built on them, one tutorial a
level.

| Lesson | Level | File | Address |
|---|---|---|---|
| Hello Anchor | Beginner | `hello-anchor.ts` | `/prototype/tutorial-v2/?view=desktop&tutorial=hello-anchor` |
| Lumberjack | Intermediate | `lumberjack.ts` | `/prototype/tutorial-v2/?view=desktop&tutorial=lumberjack` |
| Zero Copy | Advanced | `zero-copy.ts` | `/prototype/tutorial-v2/?view=desktop&tutorial=zero-copy` |

`?view=tablet` and no `view` (the phone) work the same way. Without `?tutorial=` the prototype opens the
lesson that was open last.

## The principles every lesson follows

Taken from Hello Anchor v2 (see `../SPEC.md`), and what a new lesson is checked against.

1. **The lesson is the conversation.** Each step opens with a divider in the chat; the step bar on top
   jumps back to those dividers. Nothing resets when you go back.
2. **Question, then code.** The assistant explains one piece in 2 to 4 sentences, then asks a question
   with three answers. A right pick writes that code into the file with the lines lit; a wrong pick gets
   one sentence and the question stays open. Routine code (imports, ids, boilerplate) the assistant writes
   without asking, and says so.
3. **One action at a time.** Build, Deploy, Run, Call, a move (Chop, Grow) and Next sit only on the latest card. One
   composer, never disabled.
4. **Fast wins.** Something changes in the first seconds, the first green build lands within a minute,
   and every step ends on a win card.
5. **One planned failure.** Step 1's first build fails on the error every developer meets at that level,
   then Explain and a "Fix it" question. It isn't a miss on the learner's first try.
6. **A signature moment.** Something comes back from devnet that you can see and remember, with a receipt
   instead of a bare key.
7. **As many steps as the ideas need.** One idea a step, one question in it, each ending on a win. Four
   is not a rule: count the ideas the learner has to come away with, and check that no step carries two
   and no step is only a button. Hello Anchor and Lumberjack came out at four, Zero Copy at three, each
   for its own reason: see Lumberjack and Zero Copy below, and Hello Anchor's spec.
8. **Nothing of the IDE is gone.** Files as tabs, the terminal bar, and a Call panel drawn from the
   deployed IDL.
9. **Desktop is the reference.** The tablet is the desktop in a 1152 frame; the phone shows the same
   conversation and cards, with the code and the output a tap away.
10. **Everything is mocked.** The devnet wallet and its faucet, example ids, signatures, costs and
    compute units, canned answers. "Who pays" in `../README.md` applies to every lesson.

## How a lesson is built

A lesson is a `Lesson` (`types.ts`): its card, the copy for the intro and the finish, its `steps`, the
files it starts with, the finished program shown before Start, its program id, and the few things its
program does differently:

* `checks`: compiler errors it knows by name. The one marked `planned` is step 1's planned failure.
* `runTx`, `callTx`: what running client.ts and the chat's Call send.
* `game`: a lesson that keeps a player account on devnet (Lumberjack). Its `chop` works out one move, and
  `chopPasses` says which move passes a step.
* `memory`: a lesson about account size (Zero Copy): `grow` works out one press on either map, with
  the 10 KB the chat sends or any `len` the Call panel was given; `growPasses` which press passes a step,
  `grownEnough` when a grow on the way is done; `panel` what a call sends and how the program answers
  it, from the Call panel or a `send` card in the chat (an act beat with `ix`: Create, Paint); `args`
  the values the panel starts each argument at; `check` why typed values can't be sent (a `u32` that
  isn't a whole number).
* `run`: a client run the lesson works out itself, when what it sends changes from step to step. No
  lesson uses it since Zero Copy dropped client.ts; it stays for the next one that needs it.

A step's `file` is the one it writes; `lib` or `client` name what the other file ends the step as, when
the step changes both.

A step's beats are `say`, `write` (the assistant writes without asking), `ask` (the question) and `act`
(a card with a button). A write lands where the step's target code has it; when the code repeats lines
(`}` and `let player = ...` in Lumberjack), give each write a `ref`: the file as it stands right after
that write, so pieces still to come don't pull their lines in.

An `ask` with code can be answered by hand (Type it myself): typing its `key` line in the editor counts
as the answer, and the assistant writes the rest of the block around it. For a "Fix it" question the
key is the line that *is* the fix, never a line that's there either way: Hello Anchor's is
`#[derive(Accounts)]`, not `struct Hello {}`, so a struct without the derive isn't taken as fixed.
What isn't the key yet, the compiler judges: the question offers Build once lib.rs changed, and a
partial fix gets its own error (`Hello: Accounts` is not satisfied), with the question still open.

`../data.ts` holds the catalog and hands out the open lesson; `../host.tsx` opens a lesson (a store per
lesson, saved under its own key) and gives the screens `useOpenTutorial` and `useProgress`.

To add one: write `<slug>.ts` next to these, add it to `index.ts`, and add it to `LADDER` in
`../host.tsx` if the Start here banner should lead to it.

## Lumberjack

After Jonas Hahn's Lumberjack tutorial (`client/public/tutorials/lumberjack`), the Intermediate step
after Hello Anchor: the learner keeps state in an account for the first time, at a PDA, and meets time
on chain.

| Step | What happens | Question | Passes when |
|---|---|---|---|
| 1 Player | The assistant writes the opening, the two game constants, `PlayerData`, `InitPlayer` (seeds included, said in a line) and `init_player`. The build fails on purpose: `init` without `system_program` | Fix it: what does `InitPlayer` need? | the build passes after Fix it |
| 2 Create | Deploy; then the client: you answer how it finds your player's address, it writes the PDA line, then the rest; run | How does your client get your player's address? | client.ts creates the player |
| 3 Chop | A custom error, then `chop_tree`; build and deploy; chop by hand, then "Chop until out of energy" sends the rest | What should `chop_tree` do when the energy is 0? | `NotEnoughEnergy` (6000) comes back |
| 4 Refill | `update_energy`, called first by every chop; build and deploy; chop again | When should the energy come back? | a chop works on the energy that came back |

Signature moments: the player account drawn as a game's screen (five energy cells, the wood, the PDA),
updated by every chop; the program refusing with its own error, by name; the energy coming back with no
transaction, and the timer to the next one, which the client works out itself.

Decisions against the original:

* `name`, `level` and `xp` are gone (nothing used them), and `space` is `8 + PlayerData::INIT_SPACE`
  instead of a guessed 1000.
* `update_energy` counts whole 30 second blocks instead of looping one at a time; same result.
* The client only creates and reads the player. Chopping happens from the chat's Chop card or the Call
  panel, so step 3 isn't a page of TypeScript.
* The refill is real time: a chop on step 4 adds what the clock says came back, and a chop before the
  first 30 seconds refuses and says how long to wait.
* Four steps: one for each new idea (an account and what creates it, its address as a PDA, an error of
  your own, time). Player and Create together would put the first win behind a failed build, a fix, a
  deploy and a run; Chop and Refill together would be the longest step, with two ideas in it.
* The seeds question moved from step 1 to step 2 (10/28): step 1 carried three ideas and two
  questions, step 2 only a prediction. The PDA is asked where the client needs the address, so it
  answers a real question, and step 1 keeps one: the fix.
* Step 3 offers "Chop until out of energy" after the first chop by hand: six presses to reach the
  refusal was the dullest part of the lesson.
* Creating the player costs rent (about 0.0011 SOL), from the learner's devnet wallet like every other
  cost.

The finish points to the next Intermediate tutorial, Battle Coins, which the prototype doesn't run yet: it
is where the original Lumberjack points, a game that gives its players a token of its own. Hello Anchor's finish keeps pointing to
the next Beginner tutorial, Counter PDA Tutorial.

## Zero Copy

After Jonas Hahn's Zero Copy tutorial (`client/public/tutorials/zero-copy`, from the
anchor-zero-copy-example), the Advanced step: the memory limits a program meets as its accounts grow, one
a step, and the way past each. The original is a single page of reading and a local validator; here it is
told as one game world: a board, a map, then a map too big to copy.

| Step | What happens | Question | Passes when |
|---|---|---|---|
| 1 Stack | A board account of 12 cells; you size it; the build fails on purpose: the board goes past 4 KB of stack. Fix: `Box` it | How much space does the board's account need? | the build passes after Fix it |
| 2 Grow past the heap | A map at the 10 KB `init` allows, `realloc` to grow it; deploy, Create your map, then Grow +10 KB (or Grow until out of memory) until reading it runs out of heap | What's the biggest map `init` can create? Which constraint grows `map` to `len` bytes? | the grow to 40 KB runs out of memory |
| 3 Zero copy | `#[account(zero_copy)]`, `AccountLoader`, `load_mut`; upgrade, Create the big map, the same Grow to 40 KB with nothing copied, then Paint at byte 35,000 | Which line lets the program read `BigMap` in place? | Paint lands |

Signature moments: the memory card (the account in 10 KB blocks, and the heap on the same 40 KB scale
with a tick where its 32 KB end, the copy running red past the tick), kept on the grow card's record
once the step ends; and the big map at 40 KB with "0 KB, in place" on the heap and a write at byte
35,000, past anything a copy could hold. In the Call panel the learner can grow by any `len` and paint
any text anywhere: the program answers as devnet would.

Decisions against the original:

* Three steps, not four. The 10 KB of `init` is a number to know, not a wall to hit: as a step of its own
  it was a deploy and a client with nothing about memory in them. It sits in step 2 now, before the
  growing it leads to. Step 2 asks two questions; the stack and the heap each keep their own moment.
* No client.ts. Create, Grow and Paint go from the chat, as the Call panel sends them: the old step 4
  wrote a 17 line client and one Run did it all, so the payoff was read in a log, not felt. Now step 3
  ends with the same Grow that ran out in step 2, and it goes through: the heap stays at 0 KB.
* A new map for zero copy, not the old one changed: its bytes are laid out for a `Vec`, and a zero copy
  struct would read them as something else. The chip "Why not change the old map?" says so.
* The board stops at step 1: it is there to meet the stack. Step 2's first line says it has done its job.
* The stack overflow is a build failure here. In a real build the linker prints it as an error and the
  program fails when it runs; the prototype stops the build there so the fix comes first.
* The heap is told simply: `Account` copies the whole account into the 32 KB heap, so a 40 KB account
  can't be read. 20 and 30 KB grow; 40 KB runs out.
* 40 KB, not 10 MB: enough to pass every limit, and the copy says the same way goes up to 10 MB.
* `zero_copy` instead of `zero_copy(unsafe)` with `repr(C)`: what current Anchor writes for a byte array.
* The big map's rent is about 0.29 SOL, the map's up to 0.21 SOL, from the learner's devnet wallet. One
  faucet airdrop (5 SOL) covers the deploy and both maps.

Zero Copy is the only Advanced tutorial, so its finish has no next one: All tutorials is the way on.
