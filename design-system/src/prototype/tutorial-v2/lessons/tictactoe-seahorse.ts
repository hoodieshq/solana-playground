import { holds, lineOf, straightQuotes, uncomment } from "../check"
import type { State } from "../store"
import { WALLET, shortKey } from "./common"
import { FEE, LINES, PLAYER_O, lineOf as winningLine } from "./games"
import { SYSTEM_CPI, inUse, sentSoFar, signatureOf } from "./records"
import { GENERATED, SEAHORSE_CHECKS } from "./seahorse"
import type { Lesson, Rec, RecSend, Sent, SpecialCheck, Step, Tx } from "./types"

// Tic-tac-toe Seahorse: a two player game in one account, in Python. Step 1 keeps the board in a fixed
// `Array` (the planned failure: a `Signer` stored where a `Pubkey` goes), step 2 lets only the wallet
// whose turn it is move, with a second wallet for O, step 3 has the program check for a win after every
// move and end the game. After lostin's Tic-tac-toe Seahorse. The game card in its `board` view

/** The program's file: Playground names a Seahorse program after it */
const MAIN = "src/tictactoe.py"

const PROGRAM_ID = "9cRkwDDBTsjPHFZqHB9RmbdTKXDDABRFdjmF9MsdLb3T"
const IDL_ACCOUNT = "BoPPdPdHmdqF3fqM39T3HmBqTdowMDVb11fyfhoyq7HZ"
/** Your game's address: the PDA from 'ttt' and your wallet */
const GAME_PDA = "bsMh3P1uHmhHTKjfbXujyVydbDZgFBZ1o9ybTfm1ZDMs"
const GAME_SIGNATURE = "K9fDBXFwHTVfKP7VFyfqKuX7M3bH3jwjmhdFy3BhTTwZFXbTXofVwhhssodKwBdFjRXFHPXydyT37mfMoy9M5Vu3"

/** The game's rent: 83 bytes, (128 + 83) × 6,960 lamports */
const RENT = 0.00146856
/** What your wallet sends Player O for its fees: 0.01 SOL */
const FOR_O = 10_000_000

// The program, piece by piece, in the order it sits in tictactoe.py

const BOIL = `from seahorse.prelude import *

declare_id('11111111111111111111111111111111')`

const GAME_STATE = `# How a game can stand after a move
class GameState(Enum):
  InProgress = 0
  XWins = 1
  OWins = 2
  Draw = 3`

const GAME = `# One game: the board, who plays X and O, whose turn it is and how it stands
class Game(Account):
  grid: Array[u8, 9]         # cells 0 to 8, row by row: 0 empty, 1 X, 2 O
  players: Array[Pubkey, 2]  # X, then O
  turn: u8                   # 1 for X, 2 for O
  state: u8                  # 0 while it's on, then a GameState`

const X_BROKEN = "  game.players[0] = owner"
const X_FIXED = "  game.players[0] = owner.key()"

const initFn = (fixed: boolean) => `@instruction
def init_game(owner: Signer, player_o: Pubkey, game: Empty[Game]):
  game = game.init(payer = owner, seeds = ['ttt', owner])
${fixed ? X_FIXED : X_BROKEN}
  game.players[1] = player_o
  game.turn = 1`

const WIN_CHECK = `# The rulebook: eight lines win, and a full board without one is a draw
def win_check(grid: Array[u8, 9], player: u8) -> GameState:
  if (
    (grid[0] == player and grid[1] == player and grid[2] == player) or
    (grid[3] == player and grid[4] == player and grid[5] == player) or
    (grid[6] == player and grid[7] == player and grid[8] == player) or
    (grid[0] == player and grid[3] == player and grid[6] == player) or
    (grid[1] == player and grid[4] == player and grid[7] == player) or
    (grid[2] == player and grid[5] == player and grid[8] == player) or
    (grid[0] == player and grid[4] == player and grid[8] == player) or
    (grid[2] == player and grid[4] == player and grid[6] == player)
  ):
    if player == 1:
      return GameState.XWins
    else:
      return GameState.OWins

  for i in range(9):
    if grid[i] == 0:
      return GameState.InProgress

  return GameState.Draw`

const OVER = "  assert game.state == 0, 'This game is over'"
const TURN = "  assert game.players[game.turn - 1] == player.key(), 'Not your turn'"

const SWITCH = `  if game.turn == 1:
    game.turn = 2
  else:
    game.turn = 1`

const RESULT = `  result = win_check(Array(game.grid, len = 9), game.turn)

  if result == GameState.XWins:
    game.state = 1
    print('X wins')
  elif result == GameState.OWins:
    game.state = 2
    print('O wins')
  elif result == GameState.Draw:
    game.state = 3
    print('Draw')
  elif game.turn == 1:
    game.turn = 2
  else:
    game.turn = 1`

