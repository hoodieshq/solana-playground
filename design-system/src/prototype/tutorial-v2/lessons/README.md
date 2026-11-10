# Lessons: the tutorials the chat flow runs

The prototype runs more than one tutorial now. The chat flow (store, runner, cards, desktop, tablet and
phone screens) is shared; each tutorial is a lesson module in this folder. Hello Anchor was the first and
set the patterns; Lumberjack (Intermediate) and Zero Copy (Advanced) are built on them, one tutorial a
level.

| Lesson | Level | File | Address |
|---|---|---|---|
| Hello Anchor | Beginner | `hello-anchor.ts` | `/prototype/tutorial-v2/?view=desktop&tutorial=hello-anchor` |
| Hello Seahorse | Beginner | `hello-seahorse.ts` | `/prototype/tutorial-v2/?view=desktop&tutorial=hello-seahorse` |
| Hello Solana | Beginner | `hello-solana.ts` | `/prototype/tutorial-v2/?view=desktop&tutorial=hello-solana` |
| Counter PDA Tutorial | Beginner | `counter-pda-tutorial.ts` | `/prototype/tutorial-v2/?view=desktop&tutorial=counter-pda-tutorial` |
| Expense Tracker | Beginner | `expense-tracker.ts` | `/prototype/tutorial-v2/?view=desktop&tutorial=expense-tracker` |
| Todo App Seahorse | Beginner | `todo-app-seahorse.ts` | `/prototype/tutorial-v2/?view=desktop&tutorial=todo-app-seahorse` |
| Lumberjack | Intermediate | `lumberjack.ts` | `/prototype/tutorial-v2/?view=desktop&tutorial=lumberjack` |
| Bank Simulator | Intermediate | `bank-simulator.ts` | `/prototype/tutorial-v2/?view=desktop&tutorial=bank-simulator` |
| Battle Coins | Intermediate | `battle-coins.ts` | `/prototype/tutorial-v2/?view=desktop&tutorial=battle-coins` |
| SPL Token Vault | Intermediate | `spl-token-vault.ts` | `/prototype/tutorial-v2/?view=desktop&tutorial=spl-token-vault` |
| Faucet Seahorse | Intermediate | `faucet-seahorse.ts` | `/prototype/tutorial-v2/?view=desktop&tutorial=faucet-seahorse` |
| Tiny Adventure | Beginner | `tiny-adventure.ts` | `/prototype/tutorial-v2/?view=desktop&tutorial=tiny-adventure` |
| Tiny Adventure Two | Beginner | `tiny-adventure-two.ts` | `/prototype/tutorial-v2/?view=desktop&tutorial=tiny-adventure-two` |
| Tic-tac-toe Seahorse | Beginner | `tictactoe-seahorse.ts` | `/prototype/tutorial-v2/?view=desktop&tutorial=tictactoe-seahorse` |
| Boss Battle | Intermediate | `boss-battle.ts` | `/prototype/tutorial-v2/?view=desktop&tutorial=boss-battle` |
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
* `run`: a client run the lesson works out itself, when what it sends changes from step to step. Expense
  Tracker's client uses it to read its records back: it returns `records` instead of `memory`.
