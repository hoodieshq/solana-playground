import { BrandButton } from "@/components/ui/brand-button"

import { STEPS } from "../data"
import { useStore } from "../store"

/** The gallery's top: the tutorial to begin with. Fresh, started or finished */
export function StartHereBanner({ layout }: { layout: "phone" | "desktop" }) {
  const { s, dispatch } = useStore()
  const finished = s.finishedAt !== null
  const started = s.startedAt !== null && !finished
  const first = s.passed.findIndex((p) => !p)
  const next = STEPS[first === -1 ? 0 : first]

  return (
    <section aria-labelledby="start-here-title" className={layout === "phone" ? "mt-5 rounded-card bg-surface-panel p-5" : "mt-8 rounded-card bg-surface-panel p-8"}>
      <p className="text-caption text-muted-foreground">{finished ? "Completed" : started ? "Pick up where you left off" : "Start here"}</p>
      <h2 id="start-here-title" className="mt-1 font-heading text-display">
        Hello Anchor
      </h2>
      <p className="mt-1.5 font-read text-muted-foreground">{started ? `Next: ${next.objective}` : "Write, deploy and call your first Solana program"}</p>
      <BrandButton variant="accent" className="mt-5 h-11 px-5" onClick={() => dispatch(started ? { type: "start" } : { type: "open", screen: "overview" })}>
        {started ? "Continue" : finished ? "Open again" : "Start"}
      </BrandButton>
    </section>
  )
}
