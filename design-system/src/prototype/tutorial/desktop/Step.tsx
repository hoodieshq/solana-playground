import { STEPS } from "../data"
import { useStore } from "../store"
import { Column } from "./Column"
import { Editor } from "./Editor"
import { Workspace } from "./Workspace"

export function Step() {
  const { s, dispatch } = useStore()
  const step = STEPS[s.step]
  return (
    <>
      <Column label="Lesson">
        <p className="p-5 text-muted-foreground">{step.objective}</p>
      </Column>
      <Workspace file={step.file}>
        <Editor code={s.files[step.file]} onChange={(code) => dispatch({ type: "edit", code })} label={`${step.file}, editable`} />
      </Workspace>
    </>
  )
}
