import { helloSays } from "./check"
import { LIB, NAMED_TX_SIGNATURE, TX_SIGNATURE, type Tx } from "./data"
import type { State, Turn } from "./store"

// The transactions a run leaves behind, worked out from the state. Kept apart from the store, whose
// file is for the state machine and its provider

/** What devnet runs: the lib.rs last deployed. Before any deploy, the file, so a stray call still
 * reads something */
const onDevnet = (s: State) => s.deployedLib ?? s.files[LIB]

/** hello with no argument, saying what the deployed program has it say */
export const clientTx = (s: State): Tx => ({
  instruction: "hello",
  said: helloSays(onDevnet(s), null),
  signature: TX_SIGNATURE,
  compute: 1042,
})

/** The call with a name, which formats a longer line and so costs a little more */
export const namedTx = (s: State, name: string): Tx => ({
  instruction: "hello(name)",
  said: helloSays(onDevnet(s), name),
  signature: NAMED_TX_SIGNATURE,
  compute: 1187,
})

type TxResult = Extract<Turn, { kind: "result" }> & { tx: Tx }
const txResults = (s: State) => s.thread.filter((t): t is TxResult => t.kind === "result" && !!t.tx)

/** The transaction step `i` left behind, whatever path made it: client.ts, the chat or the Call panel */
export function stepTx(s: State, i = s.step): Tx | null {
  return [...txResults(s)].reverse().find((t) => t.step === i)?.tx ?? null
}

/** The tutorial's last transaction, for the finish. With none yet, the call step 3 would make */
export const lastTx = (s: State): Tx => {
  const all = txResults(s)
  return all[all.length - 1]?.tx ?? clientTx(s)
}

/** The key a receipt prints under, while its transaction has only just come back: a view that
 * mounts the receipt a moment later still sees it arrive */
export const arriving = (at: number | null) => (at !== null && Date.now() - at < 3000 ? String(at) : null)
