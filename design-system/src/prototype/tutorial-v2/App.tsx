import { Toaster } from "@/components/ui/sonner"
import { TooltipProvider } from "@/components/ui/tooltip"

import { NewProjectDialog } from "./newProject"
import { TutorialsBridge } from "./desktop/TutorialsBar"
import { ProgramsBridge } from "./programs"
import { PhonePrograms } from "./programs/next/phone/PhonePrograms"
import { SettingsLayer } from "./settings"
import { useTheme } from "./settings/theme"
import { Gallery } from "./screens/Gallery"
import { StepScreen } from "./screens/StepScreen"
import { useStore } from "./store"

const TOAST_TOP = "calc(env(safe-area-inset-top, 0px) + var(--phone-head) + 8px)"

export function App() {
  const { s } = useStore()
  const theme = useTheme()
  return (
    // A phone's width at most: opened wide without the frame, the screens stay phone-shaped in the middle.
    // An upright tablet takes its whole width.
    // Tooltips for the step segments, shared with desktop
    <TooltipProvider delayDuration={400}>
      <div className="h-dvh bg-surface-well">
        <div className="mx-auto flex h-full w-full max-w-[30rem] flex-col [html.portrait_&]:max-w-none overflow-hidden bg-surface-base pt-[env(safe-area-inset-top)] text-foreground">
          {(s.screen === "gallery" || s.screen === "home") && <Gallery />}
          {s.screen === "programs" && <PhonePrograms />}
          {/* A finish is the last turn of the step screen's chat; the old screen of its own is gone */}
          {(s.screen === "step" || s.screen === "finish") && <StepScreen />}
        </div>
        <NewProjectDialog />
        <ProgramsBridge />
        <TutorialsBridge />
        <SettingsLayer />
        {/* Under the screen's top bar, never over its back and close buttons */}
        <Toaster theme={theme} position="top-center" offset={{ top: TOAST_TOP }} mobileOffset={{ top: TOAST_TOP }} />
      </div>
    </TooltipProvider>
  )
}
