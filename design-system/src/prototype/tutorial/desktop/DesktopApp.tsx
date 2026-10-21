import { useEffect, useState } from "react"

import { Toaster } from "@/components/ui/sonner"
import { TooltipProvider } from "@/components/ui/tooltip"

import { useStore } from "../store"
import { Finish } from "./Finish"
import { Gallery } from "./Gallery"
import { Nav } from "./Nav"
import { Overview } from "./Overview"
import { Step } from "./Step"

/** The part of the window the on-screen keyboard leaves, while it's up. A tablet's browser keeps
 * the page its full height under the keyboard, so the action bar under the code would sit behind
 * it; sized to what shows, the bar rides on top of the keys. Null while nothing covers the page */
function useKeyboardRoom() {
  const [room, setRoom] = useState<{ height: number; top: number } | null>(null)
  useEffect(() => {
    const vv = window.visualViewport
    if (!vv) return
    const update = () => {
      // Pinch zoom shrinks the visual viewport too, but scales it: only an unscaled one is a keyboard
      const covered = vv.scale === 1 && window.innerHeight - vv.height > 80
      setRoom(covered ? { height: vv.height, top: vv.offsetTop } : null)
    }
    vv.addEventListener("resize", update)
    vv.addEventListener("scroll", update)
    return () => {
      vv.removeEventListener("resize", update)
      vv.removeEventListener("scroll", update)
    }
  }, [])
  return room
}

export function DesktopApp() {
  const { s } = useStore()
  const room = useKeyboardRoom()
  return (
    // Hover tips show after a short wait, so passing over a control doesn't flash them
    <TooltipProvider delayDuration={400}>
      <div
        style={room ? { height: room.height, transform: `translateY(${room.top}px)` } : undefined}
        className="relative flex h-full bg-surface-base text-foreground"
      >
        <Nav />
        {/* In the tablet's frame the screen keeps a strip clear at its foot for the home indicator, as
            an iPad does (see prototype.css). The nav runs on under it, as a sidebar does */}
        <main className="flex min-w-0 flex-1 pb-(--tablet-safe-bottom)">
          {s.screen === "gallery" && <Gallery />}
          {s.screen === "overview" && <Overview />}
          {s.screen === "step" && <Step />}
          {s.screen === "finish" && <Finish />}
        </main>
        <Toaster theme="dark" position="top-center" />
      </div>
    </TooltipProvider>
  )
}
