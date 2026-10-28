import { LESSON, type Tx } from "./data"
import type { State, Turn } from "./store"

// The transactions a run leaves behind, worked out from the state. Kept apart from the store, whose
// file is for the state machine and its provider

type TxResult = Extract<Turn, { kind: "result" }> & { tx: Tx }
const txResults = (s: State) => s.thread.filter((t): t is TxResult => t.kind === "result" && !!t.tx)

/** The transaction step `i` left behind, whatever path made it: client.ts, the chat or the Call panel */
export function stepTx(s: State, i = s.step): Tx | null {
  return [...txResults(s)].reverse().find((t) => t.step === i)?.tx ?? null
}

/** The tutorial's last transaction that went through, for the finish: a result's, or the last chop
 * a game's card sent. With none yet, the call the client's step would make */
export const lastTx = (s: State): Tx => {
  const sent = [
    ...txResults(s).map((t) => ({ at: t.at, tx: t.tx })),
    ...s.thread.flatMap((t) => (t.kind === "act" ? (t.chops ?? []).map((c) => ({ at: c.at, tx: c.tx })) : [])),
  ].filter((x) => !x.tx.error)
  sent.sort((a, b) => a.at - b.at)
  return sent[sent.length - 1]?.tx ?? LESSON.runTx(s)
}

/** The key a receipt prints under, while its transaction has only just come back: a view that
 * mounts the receipt a moment later still sees it arrive */
export const arriving = (at: number | null) => (at !== null && Date.now() - at < 3000 ? String(at) : null)
