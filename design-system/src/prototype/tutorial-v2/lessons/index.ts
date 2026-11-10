import { HELLO_ANCHOR } from "./hello-anchor"
import { HELLO_SEAHORSE } from "./hello-seahorse"
import { HELLO_SOLANA } from "./hello-solana"
import { LUMBERJACK } from "./lumberjack"
import { ZERO_COPY } from "./zero-copy"
import { COUNTER_PDA_TUTORIAL } from "./counter-pda-tutorial"
import { EXPENSE_TRACKER } from "./expense-tracker"
import { BANK_SIMULATOR } from "./bank-simulator"
import { TODO_APP_SEAHORSE } from "./todo-app-seahorse"
// The Tokens family
import { BATTLE_COINS } from "./battle-coins"
import { SPL_TOKEN_VAULT } from "./spl-token-vault"
import { FAUCET_SEAHORSE } from "./faucet-seahorse"
// The Games family
import { TINY_ADVENTURE } from "./tiny-adventure"
import { TINY_ADVENTURE_TWO } from "./tiny-adventure-two"
import { BOSS_BATTLE } from "./boss-battle"
import { TICTACTOE_SEAHORSE } from "./tictactoe-seahorse"
import type { Lesson } from "./types"

/** Every tutorial the prototype runs, by slug. A new one is a file next to these, added here */
export const LESSONS: Record<string, Lesson> = {
  [HELLO_ANCHOR.card.slug]: HELLO_ANCHOR,
  [HELLO_SEAHORSE.card.slug]: HELLO_SEAHORSE,
  [HELLO_SOLANA.card.slug]: HELLO_SOLANA,
  [LUMBERJACK.card.slug]: LUMBERJACK,
  [ZERO_COPY.card.slug]: ZERO_COPY,
  [COUNTER_PDA_TUTORIAL.card.slug]: COUNTER_PDA_TUTORIAL,
  [EXPENSE_TRACKER.card.slug]: EXPENSE_TRACKER,
  [BANK_SIMULATOR.card.slug]: BANK_SIMULATOR,
  [TODO_APP_SEAHORSE.card.slug]: TODO_APP_SEAHORSE,
  // The Tokens family
  [BATTLE_COINS.card.slug]: BATTLE_COINS,
  [SPL_TOKEN_VAULT.card.slug]: SPL_TOKEN_VAULT,
  [FAUCET_SEAHORSE.card.slug]: FAUCET_SEAHORSE,
  // The Games family
  [TINY_ADVENTURE.card.slug]: TINY_ADVENTURE,
  [TINY_ADVENTURE_TWO.card.slug]: TINY_ADVENTURE_TWO,
  [BOSS_BATTLE.card.slug]: BOSS_BATTLE,
  [TICTACTOE_SEAHORSE.card.slug]: TICTACTOE_SEAHORSE,
}

export const playable = (slug: string) => slug in LESSONS