* `main`: the program's file when it isn't `src/lib.rs` (Hello Seahorse's `src/hello.py`). Everything
  the engine says about "lib.rs" reads it: the build, the step bar, Show in, the peek of the log line.
* `generated`: a file the build writes and the learner only reads, worked out from the main file on every
  green build. Seahorse's Rust, opened read only from a quote marked `generated` ("Show generated Rust").
* `raw`: a program whose build writes no IDL (Hello Solana). The build and the deploy say so, and the
  Call panel has one raw form: the program id, no accounts, data as text with its bytes under it.

* `records`: a lesson that keeps records, accounts at PDAs (the Data family). See "Records, moves and
  until" below.
* `winVars`: values for `{name}` in a win's line, from the lesson's state (Expense Tracker's `{n}`).

Seahorse lessons share `seahorse.ts`: the `GENERATED` file name and `SEAHORSE_CHECKS`, the two errors a
parameter meets first (`param without type`, the planned one, and `symbol "x" not found`).

### Records, moves and until

The Data family (Counter PDA, Expense Tracker, Bank Simulator, Todo App Seahorse) keeps its accounts in
the state as `records`: a `Rec` each (`kind`, `pda`, the raw `values`, `rent` in SOL), drawn by
`../ui/RecordsCard.tsx` as the records card. A lesson's `records` says:

* `title`, `one`, `empty`: the card's head ("Expenses · 3 accounts"), one of them ("Read 1 expense"), and
  what the card says before there is any.
* `show(r)`: how a row reads, its label, seeds and fields. `line: true` sets it on one line with its
  values only, its seeds shown when the row is opened (a list's rows); without it, the label, address
  and rent, then the seeds, then the fields.
* `send(s, ix, args?, row?, signer?)`: what one send does, from a card or the Call panel: the `Tx`, the
  records after it, `refused` in words for a refusal ("Already in use · your counter stayed as it was")
  and `out` for the log. A refusal is a transaction like any other: it comes back with `error` and the
  records as they were. Or `{ note }` when it isn't sent; the Call panel and a row button show the note.
* `passes(s, i, ix, tx)`: which send passes step `i`, with `s` the state after it.
* `args(s, ix, row?)`, `check(ix, given)`: what a card and the panel start each argument at, and why a
  typed value can't be encoded.
* `live?(s, r, now)`: a muted line the client works out between transactions, ticking once a second
  (Bank Simulator's interest).

`lessons/records.ts` holds what the family's lessons share: made up keys and signatures, rent and dollars
as the cards print them, the System Program's "already in use", Anchor's 3004 and 3012, and the
compiler checks a first account meets (`init` without `space`, `String` without `max_len`, `init`
without `system_program`, a payer or a `close` without `mut`, `Clock::get()` without `?`).

Two acts drive records:

* `send` with `ix` (already Zero Copy's): one transaction from the chat. In a records lesson its result
  card is the records card as the send left it, a refused one included, and `fields` on the act beat
  are typed on the card first (Bank Simulator's holder name). A refusal that passes nothing puts the
  card back up.
* `move`: a card that sends again and again (Increment, Add expense, Deposit and Withdraw). Its `moves`
  are its buttons: each names its `ix`, its `button` (`{name}` is that argument's default: "Add
  #{id}"), its `fields` (`text`, `number`, or `dollars` shown as dollars and sent as cents), and
  `signer: "stranger"` for a key that isn't the learner's. A move with `row` set to a record's `kind`
  is a row move: its button sits on each row of that kind and acts on that record (Edit, Delete, Mark
  done); with `fields` it opens them under the row first. The card shows the live records card, its
  row buttons and its last three sends; the step passes when `passes` says so. The card's first send
  that goes through lets the script go on under it, and the card stays up until the next card of the
  script posts (or gives way at once when that card is another move); a move that passes its step
  stays up for more until Next. Once done it keeps the records as they were then, closed rows folded.
* `until` on a move act beat (`{ label, times }` or `{ label, stop: "refused" }`): offered beside the
  card's first move once it was made by hand, it sends that move again `times` more, or until a send is
  refused, each still a transaction on the card. A send that comes back with a note stops it, and so
  does Stop. Lumberjack's "Chop until out of energy" and Zero Copy's "Grow until out of memory" are the
  same idea, kept in their own cards. The Games and Tokens families can drive their moves this way: give
  the lesson a `records`, or extend `moved` and `movedOn` in `../store.tsx` for a state of another shape.

The store keeps every send on its card (`sends`), so the finish's receipt, the terminal's status and
the card's record read them. Calls from the Call panel go through the same `send`; a card up in the chat
for the same instruction lists them, or is done, so the script goes on.

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
Type it myself puts the caret where the answer goes. When that is between two lines that both stay, it
opens a line of its own there (typing at the start of the next line used to take that line with it when
the block was filled in); when the answer replaces a line (Zero Copy's unboxed account, an untyped
Seahorse parameter), the caret sits on that line and the typing goes over it.
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

## Hello Seahorse

After acheron's Hello Seahorse (`client/src/tutorials/hello-seahorse`), the Beginner tutorial in Python.
The same hello as Hello Anchor, with each question about what Seahorse makes you do.

| Step | What happens | Question | Passes when |
|---|---|---|---|
| 1 Program | The assistant writes the import and `declare_id`; you pick the log line; it writes `hello(signer)` around it, with no type. The build fails on purpose: `param without type`. Fix it | Which line writes to the program log? Fix it: what does `signer` need? | the build passes after Fix it |
| 2 Deploy | A quote of the Rust the build made, your `print` as `msg!`, with Show generated Rust; you predict what goes to devnet, then deploy | What goes to devnet when you deploy? | the deploy lands |
| 3 Client | client.ts is created; you answer who the `signer` is; run | `hello` needs a `signer`. Who signs when client.ts calls it? | `Hello, World!` comes back (Run, or Call in the Call panel) |
| 4 Name | `name: str` joins the parameters and the log line becomes an f-string; build and deploy; call with your name | Which `hello` takes a name? | `Hello, <name>!` comes back |

Signature moments: the `print` line shown as the `msg!` Seahorse made of it; `Hello, World!` back from
devnet with the peek of hello.py's `print`; `Hello, <name>!` and its receipt. No state card: the program
keeps no account.

Decisions against the original:

* Four steps, not four pages to read. The Test UI page is gone as a page: the Call panel arrives on
  deploy and can pass steps 3 and 4.
* A name argument the original doesn't have: the Hello family's signature moment, and the second half of
  Seahorse's types (data, not accounts).
* A planned failure the original doesn't have: a parameter with no type, the error a Python developer
  meets first in Seahorse. Its fix is the step's idea.
* The generated Rust is shown, in a quote and in a read only `lib.rs (generated)` tab beside hello.py,
  trimmed to what comes from your code. Seeing `print` become `msg!` makes the compile real.
* `declare_id` holds the placeholder id, and client.ts passes `signer` in `.accounts()`, so the account
  the learner just answered about has somewhere to go.
* No `solana confirm -v` with a pasted signature, and no wallet or rate limit copy: the log line comes
  back on the result card, and the wallet is funded by the first deploy.

Whether Seahorse stays in the product is the client's call; the lesson doesn't bring it up, and the
canned answer to "is it still maintained?" says it plainly. The finish points to Todo App Seahorse.

## Hello Solana

After acheron's Hello Solana (`client/src/tutorials/hello-solana`), the Beginner tutorial in native Rust.
The questions and the failure come from what Native makes you write by hand.

| Step | What happens | Question | Passes when |
|---|---|---|---|
| 1 Program | The assistant writes the imports and `process_instruction` with its `msg!`, taking nothing; you pick how the runtime finds it. The build fails on purpose: E0061, 0 arguments where `entrypoint!` passes 3. Fix it | How does the runtime know which function to call? Fix it: what does `process_instruction` need? | the build passes after Fix it |
| 2 Deploy | You predict what a client reaches the program by, with no IDL; deploy | Your build made no IDL. What will a client use to reach your program? | the deploy lands |
| 3 Client | client.ts is created; you pick the instruction (address, accounts, data); it's wrapped in a transaction your wallet sends; run | Which instruction reaches `process_instruction`? | `Hello, World!` comes back (Run, or Send in the Call panel) |
| 4 Name | `from_utf8` reads a name out of `instruction_data`, then the import and the `_` it needs; build and deploy; call with your name, the card showing its bytes | How does `process_instruction` get the name out of `instruction_data`? | `Hello, <name>!` comes back |

Signature moments: `Hello, World!` at 137 CU, with no framework code before yours; the name as the bytes
that travel (`41 6c 65 78`) on the call card, the raw Call panel and the receipt, read back as
`Hello, Alex!`. No state card.

Decisions against the original:

* Four steps, not three pages. The name step is new: reading instruction data by hand is the half of
  native work the original leaves out (its data is always empty).
* A planned failure the original doesn't have: `process_instruction` without its three parameters. Its
  fix is the step's idea, the runtime always passes three things. The parameters start with `_`, said once
  in the fix, and `instruction_data` drops it in step 4.
* The client uses `web3.sendAndConfirmTransaction` instead of five snippets: the idea is the instruction
  and its three parts, the blockhash and the serializing are plumbing.
* A raw Call panel: no IDL means no form, so the panel has one raw instruction with data as text and its
  hex under it. A Send passes steps 3 and 4, as the chat's cards do.
* Step 4's import and `_` are a routine write of their own after the question, so the question's lines
  stay the ones its answer is about.
* The deploy costs the shared 1.27 SOL; compute units 137 and 412 are examples.

The finish points to Hello Anchor: the same hello, with the macros doing what Native makes you write.

## Counter PDA Tutorial

After cleon's Counter PDA tutorial (`client/public/tutorials/counter-pda-tutorial`), the Beginner step
after Hello Anchor: a counter account per wallet, at a PDA. It draws the records card in its simplest
case, one account and one field. Script: `research/tutorials-redesign/scripts/counter-pda-tutorial.md`.

| Step | What happens | Question | Passes when |
|---|---|---|---|
| 1 Account | The opening, `Counter` with `InitSpace`, `CreateCounter` (seeds said in a line) and `create_counter`. The build fails on purpose: `init` without `space` | Fix it: how much space does the counter need? | the build passes after Fix it |
| 2 Create | Deploy; Create your counter (a `send` card), then Create again, and devnet refuses | Press Create a second time. What does devnet do? | the second create comes back "already in use" |
| 3 Increment | `Increment` and `increment`; build and deploy; Increment from the move card, then "Increment 10 times" | What does `Increment` need so the new count is saved? | an increment lands |

Signature moments: devnet refusing the second create, from the System Program, with the records card
unchanged under it; the count going up on the card with every transaction, "Increment 10 times" running
it up while you watch.

Decisions against the original are in the script. Made while building it:

* "Increment 10 times" stays offered after the win: the step passes on the first increment, and the move
  card stays up until the finish so the ten can still be sent.
* The question in step 2 comes before both Create cards, so the second press checks a prediction.

The finish points to Tiny Adventure.

## Expense Tracker

After Bolt / Syed Aabis Akhtar's Expense Tracker (`client/public/tutorials/expense-tracker`), the last
Beginner Anchor tutorial: many records of one wallet, found by a filter, and closing one. Script:
`research/tutorials-redesign/scripts/expense-tracker.md`.

| Step | What happens | Question | Passes when |
|---|---|---|---|
| 1 Expense | The opening, `ExpenseAccount` (with `max_len`), `AddExpense` with the id in its seeds, and `add_expense`. The build fails on purpose: the seeds use `id`, which the struct can't see | Fix it: how does `AddExpense` get to see `id`? | the build passes after Fix it |
| 2 List | Deploy; add an expense on the card (merchant and amount), then "Add two more"; the client: you answer how it finds them all, it writes the `memcmp` filter; run | How does your app find all your expenses? | client.ts reads your expenses back |
| 3 Delete | `modify_expense` and `ModifyExpense` written; `DeleteExpense` with `close`; `delete_expense`; build and deploy; Edit and Delete on each row | What gives the rent back when an expense is deleted? | a delete closes an account |

Signature moments: the list coming back from a filter, read with no transaction and drawn as the records
card; a deleted row folding into "Closed #2 · 0.0015 SOL back to your wallet".

Decisions against the original are in the script. Made while building it:

* `modify_expense` and `ModifyExpense` are two writes, not one: the function goes in the module and the
  struct after `AddExpense`, and a write is one block in one place.
* `#[instruction(amount: u64)]` and the like get the same E0425 as the planned failure, with their own
  Explain: the attribute takes the arguments by position.
* The step 3 move card has row buttons only; adding more goes through the Call panel.

The finish leads up a level, to Lumberjack.

## Bank Simulator

After Bolt / Syed Aabis Akhtar's Bank Simulator (`client/public/tutorials/bank-simulator`), whose
Clockwork thread no longer runs: interest is worked out from the clock on every touch, as Lumberjack's
energy is. Script: `research/tutorials-redesign/scripts/bank-simulator.md`.

| Step | What happens | Question | Passes when |
|---|---|---|---|
| 1 Account | The opening, `BankAccount` (balance in cents), `OpenAccount` and `open_account`. The build fails on purpose: `holder_name: String` without `max_len` | Fix it: what does `holder_name` need? | the build passes after Fix it |
| 2 Money | `withdraw` and `deposit` around the guard, then `UpdateBalance` and `BankError`; deploy; Open your account with your name; Deposit, Withdraw, then withdraw more than you have | Which line guards `withdraw`? | `InsufficientFunds` (6000) comes back |
| 3 Interest | One line on Clockwork; `add_interest`, called first by both moves; build and deploy; the card shows the interest so far; a move books it | Where does `add_interest` get the minutes from? | a move books interest above zero |

Signature moments: `InsufficientFunds` by name with the balance unmoved; "Interest so far" ticking every
second on the card with no transaction, then booked exactly by the next Deposit.

Decisions against the original are in the script. Made while building it:

* `INTEREST_BPS_PER_MINUTE` sits right above `add_interest`, not under `declare_id!`: the question writes
  them as one block.
* The Withdraw field fills in $1,000 once a withdrawal has gone through, so the next press meets the guard.
* The amounts on the card are dollars and go out as cents; the Call panel takes cents, as the IDL says.

The finish points to SPL Token Vault, which the prototype doesn't run yet.

## Todo App Seahorse

After lostin's Todo App Seahorse (`client/public/tutorials/todo-app-seahorse`), the Beginner Seahorse step
after Hello Seahorse: a profile and one account per task, in Python. It uses Hello Seahorse's support
(`main`, `generated`, `SEAHORSE_CHECKS`) and the records card with two kinds of rows. Script:
`research/tutorials-redesign/scripts/todo-app-seahorse.md`.

| Step | What happens | Question | Passes when |
|---|---|---|---|
| 1 Profile | The opening, `UserProfile` and `init_user_profile`. The build fails on purpose: `user_profile` is typed `UserProfile`, so it has no `init` | Fix it: how do you tell Seahorse the profile doesn't exist yet? | the build passes after Fix it |
| 2 Tasks | The Anchor Seahorse wrote (a quote of the generated `init`); `TodoAccount`; `add_task` (padding said in a line); deploy; Create your profile, Add task twice | What should make each task's address different? | the second task lands |
| 3 Done | `mark_task_as_done` with the `assert`, and the same check in `add_task`; build and deploy; Mark done on a row, then Try as another wallet | What stops a stranger marking your task done? | the stranger's call comes back refused |

Signature moments: the generated Anchor `init` from one Python call; a stranger's call refused with the
`assert`'s own message, a panic with no number.

Decisions against the original are in the script. Made while building it:

* "See the Anchor it wrote" is the first line of step 2, a quote of the generated file, as Hello Seahorse
  shows its Rust: a win has no room for a second button.
* Top level items are a blank line apart, as Hello Seahorse writes them.
* The planned failure's check (`attribute not found: UserProfile."init".`) and `owner` stored without
  `.key()` are this lesson's own, in Seahorse's error format; the shared two come after them.

The finish points to Tic-tac-toe Seahorse.

## The Tokens family

Battle Coins, SPL Token Vault and Faucet Seahorse keep their accounts as `records`, like the Data family,
and draw them as the token card instead of the records card: `records.tokens(rows, now)` turns the rows
into a `TokenView` (the mint, its holders, a strip for the lesson's own account), and
`../ui/TokenCard.tsx` draws it wherever the records card would show (a send's result, the live move
card, the finish, the Call panel). `now` is null on a record and ticks once a second on a live card
(Faucet Seahorse's timer). `lessons/tokens.ts` holds what the three share: the token programs'
addresses, their lines in the logs, rent for a mint and a token account, the Token program's
`insufficient funds` (0x1).

What the family added to the engine, all optional:

* `tokens` as a move field kind: whole tokens on the card, base units sent, with the field's `decimals`.
* `stages` on a `send` beat: a wallet act that isn't the program's (Create your token, Open your Bitcorn
  account), with "Funding your wallet" first while the wallet is empty. Its `RecSend.log` replaces the
  terminal's lines, so the terminal shows what the wallet ran, not a call of the program.
* `signer: "stranger"` on a `send` beat: a card signed by another key. Its refusal is the answer, so the
  script goes on under it instead of putting the card back up.
* `PriceAccount` and `Clock` as Seahorse account types (the IDL and the type check).

## Battle Coins

After Jonas Hahn and John's Battle Coins (`client/public/tutorials/battle-coins`), the step after
Lumberjack: the same player, with health instead of energy, and a coin of the game's own. Script:
`research/tutorials-redesign/scripts/battle-coins.md`.

| Step | What happens | Question | Passes when |
|---|---|---|---|
| 1 Coin | The opening, `CreateCoin` (a mint at the PDA `"coin"`, its own authority, 0 decimals) and an empty `create_coin`. The build fails on purpose: `init` with `mint::` and no `token_program` | Fix it: what does `CreateCoin` need? | the build passes after Fix it |
| 2 Name | The metadata account joins `CreateCoin`, then the imports; you answer how the program signs for its PDA, and it writes the Token Metadata call. Build and deploy, then Create your coin (name and symbol on the card) | How does `create_coin` sign for the coin's PDA? | `create_coin` lands |
| 3 Reward | The constants, `PlayerData` and the error; `InitPlayer` and `init_player`; you pick how a win pays; `kill_enemy`, `Battle` and the imports. Upgrade, Join, Defeat enemy, then "Defeat until out of health" | A defeated enemy pays one coin. How does `kill_enemy` pay it? | `NotEnoughHealth` (6000) comes back |
| 4 Heal | You pick how `heal` takes the coin; `heal`, then `Burn` in the import. Upgrade, Heal | How should `heal` take the coin? | `heal` lands |

The token card's strip is the player: its PDA and health as ten cells. Every fight shows `+1` on the coin
row and on the supply; Heal shows `−1` on both. A heal with no coins (from the Call panel) comes back with
the Token program's own `insufficient funds`.

Decisions against the original are in the script. Made while building it:

* A write is one block in one place, so the script's writes that touch two places are split: `CreateCoin`
  and `create_coin` in step 1, the struct and the imports in step 2, `InitPlayer` and `init_player`,
  `Battle` and the imports in step 3, `heal` and `Burn` in step 4. Each import change is a write of its own.
* The constants sit right above `PlayerData` at the end of the file, not under `declare_id!`, so the
  player's constants, data and error are one block.
* The card's icon is drawn (a gold disc with the name's first letter), not the original's image. The
  create card takes the name and the symbol; the icon's link is the original's JSON and goes as is.
* The Heal button isn't turned off at full health: a heal then burns a coin, as in the original, and a chip
  says why.
* The 0.01 SOL Token Metadata fee is named in the terminal under the create's logs.

The finish points to Boss Battle.

## SPL Token Vault

After Jonas Hahn's SPL Token Vault (`client/public/tutorials/spl-token-vault`): a token of the learner's
own, then a vault only their key opens. Script: `research/tutorials-redesign/scripts/spl-token-vault.md`.

| Step | What happens | Question | Passes when |
|---|---|---|---|
| 1 Vault | The opening; Create your token (a wallet act: Gold, GOLD, 100 to your wallet); `OpenVault` and `open_vault`. The build fails on purpose: `owner` pays and isn't `mut` | Fix it: what does `owner` need? | the build passes after Fix it |
| 2 Deposit | You answer who authorizes the transfer; `deposit`, `VaultTransfer`, the import. Build and deploy, Open your vault, Deposit 10 | Inside `deposit`, who is the transfer's authority? | a deposit lands |
| 3 Withdraw | You answer what stops a stranger; `withdraw`. Upgrade; Withdraw as a stranger comes back 2006 with Left and Right; you withdraw | What stops someone else from emptying your vault? | your withdraw lands |

The token card has no strip: the mint (authority: your wallet) and two rows, your token account and the
vault. Deposit and Withdraw take whole tokens and send base units (9 decimals).

Decisions against the original are in the script. Made while building it:

* Create your token is a `send` card with `stages`; the terminal prints the Umi calls it stands for. The
  result card's details are the generic ones, without the Umi code.
* The planned failure's check points at `vault`, the account being created, as Anchor does; Lumberjack's
  `payerNotMut` points at the payer, so this lesson has its own.
* The stranger's try is a `send` card signed by another key, and its refusal moves the script on.
* The card says "100 to your wallet" and "Your GOLD account" with the symbol as typed, since the name and
  the symbol can be changed on the card.

The finish leads up a level, to Zero Copy.

## Faucet Seahorse

After lostin's Faucet Seahorse (`client/public/tutorials/faucet-seahorse`), the Intermediate Seahorse
step. It uses Hello Seahorse's support (`main`, `generated`, `SEAHORSE_CHECKS`) and Todo App Seahorse's
`initWithoutEmpty` (not planned here). Script: `research/tutorials-redesign/scripts/faucet-seahorse.md`.

| Step | What happens | Question | Passes when |
|---|---|---|---|
| 1 Faucet | The opening, `BitcornFaucet`, `init_faucet` (the faucet and the Bitcorn mint, both `Empty`) and `drip` minting 1,000. The build fails on purpose: `mint()` given `seeds =` | Fix it: how does the faucet sign `mint()`? | the build passes after Fix it |
| 2 Price | A quote of the generated `InitFaucet`; you answer what stops a fake price; `drip` reads Pyth's BTC/USD; the Pyth import. Build and deploy, Create the faucet, Open your Bitcorn account (a wallet act), Drip | Anyone can pass any account as the price. What stops a fake one? | a drip lands |
| 3 Limit | `clock: Clock` and `now`; you pick what stops a drip too soon; `drip` with the `assert` and `last_drip`. Upgrade, Drip twice | What should `drip` do when the last drip was less than 30 seconds ago? | the second drip is refused |

The token card's strip is the oracle: BTC/USD with its price, and from step 3 "Next drip in 0:28",
worked out by the client from `last_drip`. The mint is "Bitcorn", minted by the faucet.

Decisions against the original are in the script. Made while building it:

* "Show the Anchor" is the first line of step 2, a quote of the generated `InitFaucet` (as Todo App
  Seahorse does it): a win has no room for a second button.
* Top level items are a blank line apart, as the other Seahorse lessons write them, not two.
* The Call panel has no account picker, so "What if I pass another price?" answers in words instead of
  sending the learner to try SOL/USD there.
* The price moves by cents from drip to drip and keeps its whole dollars, so every drip pays 67,412.

The finish has no next one: Faucet Seahorse ends the Seahorse path, and All tutorials is the way on.

## The Games family

Tiny Adventure, Tiny Adventure Two, Boss Battle and Tic-tac-toe Seahorse keep their accounts as `records`,
like the Data family, and draw them as the game card instead of the records card: `records.view` names its
screen (`world`, `chest`, `boss`, `board`), and `../ui/GameCard.tsx` draws it wherever the records card
would show (a send's result, the live move card, the finish, the Call panel). The card reads the accounts
by id: `level`, `vault` and `wallet` (a level and its chest), `boss`, `game` and `o` (the board and Player
O's wallet). Grown from Lumberjack's PlayerCard: the same box and head (the account and its PDA), with the
last move's result at the head's end. Lumberjack keeps its PlayerCard and its `chop` act, as accepted.
`lessons/games.ts` holds what the four share: lamports and the wallet after a deploy, the boss's slot
clock and roll (`xorshift64` of the slot, mod 500, as the program and the client work it out), the board's
eight lines, and Player O's key.

What the family added to the engine, all optional:

* `records.view`: the game card's screen.
* `records.sentLine(s, x)`: how a send reads on its move card when the log line isn't enough
  (`→ tile 2 · ....o...`, `−401 · slot 412,385,119 · 599 left`, `X played cell 4`).
* `records.signers`: the wallets a call can be signed with, by the value of a `signer` argument the
  lesson's `args` starts it at. The game card shows them as its switch, the Call panel as a Signer field.
  `signer` picks who signs and isn't sent as data, so the terminal's call leaves it out.
* `until: { label, stop: "passed" }`: the card's first move made again until the step passes (Attack
  until the boss falls, Walk to the chest, Play to a win). A refusal or a note still stops it. A card
  whose moves are its cells (the board) has no button of its own: its until plays the row move, and
  stands under the board.
* Moves with nothing to type sit in one row on a desktop card (Move right, Move left).
* `Tx.log`: the whole log of a transaction that never reaches the program (Add Player O's transfer), for
  its receipt. The terminal's lines come from `RecSend.log`, the Tokens family's.
* `{name}` from `winVars` in a win's headline too, not only its line (Tic-tac-toe's "X won, and the
  program called it").
* A `msg!` whose text has an escape (`\\o/`) is matched to its line by the text as the log prints it.
* A panic line (`Program log: panicked at ...`) isn't lit as a `print` or `msg!` line in the log. Todo App
  Seahorse labelled its stranger's panic "from print · src/todo_app.py:21"; Tic-tac-toe's turn check
  panics the same way.

## Tiny Adventure

After Jonas Hahn's Tiny Adventure (`client/public/tutorials/tiny-adventure`), the Beginner Anchor step
after Counter PDA: one level every player shares, an account at the PDA `"level1"`. Script:
`research/tutorials-redesign/scripts/tiny-adventure.md`.

| Step | What happens | Question | Passes when |
|---|---|---|---|
| 1 World | The opening and `GameData`; you pick the seeds, `InitLevel` and `init_level` are written. The build fails on purpose: the payer, `signer`, isn't `mut` (Anchor 1.x points at `level`) | Everyone should walk the same character. What should the level's address come from? | the build passes after Fix it |
| 2 Start | Deploy; you predict what creating the level costs; Start (a `send` card) | Your level is 9 bytes. What does creating it cost? | `init_level` lands |
| 3 Move | `move_right`, `END`, `draw` and `Move` written; you pick how `move_left` stops at 0; build and deploy; Move right and Move left on the card | What should `move_left` do at position 0? | a move lands on tile 3 |

Signature moments: the level drawn in the program log on every move, `......\o/ You reached the end!`
last; the game card's four tiles with the character sliding from tile to tile.

Decisions against the original are in the script. Made while building it:

* No client.ts in the files: no step writes it, as in Counter PDA.
* `move_right` comes with `END`, `draw` and `Move`, which sit apart in lib.rs: the write is placed by the
  whole file after it, and lights only the lines it added.
* The step 3 win counts the moves (`{n}`): walking left first makes more than three.
* Move right is the card's primary, Move left beside it.

The finish points to Tiny Adventure Two.

## Tiny Adventure Two

After Jonas Hahn's Tiny Adventure Two (`client/public/tutorials/tiny-adventure-two`): Tiny Adventure's
level with a chest vault at its own PDA, filled through a CPI and paid out by moving lamports directly.
Script: `research/tutorials-redesign/scripts/tiny-adventure-two.md`.

| Step | What happens | Question | Passes when |
|---|---|---|---|
| 1 Chest | lib.rs starts as Tiny Adventure's program. The vault, the `chest` flag and `SpawnChest` are written; you say who moves your wallet's SOL, the CPI is written. The build fails on purpose: E0308, `CpiContext::new` given the System Program's account | Who can move SOL out of your wallet? | the build passes after Fix it |
| 2 Spawn | Deploy; Start (level and vault); you say who can take the chest's SOL out; Spawn chest | Spawn chest puts 0.1 SOL in an account your program owns. Who can take it out? | `spawn_chest` lands |
| 3 Reward | You pick how `move_right` pays; `Move` gets the vault and the player; build and deploy; walk right, or Walk to the chest | How does `move_right` pay the player? | the move onto tile 3 pays 0.1 SOL |

Signature moments: the balance row on the game card (`Chest 0.1 SOL · Your wallet 3.6281 SOL`) with
`−0.1` and `+0.1` beside the numbers as they move; the CPI in Spawn chest's receipt, and none in the payout.

Decisions against the original are in the script. Made while building it:

* Step 2's question comes before Spawn chest, not after it: the step passes on the spawn, so a question
  after it would never be asked. It reads as a prediction now ("Spawn chest puts 0.1 SOL...").
* "Walk to the chest" stands beside Move right, as every until does, and stops when the chest pays.
* At the end with an empty chest, a walk right says to spawn another from the Call panel instead of
  sending: an until would otherwise walk on the spot for ever.
* The wallet on the card is worked out from the 5 SOL airdrop, the deploy, the upgrades and every send,
  so it ends at 3.7279 SOL as the script's table does.

The finish points to Expense Tracker.

## Boss Battle

After Jonas Hahn and John's Boss Battle (`client/public/tutorials/boss-battle`): one boss at the PDA
`"boss"`, damage rolled from the slot with XORShift. Script: `research/tutorials-redesign/scripts/boss-battle.md`.

| Step | What happens | Question | Passes when |
|---|---|---|---|
| 1 Roll | The opening, `Boss`, `Respawn` and `respawn`; you pick the seed, `roll_damage` and `xorshift64` are written. The build fails on purpose: E0277, `?` in a function that returns `u64` | So what can `attack` use as a seed? | the build passes after Fix it |
| 2 Attack | `BossDefeated`; you pick how health stops at 0, `attack` and `Attack` written; build and deploy; Respawn (a `send` card); Attack, then Attack until the boss falls | The roll can be bigger than the health left. What should `attack` do? | an attack takes the boss to 0 |
| 3 Predict | You say what a public seed allows; client.ts runs the same XORShift on the next five slots; Respawn; Attack, and the hit is the one the strip called | So what can a player do, knowing that? | an attack lands with the strip on |

Signature moments: the boss falling at 0 with `saturating_sub`; the Next hits strip on the game card,
worked out by the client from the slot, and the attack landing on the slot it outlines.

Decisions against the original are in the script. Made while building it:

* The slot clock starts at 412,385,117 when the lesson starts and moves on one slot every 400 ms. An attack
  lands in the slot after the one the clock is at, and rolls what `xorshift64` gives for it, so the rolls
  are real results of the formula, not the script's examples.
* The fixed build passes with no warning line: the prototype's build log has none.
* Respawn stays on the attack card as its second button, not only once the boss is down.
* The client's run is a records read, so its card reads "Read 1 slot · No transaction" and shows the boss
  with the strip turned on.
* `fell` keeps how many hits the boss took to fall, so the finish still says it after step 3's respawn.

The finish points to Bank Simulator.

## Tic-tac-toe Seahorse

After lostin's Tic-tac-toe Seahorse (`client/public/tutorials/tictactoe-seahorse`): a two player game in
one account, in Python, with a second Playground wallet for O. It uses Hello Seahorse's support (`main`,
`generated`, `SEAHORSE_CHECKS`). Script: `research/tutorials-redesign/scripts/tictactoe-seahorse.md`.

| Step | What happens | Question | Passes when |
|---|---|---|---|
| 1 Board | The opening; you pick how the board is stored, `Game` and `init_game` are written. The build fails on purpose: `type mismatch - expected an instance of Pubkey, found an instance of Signer` | How should the 3x3 board be stored? | the build passes after Fix it |
| 2 Turns | You pick how `play_game` knows who moves, it's written; build and deploy; Add Player O; New game; play X, then X again | How does `play_game` know who's moving? | a move is refused with `Not your turn` |
| 3 Win | You say who decides a win; the `win_check` call, `GameState`, `win_check` and the over check are written; build and deploy; play on, or Play to a win | Who decides that someone has won? | the game ends: a win or a draw |

Signature moments: `Not your turn` from devnet with the board unchanged; the winning line struck through
on the card, `X wins` in the log, and the next move refused with `This game is over`.

Decisions against the original are in the script. Made while building it:

* Top level items are a blank line apart, as the other Seahorse lessons write them (the engine keeps one
  blank line between blocks), so the planned failure is on line 15, not the script's 17.
* Add Player O is a `send` card with the Tokens family's `stages`: a wallet act, not the program's, its
  terminal lines the wallet's commands and its receipt the System Program's transfer.
* The board's cells are the move card's row move: a click sends `play_game` with that cell, signed by the
  wallet on the switch. In step 2 the switch starts on X and stays there after X's move; in step 3 it
  follows the turn. Each flip lasts until the board changes.
* After O's move in step 2 its row on the card says to try a move out of turn.
* In step 2 the move that would fill the board gets a note instead: the program can't end a game yet,
  and the account holds one game, so the last cell waits for step 3.
* "Play to a win" plays X toward the line it's closest to and O anywhere off it.
* The generated Rust is trimmed to the accounts structs and `play_game`'s checks, each `assert` as the
  `panic!` it becomes.
* The name is written "Tic-tac-toe Seahorse" everywhere (the original catalog says "Tictactoe Seahorse").

The finish leads up a level, to Faucet Seahorse.
