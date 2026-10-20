import { Toaster } from "@/components/ui/sonner"

import { Finish } from "./screens/Finish"
import { Gallery } from "./screens/Gallery"
import { Overview } from "./screens/Overview"
import { StepScreen } from "./screens/StepScreen"
import { useStore } from "./store"

export function App() {
  const { s } = useStore()
  return (
    // A phone's width at most: opened wide without the frame, the screens stay phone-shaped in the middle
    <div className="h-dvh bg-surface-well">
      <div className="mx-auto flex h-full w-full max-w-[30rem] flex-col overflow-hidden bg-surface-base pt-[env(safe-area-inset-top)] text-foreground">
        {s.screen === "gallery" && <Gallery />}
        {s.screen === "overview" && <Overview />}
        {s.screen === "step" && <StepScreen />}
        {s.screen === "finish" && <Finish />}
      </div>
      <Toaster theme="dark" position="top-center" />
    </div>
  )
}
