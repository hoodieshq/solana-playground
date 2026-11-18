import { Prose } from "../../../ui/Prose"
import { YouPill } from "../../../ui/turns/YouPill"
import { Typed } from "../../../ui/Typed"
import { READ, READ_CODE } from "../../../ui/type"
import { ask, openFile, type Project, type Turn } from "../../store"
import { reveal } from "./util"

type T<K extends Turn["k"]> = Extract<Turn, { k: K }>

/* The thread beside the code speaks as the tutorial's does (Almaz, 18 Nov: one product, one assistant):
   your question is the tutorial's pill, flown in from the chip that asked it; an answer is the reading text
   on the column's ground, typed out as it comes in. Its questions are not under it: they are the chips
   over the composer, the one place to ask from */

export function User({ t }: { t: T<"user"> }) {
  return <YouPill text={t.text} />
}

export function Assistant({ t, typing, onTyped }: { t: T<"assistant">; typing: boolean; onTyped: () => void }) {
  return <p className={`${READ} max-w-[66ch]`}>{typing ? <Typed key={t.id} text={t.text} code={READ_CODE} onDone={onTyped} /> : <Prose text={t.text} {...READ_CODE} />}</p>
}

/** "Show me the line": asked in the thread, and the failed line opened and lit in the neutral tint */
export function showFailLine(p: Project, c: string) {
  ask(p.id, c)
  const fail = [...p.feed].reverse().find((x): x is T<"build-fail"> => x.k === "build-fail")
  if (!fail?.file || !fail.line) return
  openFile(p.id, fail.file)
  reveal(fail.file, fail.line, { lit: true })
}
