import { Toaster } from "@/components/ui/sonner"

import { Finish } from "./screens/Finish"
import { Gallery } from "./screens/Gallery"
import { Overview } from "./screens/Overview"
import { StepScreen } from "./screens/StepScreen"
import { useStore } from "./store"

export function App() {
  const { s } = useStore()
  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-surface-base pt-[env(safe-area-inset-top)] text-foreground">
      {s.screen === "gallery" && <Gallery />}
      {s.screen === "overview" && <Overview />}
      {s.screen === "step" && <StepScreen />}
      {s.screen === "finish" && <Finish />}
      <Toaster theme="dark" position="top-center" />
    </div>
  )
}
