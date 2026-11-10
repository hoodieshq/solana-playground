import type { Tx } from "./types"

// What the Tokens family's lessons share (Battle Coins, SPL Token Vault, Faucet Seahorse): the token
// programs' addresses, their lines in a transaction's logs, rent for a mint and a token account, and
// the Token program's own refusal. Their accounts are records, drawn as the token card (`records.tokens`)

export const TOKEN_PROGRAM = "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
export const ATA_PROGRAM = "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL"
export const METADATA_PROGRAM = "metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s"

/** Rent, in SOL: a mint's 82 bytes (1,461,600 lamports), a token account's 165 */
export const MINT_RENT = 0.0015
export const TOKEN_ACCOUNT_RENT = 0.002

/** A call into the Token program inside the instruction, as the logs show it */
export const tokenCpi = (ix: string, depth = 2) => [`Program ${TOKEN_PROGRAM} invoke [${depth}]`, `Program log: Instruction: ${ix}`, `Program ${TOKEN_PROGRAM} success`]

/** The Associated Token Program creating a holder's token account inside the instruction */
export const ATA_CPI = [`Program ${ATA_PROGRAM} invoke [2]`, "Program log: Create", ...tokenCpi("InitializeAccount3", 3), `Program ${ATA_PROGRAM} success`]

/** The Token program refusing to take more than an account holds: its own error 0x1, not the program's */
export function insufficientFunds(instruction: string, signature: string, op: string, compute = 4860): Tx {
  return {
    instruction,
    said: "",
    signature,
    compute,
    error: {
      name: "InsufficientFunds",
      number: 1,
      message: "insufficient funds",
      line: 0,
      log: [`Program ${TOKEN_PROGRAM} invoke [2]`, `Program log: Instruction: ${op}`, "Program log: Error: insufficient funds", `Program ${TOKEN_PROGRAM} failed: custom program error: 0x1`],
      failed: "custom program error: 0x1",
    },
  }
}

/** Whole tokens from base units, with commas: 10,000,000,000 at 9 decimals reads 10 */
export const whole = (amount: number, decimals: number) => (amount / 10 ** decimals).toLocaleString("en-US", { maximumFractionDigits: decimals })
