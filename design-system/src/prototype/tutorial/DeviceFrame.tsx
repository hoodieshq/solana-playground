import { useRef } from "react"

import { resetStorage } from "./store"
import { KEEP } from "./view"
import { PrototypeBar } from "./PrototypeBar"

/** On a wide screen the prototype runs in an iframe shaped like a phone, so
 * fixed sheets and the viewport behave as they do on a real one */
export function DeviceFrame() {
  const ref = useRef<HTMLIFrameElement>(null)
  const reset = () => {
    resetStorage()
    ref.current?.contentWindow?.location.reload()
  }
  return (
    <div className="flex h-dvh flex-col bg-surface-well text-foreground">
      <PrototypeBar onReset={reset} />
      <div className="flex min-h-0 flex-1 items-center justify-center p-6">
      <div className="flex aspect-[390/844] h-[min(844px,calc(100dvh-88px))] flex-col overflow-hidden rounded-[52px] border-[10px] border-surface-raised bg-surface-base shadow-modal">
        {/* What a phone keeps above the page: on a real one the safe area does this. Only the island,
            no clock or status icons, so nothing but the prototype draws the eye */}
        <div aria-hidden="true" className="relative h-[50px] shrink-0">
          <span className="absolute top-2.5 left-1/2 h-[30px] w-[100px] -translate-x-1/2 rounded-full bg-black" />
        </div>
        <div className="relative min-h-0 flex-1">
          <iframe ref={ref} title="Tutorial flow prototype" src={`${location.pathname}?embed${KEEP ? "&keep=1" : ""}`} className="size-full border-0 bg-surface-base" />
          {/* The home indicator. The page keeps 34px clear for it, as on a real phone */}
          <span aria-hidden="true" className="pointer-events-none absolute bottom-2 left-1/2 h-[5px] w-[134px] -translate-x-1/2 rounded-full bg-foreground/80" />
        </div>
      </div>
      </div>
    </div>
  )
}
