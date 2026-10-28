// What every lesson shares: the two files a Playground Anchor project has, and how keys and fees read

export const LIB = "src/lib.rs"
export const CLIENT = "client/client.ts"

/** A key or signature cut in the middle, as explorers and wallets show them: you check one by its
 * start and its end, never its middle */
export const shortKey = (key: string, n = 6) => `${key.slice(0, n)}…${key.slice(-n)}`

export const TX_FEE = "0.000005 SOL"
export const TX_CONFIRMED = "~0.4 s"

// Who pays: the learner's Playground wallet, a key pair Playground makes in the browser, on devnet,
// topped up from the faucet with free test SOL. Example numbers, as everything here

/** The Playground wallet's address */
export const WALLET = "7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU"
/** A first deploy: the program account's rent and the fees, from the wallet */
export const DEPLOY_COST = "1.27 SOL"
/** An upgrade: the fees. The buffer's rent comes back once the upgrade lands */
export const UPGRADE_COST = "0.0002 SOL"
/** What one airdrop from the devnet faucet adds */
export const AIRDROP = "5 SOL"
export const FAUCET_URL = "https://faucet.solana.com"

/** The longest name the call takes: enough for any name, short enough for one log line */
export const NAME_MAX = 32

/** The id `declare_id!` holds before the first deploy: Playground writes the real one in */
export const NO_ID = "11111111111111111111111111111111"
