import { helloSays } from "./check"
import { NAMED_TX_SIGNATURE, STEPS, TX_SIGNATURE, callLog, clientLog, type Tx } from "./data"
import type { State } from "./store"

// The transactions a run leaves behind, worked out from the state. Kept apart from the store, whose
// file is for the state machine and its provider

/** Whether step `i` stands passed: it passed, and its code hasn't changed since */
const stands = (s: State, i: number) => s.passed[i] && !s.changedSincePass[i]

/** Client step 3's transaction: hello with no argument, saying what lib.rs has it say */
export const clientTx = (s: State): Tx => ({
  instruction: "hello",
  said: helloSays(s.files["src/lib.rs"], null),
  signature: TX_SIGNATURE,
  compute: 1042,
})

/** Step 4's call with a name, which formats a longer line and so costs a little more */
export const namedTx = (s: State, name: string): Tx => ({
  instruction: "hello(name)",
  said: helloSays(s.files["src/lib.rs"], name),
  signature: NAMED_TX_SIGNATURE,
  compute: 1187,
})

/** The transaction the current step left behind, once it stands passed: the client's run on step 3,
 * the call with a name on step 4 */
export function stepTx(s: State): Tx | null {
  const step = STEPS[s.step]
  if (!stands(s, s.step)) return null
  if (step.id === "call-client") return clientTx(s)
  if (step.call && s.name !== null) return namedTx(s, s.name)
  return null
}

/** The tutorial's last transaction, for the finish. Progress saved before the name call has none */
export const lastTx = (s: State): Tx => (s.name !== null ? namedTx(s, s.name) : clientTx(s))

/** The log a step shows. A passed step opened again has an empty one, so it shows what its run left:
 * the deploy, the client's run or the call */
export function shownLog(s: State): string[] {
  const step = STEPS[s.step]
  if (s.log.length > 0 || !stands(s, s.step)) return s.log
  if (step.deploy) return step.deploy.result.log
  if (step.id === "call-client") return clientLog(clientTx(s))
  if (step.call && s.name !== null) return callLog(namedTx(s, s.name), s.name)
  return s.log
}

/** The key a receipt prints under, while its transaction has only just come back: a view that
 * mounts the receipt a moment later, as the phone's Output tab does, still sees it arrive */
export const arriving = (at: number | null) => (at !== null && Date.now() - at < 3000 ? String(at) : null)
