import { Toaster } from "@/components/ui/sonner"

import { Gallery } from "./screens/Gallery"
import { Overview } from "./screens/Overview"
import { useStore } from "./store"

export function App() {
  const { s } = useStore()
  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-surface-base pt-[env(safe-area-inset-top)] text-foreground">
      {s.screen === "gallery" && <Gallery />}
      {s.screen === "overview" && <Overview />}
      {s.screen === "step" && <p className="p-4 text-body">Step screen comes in Task 6</p>}
      {s.screen === "finish" && <p className="p-4 text-body">Finish screen comes in Task 8</p>}
      <Toaster theme="dark" position="top-center" />
    </div>
  )
}
