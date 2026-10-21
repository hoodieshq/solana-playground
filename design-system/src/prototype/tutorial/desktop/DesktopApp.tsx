import { Toaster } from "@/components/ui/sonner"

import { useStore } from "../store"
import { Finish } from "./Finish"
import { Gallery } from "./Gallery"
import { Nav } from "./Nav"
import { Overview } from "./Overview"
import { Step } from "./Step"

export function DesktopApp() {
  const { s } = useStore()
  return (
    <div className="flex h-dvh bg-surface-base text-foreground">
      <Nav />
      <main className="flex min-w-0 flex-1">
        {s.screen === "gallery" && <Gallery />}
        {s.screen === "overview" && <Overview />}
        {s.screen === "step" && <Step />}
        {s.screen === "finish" && <Finish />}
      </main>
      <Toaster theme="dark" position="top-center" />
    </div>
  )
}