const playFn = (refereed: boolean, over: boolean) => `@instruction
def play_game(player: Signer, game: Game, cell: u8):${over ? `\n${OVER}` : ""}
${TURN}
  assert cell < 9, 'That cell is off the board'
  assert game.grid[cell] == 0, 'That cell is taken'

  game.grid[cell] = game.turn
${refereed ? RESULT : SWITCH}`

type Parts = { game?: boolean; init?: "broken" | "fixed"; play?: boolean; refereed?: boolean; rules?: boolean; over?: boolean }

/** tictactoe.py with the pieces written so far, each in its place */
function py(p: Parts) {
  return [BOIL, p.rules && GAME_STATE, p.game && GAME, p.init && initFn(p.init === "fixed"), p.rules && WIN_CHECK, p.play && playFn(!!p.refereed, !!p.over)].filter(Boolean).join("\n\n")
}

const S1 = { game: true, init: "fixed" } as const
const S2 = { ...S1, play: true } as const
const PY_BROKEN = py({ ...S1, init: "broken" })
const PY_S1 = py(S1)
const PY_S2 = py(S2)
const PY_REFEREED = py({ ...S2, refereed: true })
const PY_RULES = py({ ...S2, refereed: true, rules: true })
const PY_S3 = py({ ...S2, refereed: true, rules: true, over: true })

/** The line that stores the signer as X, which the planned failure points at */
const X_LINE = PY_BROKEN.split("\n").indexOf(X_BROKEN) + 1

const EXPLAIN_ERROR = `\`players\` holds two \`Pubkey\`s: addresses. \`owner\` is a \`Signer\`, the account that signed this transaction, and it isn't an address itself. An account can keep your address for as long as the game lasts; the signature is only good for this one transaction.`

const MAINTAINED =
  "Seahorse hasn't had a release since January 2024. It's a good way into Solana if you know Python; for programs you'll ship, Anchor is the standard."

const UPGRADES = `Upgrades ${shortKey(PROGRAM_ID, 4).replace("…", "…⁠")} in place · from your wallet`

/** The Rust a build writes from tictactoe.py, trimmed to the accounts structs Seahorse makes and the
 * checks `play_game` starts with: each `assert` becomes a `panic!` with its message */
function rustOf(src: string): string {
  const code = uncomment(straightQuotes(src))
  const has = (fn: string) => new RegExp(`def\\s+${fn}\\s*\\(`).test(code)
  const init = has("init_game")
    ? `#[derive(Accounts)]
#[instruction(player_o: Pubkey)]
pub struct InitGame<'info> {
    #[account(mut)]
    pub owner: Signer<'info>,
    #[account(
        init,
        space = std::mem::size_of::<dot::program::Game>() + 8,
        payer = owner,
        seeds = ["ttt".as_bytes().as_ref(), owner.key().as_ref()],
        bump
    )]
    pub game: Box<Account<'info, dot::program::Game>>,
    pub system_program: Program<'info, System>,
}`
    : null
  const asserts = [...code.matchAll(/^\s*assert\s+(.+?),\s*'([^']*)'\s*$/gm)].map(([, cond, msg]) => `    if !(${cond.trim()}) {\n        panic!("${msg}");\n    }`)
  const play = has("play_game")
    ? `#[derive(Accounts)]
#[instruction(cell: u8)]
pub struct PlayGame<'info> {
    #[account(mut)]
    pub player: Signer<'info>,
    #[account(mut)]
    pub game: Box<Account<'info, dot::program::Game>>,
}

pub fn play_game_handler<'info>(mut player: SeahorseSigner<'info, '_>, mut game: Mutable<LoadedGame<'info, '_>>, mut cell: u8) -> () {
${asserts.join("\n")}
    // ...
}`
    : null
  return [
    "// Seahorse wrote this from tictactoe.py on your last build. Read only: edit tictactoe.py instead.\n// Trimmed to the accounts structs and play_game's checks: the imports and Seahorse's helper module are left out.",
    init,
    play,
  ]
    .filter(Boolean)
    .join("\n\n")
}

