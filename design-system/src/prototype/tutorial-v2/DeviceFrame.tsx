import { useEffect, useRef, useState } from "react"

import { resetStorage } from "./store"
import { KEEP } from "./view"
import { PrototypeBar } from "./PrototypeBar"

// An iPad Air held landscape, and its bezel: the screen inside is 1152 by 792
const TABLET = { width: 1180, height: 820, bezel: 14 }

/** How much the tablet has to shrink to fit the window, never past its real size. The bar above
 * takes 40px and the frame keeps 24 clear all round */
function useTabletScale() {
  const fit = () => Math.min(1, (window.innerWidth - 48) / TABLET.width, (window.innerHeight - 88) / TABLET.height)
  const [scale, setScale] = useState(fit)
  useEffect(() => {
    const onResize = () => setScale(fit())
    window.addEventListener("resize", onResize)
    return () => window.removeEventListener("resize", onResize)
  }, [])
  return scale
}

/** On a wide screen the prototype runs in an iframe shaped like the device, so fixed sheets and
 * the viewport behave as they do on a real one. The phone shows the phone screens; the tablet,
 * an iPad Air held landscape (1180 by 820), shows the desktop screens, as the product gives a
 * tablet the full editor. The tablet always lays out at its real size and the whole device scales
 * down to fit, so a short window shows it smaller rather than as a narrower screen */
export function DeviceFrame({ device }: { device: "phone" | "tablet" }) {
  const ref = useRef<HTMLIFrameElement>(null)
  const scale = useTabletScale()
  const reset = () => {
    resetStorage()
    ref.current?.contentWindow?.location.reload()
  }
  const src = `${location.pathname}?embed${device === "tablet" ? "&view=tablet" : ""}${KEEP ? "&keep=1" : ""}`
  return (
    <div className="flex h-dvh flex-col bg-surface-well text-foreground">
      <PrototypeBar onReset={reset} />
      <div className="flex min-h-0 flex-1 items-center justify-center p-6">
        {device === "phone" ? (
          <div className="flex aspect-[390/844] h-[min(844px,calc(100dvh-88px))] flex-col overflow-hidden rounded-[52px] border-[10px] border-surface-raised bg-surface-base shadow-modal">
            {/* What a phone keeps above the page: on a real one the safe area does this. Only the island,
                no clock or status icons, so nothing but the prototype draws the eye */}
            <div aria-hidden="true" className="relative h-[50px] shrink-0">
              <span className="absolute top-2.5 left-1/2 h-[30px] w-[100px] -translate-x-1/2 rounded-full bg-black" />
            </div>
            <div className="relative min-h-0 flex-1">
              <iframe ref={ref} title="Tutorial flow prototype" src={src} allow="clipboard-write" className="size-full border-0 bg-surface-base" />
              {/* The home indicator. The page keeps 34px clear for it, as on a real phone */}
              <span aria-hidden="true" className="pointer-events-none absolute bottom-2 left-1/2 h-[5px] w-[134px] -translate-x-1/2 rounded-full bg-foreground/80" />
            </div>
          </div>
        ) : (
          // The box takes the scaled size in the layout, the device inside is drawn at full size and
          // scaled into it. The bezel is even all round, with the camera on the long top edge, as an
          // iPad has it held landscape
          <div style={{ width: TABLET.width * scale, height: TABLET.height * scale }} className="relative shrink-0">
            <div
              style={{ width: TABLET.width, height: TABLET.height, transform: `scale(${scale})`, borderWidth: TABLET.bezel }}
              className="absolute top-0 left-0 origin-top-left overflow-hidden rounded-[36px] border-surface-raised bg-surface-base shadow-modal"
            >
              <span aria-hidden="true" className="absolute -top-[9px] left-1/2 z-10 size-[5px] -translate-x-1/2 rounded-full bg-black" />
              <iframe ref={ref} title="Tutorial flow prototype" src={src} allow="clipboard-write" className="size-full border-0 bg-surface-base" />
              {/* The home indicator, over the 20px the screens keep clear for it */}
              <span aria-hidden="true" className="pointer-events-none absolute bottom-2 left-1/2 h-[5px] w-[160px] -translate-x-1/2 rounded-full bg-foreground/60" />
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
