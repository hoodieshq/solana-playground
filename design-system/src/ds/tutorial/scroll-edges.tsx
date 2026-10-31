import { useScrollEdges } from "@/hooks/use-scroll-edges"

import { Block } from "../parts"

const STEPS = ["Write the program", "Build it", "Deploy to devnet", "Call initialize", "Read the log", "Change the message", "Deploy again", "Call it once more"]

function ScrollEdgesBlock() {
  const [ref] = useScrollEdges<HTMLOListElement>()
  return (
    <Block
      id="scroll-edges"
      title="Scroll edges"
      source="playground"
      registry="use-scroll-edges"
      note="useScrollEdges says which edges of a scroll box have more past them, kept up as it scrolls and as it or its content changes size, and marks them with data-more-top, -bottom, -left and -right. The fade-edges utility fades only those edges, and masks the box, frame and all, so put a border on a wrapper, so the last line is never dimmed once the end is reached. --fade-size sets how far the fade reaches. Scroll the list."
    >
      {/* The fade masks the box itself, so the frame goes on a wrapper */}
      <div className="w-64 rounded-xl border border-border bg-surface-panel">
        <ol ref={ref} className="h-40 overflow-y-auto px-3 py-2 text-caption text-muted-foreground fade-edges">
          {STEPS.map((step, i) => (
            <li key={step} className="py-1.5">
              {i + 1}. {step}
            </li>
          ))}
        </ol>
      </div>
    </Block>
  )
}

export { ScrollEdgesBlock }
