import { StepRing } from "../../ui/StepRing"

/** Progress as one ring, the same continuous one the lesson's and the project's step line draw: a whole
 * grey track and an arc as long as the share done. An arc a step read as pieces, and the nav was the last
 * place with them (Almaz, 20 Nov). Setup's row has it on the avatar's axis; each lesson in Learning has it
 * on the right. A full ring is done */
export function ProgressRing({ done, of, size }: { done: number; of: number; size: number }) {
  return <StepRing done={done} of={of} style={{ width: size, height: size }} />
}
