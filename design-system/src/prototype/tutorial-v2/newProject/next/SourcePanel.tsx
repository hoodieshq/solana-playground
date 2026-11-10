import type { RefObject } from "react"

import { SAMPLE_LINK } from "./data"
import { DescribePanel } from "./DescribePanel"
import { ExamplePanel } from "./ExamplePanel"
import { ImportPanel } from "./ImportPanel"
import type { Source } from "./model"
import type { FirstLightFlow } from "./useFirstLight"

/** Example, Import or Describe, wired to the flow: the dialog's panel and the phone's sub page.
 * `source` keeps a sub page drawn while it slides away */
export function SourcePanel({
  flow,
  source = flow.s.source,
  urlRef,
  boxRef,
}: {
  flow: FirstLightFlow
  source?: Source
  urlRef: RefObject<HTMLInputElement | null>
  boxRef: RefObject<HTMLTextAreaElement | null>
}) {
  const { s, dispatch, env, busy } = flow
  const useStarter = () => dispatch({ type: "source", source: "starter" })
  if (source === "example")
    return (
      <ExamplePanel
        s={s}
        online={env.online}
        busy={busy}
        onQuery={(query) => dispatch({ type: "examples", patch: { query } })}
        onPick={(picked) => dispatch({ type: "examples", patch: { picked } })}
        onCreate={flow.create}
        onRetry={flow.retryExamples}
        onEnterKey={flow.enterCreates}
      />
    )
  if (source === "import")
    return (
      <ImportPanel
        s={s}
        env={env}
        urlRef={urlRef}
        onUrl={(url) => dispatch({ type: "import", import: url ? { state: "typed", url } : { state: "empty" } })}
        onStart={() => (s.import.state === "typed" || s.import.state === "failed") && flow.fetchRepo(s.import.url)}
        onPaste={(text) => {
          const url = text || SAMPLE_LINK
          dispatch({ type: "import", import: { state: "typed", url } })
          flow.fetchRepo(url)
        }}
        onPick={(picked) => s.import.state === "choose" && dispatch({ type: "import", import: { ...s.import, picked } })}
        onEnterKey={flow.enterCreates}
        onEditLink={() => {
          urlRef.current?.focus()
          urlRef.current?.select()
        }}
        onRetry={flow.retry}
        onToggleDetails={() => dispatch({ type: "details" })}
        onUseStarter={useStarter}
      />
    )
  if (source === "describe")
    return (
      <DescribePanel
        s={s}
        env={env}
        boxRef={boxRef}
        onText={(text) => dispatch({ type: "describe", patch: { text } })}
        onFramework={(framework) => dispatch({ type: "framework", framework })}
        onUseStarter={useStarter}
      />
    )
  return null
}
