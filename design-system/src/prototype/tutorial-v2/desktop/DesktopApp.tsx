import { useEffect, useState } from "react"

import { Toaster } from "@/components/ui/sonner"
import { TooltipProvider } from "@/components/ui/tooltip"

import { useNavDesign } from "../navStates"
import { NewProjectDialog } from "../newProject"
import { ProgramsBridge, ProgramsScreen } from "../programs"
import { SettingsLayer } from "../settings"
import { useTheme } from "../settings/theme"
import { useStore } from "../store"
import { Gallery } from "./Gallery"
import { Home } from "./Home"
import { Nav } from "./Nav"
import { LitNav } from "./navLit/LitNav"
import { Tutorial } from "./Tutorial"
import { TutorialsBridge } from "./TutorialsBar"

/** The part of the window the on-screen keyboard leaves, while it's up. A tablet's browser keeps
 * the page its full height under the keyboard, so the composer would sit behind it; sized to what
 * shows, it rides on top of the keys. Null while nothing covers the page */
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

/** The desktop: the nav first, then the screen. A tutorial is one screen from its intro to its
 * finish; the summary page behind See summary is the v1 finish */
export function DesktopApp() {
  const { s } = useStore()
  const room = useKeyboardRoom()
  // Lit Path, the redesign, or the product's current nav, as the prototype bar picks
  const design = useNavDesign()
  const theme = useTheme()
  return (
    // Hover tips show after a short wait, so passing over a control doesn't flash them
    <TooltipProvider delayDuration={400}>
      <div
        style={room ? { height: room.height, transform: `translateY(${room.top}px)` } : undefined}
        className="relative flex h-full bg-surface-base text-foreground"
      >
        {design === "lit" ? <LitNav /> : <Nav />}
        {/* In the tablet's frame the screen keeps a strip clear at its foot for the home indicator, as
            an iPad does (see prototype.css). Each pane keeps it inside, so the panes, their grounds and
            the lines between them run on to the edge, as the nav does */}
        {/* Settings opens over this pane only (settings/index.tsx), so the nav stays in reach; isolate keeps
            its layer under the floating nav */}
        <main id="oak-screen" className="relative isolate flex min-w-0 flex-1 *:pb-(--tablet-safe-bottom)">
          {s.screen === "home" && <Home />}
          {s.screen === "gallery" && <Gallery />}
          {s.screen === "programs" && <ProgramsScreen />}
          {(s.screen === "step" || s.screen === "finish") && <Tutorial />}
        </main>
        <NewProjectDialog />
        <ProgramsBridge />
        <TutorialsBridge />
        <SettingsLayer />
        <Toaster theme={theme} position="top-center" />
      </div>
    </TooltipProvider>
  )
}
