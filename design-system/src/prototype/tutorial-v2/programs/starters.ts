import type { Ix } from "./data"

/* The starters New project makes, as the shell needs them: files, the file that opens first, and the
   instructions their IDL lists. Short versions of the product's templates */

type Starter = { files: Record<string, string>; main: string; ixs: Ix[] }

const anchor = `use anchor_lang::prelude::*;

// This is your program's public key and it will update
// automatically when you build the project.
declare_id!("11111111111111111111111111111111");

#[program]
mod hello_anchor {
    use super::*;
    pub fn initialize(ctx: Context<Initialize>, data: u64) -> Result<()> {
        ctx.accounts.new_account.data = data;
        msg!("Changed data to: {}!", data);
        Ok(())
    }
}

#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(init, payer = signer, space = 8 + 8)]
    pub new_account: Account<'info, NewAccount>,
    #[account(mut)]
    pub signer: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[account]
pub struct NewAccount {
    data: u64,
}
`

const native = `use solana_program::{
    account_info::AccountInfo, entrypoint, entrypoint::ProgramResult, msg, pubkey::Pubkey,
};

entrypoint!(process_instruction);

fn process_instruction(
    program_id: &Pubkey,
    _accounts: &[AccountInfo],
    _instruction_data: &[u8],
) -> ProgramResult {
    msg!("Hello, Solana from {}!", program_id);
    Ok(())
}
`

const nativeClient = `// Calls the program with an empty instruction and prints its log
const ix = new web3.TransactionInstruction({
  keys: [],
  programId: pg.PROGRAM_ID,
});
const sig = await web3.sendAndConfirmTransaction(pg.connection, new web3.Transaction().add(ix), [pg.wallet.keypair]);
console.log(\`https://explorer.solana.com/tx/\${sig}?cluster=devnet\`);
`

const seahorse = `# Built with Seahorse v0.2.0

from seahorse.prelude import *

declare_id('11111111111111111111111111111111')

class FizzBuzz(Account):
  fizz: bool
  buzz: bool
  n: u64

@instruction
def init(owner: Signer, fizzbuzz: Empty[FizzBuzz]):
  fizzbuzz.init(payer = owner, seeds = ['fizzbuzz', owner])

@instruction
def do_fizzbuzz(fizzbuzz: FizzBuzz, n: u64):
  fizzbuzz.fizz = n % 3 == 0
  fizzbuzz.buzz = n % 5 == 0
  if not fizzbuzz.fizz and not fizzbuzz.buzz:
    fizzbuzz.n = n
  else:
    fizzbuzz.n = 0
`

const client = `// Sends a memo to the Memo program on devnet and reads the log back
import { Connection, PublicKey, Transaction, TransactionInstruction } from "@solana/web3.js";

const MEMO = new PublicKey("MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr");

const connection = new Connection("https://api.devnet.solana.com");
console.log("My address:", pg.wallet.publicKey.toString());
const balance = await connection.getBalance(pg.wallet.publicKey);
console.log(\`My balance: \${balance / 1e9} SOL\`);

const ix = new TransactionInstruction({
  keys: [],
  programId: MEMO,
  data: Buffer.from("gm from Playground"),
});
await connection.sendTransaction(new Transaction().add(ix), [pg.wallet.keypair]);
console.log('Memo program says: "gm from Playground"');
`

export const STARTERS: Record<"anchor" | "native" | "seahorse" | "ts-client", Starter> = {
  anchor: {
    files: { "src/lib.rs": anchor, "client/client.ts": nativeClient },
    main: "src/lib.rs",
    ixs: [{ name: "initialize", args: [{ name: "data", type: "u64", example: "42" }], accounts: ["new_account", "signer", "system_program"], line: "Makes an account and stores a number in it." }],
  },
  native: {
    files: { "src/lib.rs": native, "client/client.ts": nativeClient },
    main: "src/lib.rs",
    ixs: [],
  },
  seahorse: {
    files: { "src/fizzbuzz.py": seahorse },
    main: "src/fizzbuzz.py",
    ixs: [
      { name: "init", args: [], accounts: ["owner", "fizzbuzz"], line: "Makes your FizzBuzz account." },
      { name: "do_fizzbuzz", args: [{ name: "n", type: "u64", example: "15" }], accounts: ["fizzbuzz"], line: "Works out fizz and buzz for a number." },
    ],
  },
  "ts-client": {
    files: { "client.ts": client },
    main: "client.ts",
    ixs: [],
  },
}