const STEPS: Step[] = [
  {
    id: "board",
    title: "The board",
    short: "Board",
    objective: "Keep a game of tic-tac-toe in one account",
    learned: "A game's whole state is one account of a fixed size: the board is nine cells in an Array",
    file: MAIN,
    start: "",
    target: PY_S1,
    goal: "build",
    beats: [
      {
        kind: "write",
        id: "s1.boil",
        text: "Same opening as Hello Seahorse: the prelude and the program's id. Seahorse turns this Python into an Anchor program when you build.",
        writes: { file: MAIN, block: BOIL, ref: py({}) },
      },
      {
        kind: "say",
        id: "s1.board",
        text: "The game lives in one account: the board, who plays X and O, whose turn it is and how the game stands. An account's size is fixed when it's created, so every field needs a size Seahorse knows up front.",
      },
      {
        kind: "ask",
        id: "s1.q1",
        kicker: "Question",
        n: 1,
        question: "How should the 3x3 board be stored?",
        options: ["`List[List[u8]]`: three rows of three", "`Array[u8, 9]`: nine cells in a row, 0 empty, 1 X, 2 O", "`str`, like `'X.O......'`"],
        code: false,
        answer: 1,
        right: "Yes. An `Array` has a fixed length, so Seahorse can size the account: 9 bytes for the board. Cell 4 is the middle, and a row is three cells in a row. I've written `Game` with it.",
        why: [
          "A list has no fixed length, and the account's size is set when it's created. Nine cells in a fixed array fit exactly.",
          null,
          "A string's length isn't fixed either, and every move would mean rebuilding text. Numbers in fixed cells are cheaper to check.",
        ],
        hint: "The account's size is set once, when it's created.",
        writes: { file: MAIN, block: GAME, ref: py({ game: true }) },
        key: "grid: Array[u8, 9]",
        typed: "That's the board. I've written the rest of `Game` around it: the two players, the turn and the state.",
      },
      {
        kind: "write",
        id: "s1.init",
        text: "And `init_game`, which starts a game. The account is a PDA from `'ttt'` and your wallet, so each wallet has one game. You're X, and O is the key you pass in.",
        writes: { file: MAIN, block: initFn(false), ref: PY_BROKEN },
      },
      {
        kind: "act",
        id: "s1.build",
        act: "build",
        say: "That's the board. Let's build it.",
        title: "Build tictactoe.py",
        context: "Compiles tictactoe.py to Anchor with Seahorse, then builds it",
        button: "Build",
      },
    ],
    planned: "This one's on purpose. Everyone who stores their first player in Seahorse meets it, so let's meet it now.",
    plannedShort: `\`players\` holds addresses, and line ${X_LINE} puts the whole signer in it.`,
    onFail: [
      { kind: "say", id: "f1.explain", text: EXPLAIN_ERROR, quote: { file: MAIN, line: X_LINE, mark: "owner", tone: "error" } },
      {
        kind: "ask",
        id: "f1.q",
        kicker: "Fix it",
        question: "So what goes into `players[0]`?",
        options: ["game.players[0] = owner.key()", "players: Array[Signer, 2]", "game.players[0] = game.key()"],
        code: true,
        answer: 0,
        right: "Exactly. `.key()` gives the signer's address, and that's what the game keeps. Every move in the next step is checked against it.",
        why: [
          null,
          "An account can't keep a signer: a signature lasts for one transaction. What it can keep is the address.",
          "That's the game account's own address. X is the wallet that signed, `owner`.",
        ],
        hint: "A `Signer` has an address. How do you ask it for one?",
        writes: { file: MAIN, block: X_FIXED, ref: PY_S1, start: PY_BROKEN },
        key: "game.players[0] = owner.key()",
        typed: "That's the line. The game now keeps your address as X.",
      },
      {
        kind: "act",
        id: "f1.build",
        act: "build",
        say: "Build again.",
        title: "Build tictactoe.py",
        context: "Same build, X stored by its address",
        button: "Build",
      },
    ],
    win: {
      id: "s1.win",
      headline: "Your game has a board",
      line: "Seahorse turned your Python into an Anchor program, and the IDL shows `init_game` and a `Game` of 83 bytes: 9 cells, 2 players, the turn and the state.",
      stats: [
        { icon: "hammer", text: "Built in 2.1 s" },
        { icon: "braces", text: "83 bytes" },
        { icon: "clock", text: "{took}" },
      ],
    },
    explainStep:
      "This step writes the game's account, the board in a fixed `Array` of nine cells, and `init_game`, which creates it at a PDA from your wallet. The first build fails on purpose: a player is kept by address, not as the signer.",
    chips: [
      {
        label: "What does Seahorse make?",
        match: /\bseahorse\b.*\bmake\b|\bwhat is seahorse\b/i,
        answer: "An Anchor program in Rust. The build compiles your Python to it first, then builds that. `@instruction` becomes an instruction, `Account` an account.",
      },
      {
        label: "Why one game per wallet?",
        match: /\bone game\b|\bper wallet\b/i,
        answer: "The seeds are `'ttt'` and your wallet, so your game has one address. A game number in the seeds would give you more.",
      },
      {
        label: "What is Empty?",
        match: /\bempty\b/i,
        answer: "`Empty[Game]` is an account that doesn't exist yet. `game = game.init(...)` creates it and gives back the `Game`.",
      },
    ],
    errorChips: [
      {
        label: "Signer or Pubkey?",
        match: /\bsigner\b|\bpubkey\b/i,
        answer: "A `Signer` is an account that signed this transaction: you can ask it for its key or make it pay. A `Pubkey` is only an address, and that's what an account can keep.",
      },
      {
        label: "Where is this in the docs?",
        match: /\b(docs?|documentation)\b/i,
        answer: "The Seahorse docs cover it in the prelude's reference, under `Signer`: its `key()` is the address.",
      },
    ],
    answers: [
      { match: /why.*(fail|error)/i, answer: EXPLAIN_ERROR, local: true },
      { match: /maintain|still (alive|used|supported)|deprecated|abandon/i, answer: MAINTAINED },
    ],
  },
  {
    id: "turns",
    title: "Turns",
    short: "Turns",
    objective: "Let only the player whose turn it is move",
    learned: "On chain a player is a wallet that signs: the program decides whose move it is by the signer",
    file: MAIN,
    start: PY_S1,
    target: PY_S2,
    goal: "move",
    beats: [
      {
        kind: "say",
        id: "s2.who",
        text: "Tic-tac-toe takes two players, and on chain a player is a wallet that signs. `play_game` has to know who sent the move, and refuse anyone whose turn it isn't.",
      },
      {
        kind: "ask",
        id: "s2.q2",
        kicker: "Question",
        n: 2,
        question: "How does `play_game` know who's moving?",
        options: [
          "A number the move carries, `played_by`: 1 for X, 2 for O",
          "The client: it only lets the player whose turn it is click",
          "The signer: it compares `player.key()` with the wallet whose turn it is",
        ],
        code: false,
        answer: 2,
        right: "Right. Only the holder of a wallet's key can sign for it, so the signer is who's playing. If it isn't the wallet whose turn it is, `assert` stops the move. I've written `play_game` around that check.",
        why: [
          "Anyone could send `played_by = 2` and move for O. A number in the move is whatever the sender types; a signature can't be faked.",
          "Anyone can write their own client and skip that. Only the program's own checks hold for everyone.",
          null,
        ],
        hint: "What in a transaction can't someone else make for you?",
        writes: { file: MAIN, block: playFn(false, false), ref: PY_S2 },
        key: "assert game.players[game.turn - 1] == player.key(), 'Not your turn'",
        typed: "That's the check. I've written the rest of `play_game` around it.",
      },
      {
        kind: "say",
        id: "s2.asserts",
        text: "The two checks under it work the same way: the cell has to be on the board and empty. An `assert` that fails stops the move with its message, and nothing on the board changes.",
      },
      {
        kind: "act",
        id: "s2.ship",
        act: "buildDeploy",
        say: "Build and deploy: Seahorse compiles, then devnet gets the program for the first time.",
        title: "Build and deploy",
        context: "From your Playground wallet · free devnet SOL",
        button: "Build and deploy",
      },
      {
        kind: "act",
        id: "s2.wallet",
        act: "send",
        ix: "transfer",
        say: "One browser, two players. I'll add a second wallet in Playground for O, the way Wallet › Add does, and send it 0.01 SOL from yours so it can pay its own moves.",
        title: "Add Player O",
        context: "Makes a second devnet wallet · 0.01 SOL from yours",
        button: "Add Player O",
        record: `Added Player O · ${shortKey(PLAYER_O, 4)}`,
        stages: ["Making a second wallet", "Sending 0.01 SOL to Player O"],
      },
      {
        kind: "act",
        id: "s2.new",
        act: "send",
        ix: "init_game",
        say: "Start a game: you're X, Player O is O. Your wallet pays the deposit for the game account.",
        title: "New game",
        context: `Sends \`init_game\` with O as \`${shortKey(PLAYER_O, 4)}\` · rent and fee from your wallet`,
        button: "New game",
        record: "Started a game",
      },
      {
        kind: "act",
        id: "s2.play",
        act: "move",
        say: "Play a cell as X. Then, still as X, try another one before O has moved.",
        title: "Play",
        context: "Sends `play_game` with the cell you pick · signed by the wallet on the switch",
        button: "Play",
        moves: [{ ix: "play_game", button: "Play", row: "Game" }],
        record: "Played",
      },
    ],
    win: {
      id: "s2.win",
      headline: "Only the player whose turn it is can move",
      line: "X's move landed, then the program refused X again with `Not your turn`. Who's playing is whoever signed, and no client can change that.",
      stats: [
        { icon: "alert", text: "Not your turn" },
        { icon: "braces", text: "2 wallets" },
        { icon: "clock", text: "{took}" },
      ],
      extra: "openTest",
    },
    testWin: "You played from the Call panel with each wallet as the signer, and the program refused the one whose turn it wasn't.",
    explainStep: "This step writes `play_game`, which checks the signer against the wallet whose turn it is, then adds Player O, starts a game and has X try to move twice.",
    chips: [
      {
        label: "Why no error number?",
        match: /\bnumber\b|\bcode\b/i,
        answer: "Seahorse turns `assert` into a Rust `panic!` with your message. The move fails and the message is in the logs, but there's no error code a client could match on.",
      },
      {
        label: "Can I play against myself?",
        match: /\bmyself\b|\bagainst\b/i,
        answer: "This program lets you: nothing checks that O isn't you. One `assert` in `init_game` would.",
      },
      {
        label: "Who pays O's moves?",
        match: /\bpays?\b|\bfee\b/i,
        answer: "O's own wallet, from the 0.01 SOL you sent it: 0.000005 SOL a move.",
      },
    ],
    answers: [{ match: /maintain|still (alive|used|supported)|deprecated|abandon/i, answer: MAINTAINED }],
  },
  {
    id: "win",
    title: "The referee",
    short: "Win",
    objective: "Let the program decide who has won",
    learned: "The program is the referee: it checks for a win after every move and ends the game itself",
    file: MAIN,
    start: PY_S2,
    target: PY_S3,
    goal: "move",
    beats: [
      {
        kind: "say",
        id: "s3.why",
        text: "The board fills up, and nothing in the program knows when someone has three in a row. Someone has to look at the board after every move and say.",
      },
      {
        kind: "ask",
        id: "s3.q3",
        kicker: "Question",
        n: 3,
        question: "Who decides that someone has won?",
        options: ["The client, when it sees three in a row on the board", "The program, after every move, before the next one is allowed", "The players: the winner sends a `claim_win`"],
        code: false,
        answer: 1,
        right: "Yes. The move that makes three in a row also ends the game, in the same transaction, so there's no moment where the board says one thing and the game another. I've written the call.",
        why: [
          "A client can draw a win, but the account would still say the game is on, and the loser could keep playing. Only the program can end it.",
          null,
          "Then the program would have to check the board anyway, or anyone could claim a win. Checking on every move saves the extra step.",
        ],
        hint: "Who is the only one every player has to go through?",
        writes: { file: MAIN, block: RESULT, ref: PY_REFEREED },
        key: "result = win_check(Array(game.grid, len = 9), game.turn)",
        typed: "That's the call. I've written what each result does: a win or a draw ends the game, anything else passes the turn.",
      },
      {
        kind: "write",
        id: "s3.rules",
        text: "`win_check` is the rulebook: eight lines win, three rows, three columns and two diagonals, and a full board without one is a draw. `GameState` names the four ways a game can stand.",
        writes: { file: MAIN, block: PY_RULES, ref: PY_RULES },
      },
      {
        kind: "write",
        id: "s3.over",
        text: "And once someone has won, the board takes no more moves.",
        writes: { file: MAIN, block: OVER, ref: PY_S3 },
      },
      {
        kind: "act",
        id: "s3.ship",
        act: "buildDeploy",
        say: "Build and deploy. Your game keeps its board: an upgrade changes the program, not the account.",
        title: "Build and deploy",
        context: UPGRADES,
        button: "Build and deploy",
      },
      {
        kind: "act",
        id: "s3.play",
        act: "move",
        say: "Play on. From now the card signs as whoever's turn it is.",
        title: "Play to the end",
        context: "Sends `play_game` · signed by whoever's turn it is",
        button: "Play",
        moves: [{ ix: "play_game", button: "Play", row: "Game" }],
        until: { label: "Play to a win", stop: "passed" },
        record: "Played to the end",
      },
    ],
    win: {
      id: "s3.win",
      headline: "{result}, and the program called it",
      line: "The move that {how} also ended the game: `state` is {state}, and any move after it is refused with `This game is over`.",
      stats: [
        { icon: "braces", text: "8 lines checked" },
        { icon: "zap", text: "{n} moves" },
        { icon: "clock", text: "{took}" },
      ],
    },
    testWin: "You finished the game from the Call panel, and the program ended it on the winning move.",
    explainStep: "This step has the program check the board after every move: `win_check` finds three in a row or a full board, and the move that makes one ends the game.",
    chips: [
      {
        label: "Can we play again?",
        match: /\bagain\b|\brematch\b/i,
        answer: "Not in this account: it's one game per wallet, and it's over. A `reset_game` instruction, or a game number in the seeds, would allow a rematch.",
      },
      {
        label: "Why Array(game.grid, len = 9)?",
        match: /\barray\(/i,
        answer: "`win_check` takes a plain array, and `game.grid` is a field of an account. `Array(...)` copies it into one Seahorse can pass to a function.",
      },
    ],
    answers: [{ match: /maintain|still (alive|used|supported)|deprecated|abandon/i, answer: MAINTAINED }],
  },
]

/** A Seahorse compiler error, as the terminal prints it: the error, where, the line and a caret */
function seahorseError(c: Parameters<SpecialCheck>[0], line: number, column: number, span: number, error: string, reason: string, explain: string, planned = false) {
  const row = c.code.split("\n")[line - 1]?.trimEnd() ?? ""
  return {
    ok: false as const,
    planned,
    line,
    column,
    span,
    log: [...c.head, `Error: ${error}`, ` --> ${c.file}:${line}:${column}`, `${line} | ${row}`, `${" ".repeat(String(line).length)} | ${" ".repeat(column - 1)}^`, `${c.failed}: Seahorse compile failed`],
    reason: `${c.failed}: ${reason}`,
    explain,
  }
}

/** The `Signer` parameters of each `@instruction` function, by name */
const signersIn = (bare: string) => new Set([...bare.matchAll(/@instruction\s*\n\s*def\s+\w+\s*\(([^)]*)\)/g)].flatMap((m) => m[1].split(",").map((p) => p.split(":").map((x) => x.trim())).filter(([, t]) => t === "Signer").map(([n]) => n)))

/** A `Signer` stored where a `Pubkey` goes: the planned failure */
const signerAsPubkey: SpecialCheck = (c) => {
  const signers = signersIn(c.bare)
  const rows = c.bare.split("\n")
  const at = rows.findIndex((r) => {
    const m = r.match(/^\s*[\w.]+(?:\[[^\]]*\])?\s*=\s*(\w+)\s*$/)
    return !!m && signers.has(m[1])
  })
  if (at === -1) return null
  const line = at + 1
  const name = rows[at].match(/=\s*(\w+)\s*$/)![1]
  const column = rows[at].lastIndexOf(name) + 1
  return seahorseError(
    c,
    line,
    column,
    name.length,
    "type mismatch - expected an instance of Pubkey, found an instance of Signer.",
    `line ${line} stores the signer \`${name}\` where an address goes.`,
    EXPLAIN_ERROR,
    true
  )
}

/** `.init(...)` whose result isn't kept: the parameter is still the `Empty[...]` it was, with no fields */
const emptyNotKept: SpecialCheck = (c) => {
  const rows = c.bare.split("\n")
  for (const [i, row] of rows.entries()) {
    const m = row.match(/^\s*(\w+)\.init\(/)
    if (!m) continue
    const type = c.bare.match(new RegExp(`\\b${m[1]}\\s*:\\s*Empty\\[(\\w+)\\]`))?.[1]
    if (!type) continue
    const use = rows.findIndex((r, k) => k > i && new RegExp(`\\b${m[1]}\\.(?!init\\b)(\\w+)`).test(r))
    if (use === -1) continue
    const field = rows[use].match(new RegExp(`\\b${m[1]}\\.(\\w+)`))![1]
    const column = rows[use].indexOf(`${m[1]}.${field}`) + 1
    return seahorseError(
      c,
      use + 1,
      column,
      `${m[1]}.${field}`.length,
      `attribute not found: Empty[${type}]."${field}".`,
      `line ${use + 1} reads \`${field}\` from an account that's still \`Empty\`.`,
      `\`${m[1]}.init(...)\` on line ${i + 1} creates the account and gives back the \`${type}\`, but nothing keeps it: \`${m[1]}\` is still the \`Empty[${type}]\`, which has no fields. Write \`${m[1]} = ${m[1]}.init(...)\`.`
    )
  }
  return null
}

const CHECKS: SpecialCheck[] = [signerAsPubkey, emptyNotKept, ...SEAHORSE_CHECKS]

// ---- The board and the two wallets: what the program does with them, worked out the way it would

const recOf = (s: State, id: string) => s.records?.find((r) => r.id === id) ?? null

/** What the program on devnet does: whether it has `play_game`, checks for a win, and stops a game that's over */
const deployed = (s: State, snippet: string) => s.deployedLib !== null && holds(s.deployedLib, snippet)
const plays = (s: State) => deployed(s, "def play_game(player: Signer, game: Game, cell: u8):")
const referees = (s: State) => deployed(s, "result = win_check(Array(game.grid, len = 9), game.turn)")
const stops = (s: State) => deployed(s, OVER)

/** The cell "Play to a win" picks for whoever's turn it is: X goes for the line it's closest to, O plays
 * anywhere off it, so the quickest win is X's. -1 on a full board */
function nextCell(grid: string, turn: number) {
  const empty = [...grid].flatMap((c, i) => (c === "0" ? [i] : []))
  if (!empty.length) return -1
  const open = LINES.filter((l) => l.every((i) => grid[i] !== "2")).sort((a, b) => b.filter((i) => grid[i] === "1").length - a.filter((i) => grid[i] === "1").length)
  const target = open[0] ?? []
  if (turn === 1) return target.find((i) => grid[i] === "0") ?? empty[0]
  const wins = (i: number) => !!winningLine(grid.slice(0, i) + "2" + grid.slice(i + 1), "2")
  return empty.find((i) => !target.includes(i) && !wins(i)) ?? empty.find((i) => !target.includes(i)) ?? empty[0]
}

/** Who signs a move nobody picked a signer for: you as X while the turns are being learned, then whoever's turn it is */
const defaultSigner = (s: State) => (s.step >= 2 && Number(recOf(s, "game")?.values.turn) === 2 ? "O" : "X")

function args(s: State, ix: string): Record<string, string> {
  if (ix === "init_game") return { player_o: PLAYER_O }
  if (ix === "play_game") {
    const game = recOf(s, "game")
    const cell = game ? nextCell(String(game.values.grid), Number(game.values.turn)) : 4
    return { cell: String(Math.max(cell, 0)), signer: defaultSigner(s) }
  }
  return {}
}

/** Where the panic of each `assert` points in the Rust Seahorse wrote: example lines */
const PANIC_AT: Record<string, string> = {
  "This game is over": "src/dot/program.rs:94:13",
  "Not your turn": "src/dot/program.rs:96:13",
  "That cell is off the board": "src/dot/program.rs:98:13",
  "That cell is taken": "src/dot/program.rs:100:13",
}

/** A failed `assert`: a panic with its message, and no error number */
function panic(signature: string, message: string, s: State): Tx {
  return {
    instruction: "play_game",
    said: "",
    signature,
    compute: 3180,
    error: { name: "Panic", number: 0, message, line: lineOf(s.deployedLib ?? "", message), log: [`Program log: panicked at ${PANIC_AT[message]}: ${message}`], failed: "SBF program panicked" },
  }
}

/** One send, from a card or the Call panel, answered as devnet would: Player O's wallet first, then the
 * game, then the moves, each `assert` of the program as deployed checked in its order */
function send(s: State, ix: string, given?: Record<string, string>): RecSend | { note: string } {
  const records = s.records ?? []
  const o = recOf(s, "o")
  const game = recOf(s, "game")
  const signature = game ? signatureOf(sentSoFar(s) + 93) : GAME_SIGNATURE
  if (ix === "transfer") {
    if (o) return { note: `Player O is already in your wallet list: \`${shortKey(PLAYER_O, 4)}\`.` }
    const added: Rec = { id: "o", kind: "Wallet", pda: PLAYER_O, values: { lamports: FOR_O }, rent: 0 }
    const tx: Tx = {
      instruction: "transfer",
      said: "",
      signature: signatureOf(sentSoFar(s) + 91),
      compute: 150,
      log: ["Program 11111111111111111111111111111111 invoke [1]", "Program 11111111111111111111111111111111 success"],
    }
    // Playground's wallet does this, not the program: the terminal shows the wallet's commands
    const log = [`$ solana-keygen new · Player O ${shortKey(PLAYER_O, 4)}`, `$ solana transfer ${shortKey(PLAYER_O, 4)} 0.01`, "Sending transaction...", ...tx.log!, `Player O ${shortKey(PLAYER_O, 4)} · 0.01 SOL`]
    return { tx, records: [added, ...records], log }
  }
  if (ix === "init_game") {
    if (game) return { tx: inUse("init_game", GAME_PDA, signature), records, refused: "Already in use · one game per wallet, and yours exists" }
    const created: Rec = { id: "game", kind: "Game", pda: GAME_PDA, values: { grid: "000000000", turn: 1, state: 0, o: given?.player_o ?? PLAYER_O }, rent: RENT }
    return { tx: { instruction: "init_game", said: "", signature, compute: 8410, inner: SYSTEM_CPI }, records: [...records, created] }
  }
  if (ix === "play_game") {
    if (!game) return { note: "Start a game first, with `init_game`." }
    if (!plays(s)) return { note: "Devnet still runs the program without `play_game`. Build and deploy it first." }
    const { cell: c, signer } = { ...args(s, ix), ...given }
    if (signer === "O" && !o) return { note: "Add Player O first: that's the wallet that signs as O." }
    const cell = Number(c)
    if (cell < 0) return { note: "The board is full: there's no cell left to play." }
    const grid = String(game.values.grid)
    const turn = Number(game.values.turn)
    const state = Number(game.values.state)
    const key = signer === "O" ? PLAYER_O : WALLET
    const whose = turn === 1 ? WALLET : String(game.values.o)
    if (stops(s) && state !== 0) return { tx: panic(signature, "This game is over", s), records, refused: "This game is over · the move was refused" }
    if (key !== whose) return { tx: panic(signature, "Not your turn", s), records, refused: "Not your turn · the move was refused" }
    if (cell >= 9) return { tx: panic(signature, "That cell is off the board", s), records, refused: "That cell is off the board · the move was refused" }
    if (grid[cell] !== "0") return { tx: panic(signature, "That cell is taken", s), records, refused: "That cell is taken · the move was refused" }
    const after = grid.slice(0, cell) + String(turn) + grid.slice(cell + 1)
    // Without the referee the game can't end, and the account holds one game: the last cell waits for step 3
    if (!referees(s) && !after.includes("0")) return { note: "Leave that cell for the next step: the program can't end a game yet, and this account holds only one. Try a move out of turn instead." }
    const won = referees(s) && !!winningLine(after, String(turn))
    const next = referees(s) ? (won ? turn : !after.includes("0") ? 3 : 0) : 0
    const said = !referees(s) ? "" : won ? (turn === 1 ? "X wins" : "O wins") : next === 3 ? "Draw" : ""
    const values = { ...game.values, grid: after, turn: next === 0 ? (turn === 1 ? 2 : 1) : turn, state: won ? turn : next }
    const tx: Tx = { instruction: "play_game", said, signature, compute: referees(s) ? 6720 : 4210 }
    return { tx, records: records.map((r) => (r.id === "game" ? { ...r, values } : r.id === "o" && signer === "O" ? { ...r, values: { lamports: Number(r.values.lamports) - FEE } } : r)) }
  }
  return { note: "That call has no card here." }
}

/** A move as the card lists it: who played which cell, and the result when it ended the game. In
 * step 2, after O's move, it says what to try */
function sentLine(s: State, x: Sent) {
  if (x.ix !== "play_game") return null
  const before = String(x.snap.before.find((r) => r.id === "game")?.values.grid ?? "")
  const game = x.snap.after.find((r) => r.id === "game")
  const grid = String(game?.values.grid ?? "")
  const cell = [...grid].findIndex((c, i) => c !== before[i])
  if (cell === -1) return null
  const who = grid[cell] === "1" ? "X" : "O"
  const state = Number(game?.values.state)
  const end = state === 1 ? " · X wins" : state === 2 ? " · O wins" : state === 3 ? " · Draw" : ""
  return `${who} played cell ${cell}${end}${who === "O" && s.step === 1 && !s.passed[1] ? " · now try a move out of turn, as the same player twice" : ""}`
}

/** Step 2 passes on a move refused for its turn, step 3 on the move that ends the game */
const passes = (s: State, i: number, ix: string, tx: Tx) =>
  ix === "play_game" && (i === 1 ? tx.error?.message === "Not your turn" : i === 2 ? !tx.error && Number(recOf(s, "game")?.values.state) !== 0 : false)

/** The end of the game in words, for the last win and the finish */
function winVars(s: State): Record<string, string> {
  const game = recOf(s, "game")
  const state = Number(game?.values.state ?? 0)
  const n = [...String(game?.values.grid ?? "")].filter((c) => c !== "0").length
  return {
    result: state === 1 ? "X won" : state === 2 ? "O won" : "A draw",
    how: state === 3 ? "filled the board" : "made three in a row",
    state: state === 1 ? "1 (XWins)" : state === 2 ? "2 (OWins)" : "3 (Draw)",
    n: String(n),
  }
}

export const TICTACTOE_SEAHORSE: Lesson = {
  card: { slug: "tictactoe-seahorse", name: "Tic-tac-toe Seahorse", level: "Beginner", framework: "Seahorse", ext: "jpg" },
  minutes: 12,
  by: "lostin",
  program: "tictactoe",
  line: "Build a two player game in Python where the program is the referee",
  intro: "You'll build tic-tac-toe on chain in Python: one account holds the board, a second wallet plays O, and the program checks every move, refuses the one out of turn and calls the win.",
  proof: "Program log: X wins",
  badge: "Two player game",
  headline: "You built a referee on chain",
  proofLine: (_tx, s) => {
    const v = winVars(s)
    return `${v.result === "A draw" ? "The game ended in a draw" : v.result} on devnet in ${v.n} moves, and the program refused every move that broke the rules.`
  },
  // The end of the Beginner Seahorse path: up a level, still in Python
  next: "faucet-seahorse",
  nextLine: "Faucet Seahorse is a good next one: a token faucet in Python that pays by Bitcoin's price, read from an oracle.",
  steps: STEPS,
  // No client: every call goes from the card or the Call panel. The generated Rust fills on the first build
  files: { [MAIN]: "", [GENERATED]: "" },
  preview: PY_S3,
  programId: PROGRAM_ID,
  idlAccount: IDL_ACCOUNT,
  txSignature: GAME_SIGNATURE,
  checks: CHECKS,
  story: false,
  main: MAIN,
  generated: { file: GENERATED, of: rustOf },
  runTx: () => ({ instruction: "init_game", said: "", signature: GAME_SIGNATURE, compute: 8410, inner: SYSTEM_CPI }),
  records: {
    title: "Game",
    one: "game",
    empty: "No game yet. New game sends `init_game`.",
    show: (r) => ({ label: r.kind, seeds: r.id === "game" ? "'ttt' · your wallet" : "", fields: Object.entries(r.values).map(([k, v]) => [k, String(v)]) }),
    send,
    passes,
    args,
    check: (ix, given) =>
      ix === "play_game" && !(/^\d+$/.test(given.cell ?? "") && Number(given.cell) <= 255)
        ? "`cell` is a `u8`: a whole number from 0 to 255."
        : ix === "init_game" && !/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(given.player_o ?? "")
          ? "`player_o` is a `pubkey`: an address in base58."
          : null,
    view: "board",
    signers: [
      { value: "X", label: "X · your wallet" },
      { value: "O", label: "O · Player O" },
    ],
    sentLine,
  },
  winVars,
}
