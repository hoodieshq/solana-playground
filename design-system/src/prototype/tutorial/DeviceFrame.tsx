import { useRef } from "react"
import { RotateCcw } from "lucide-react"

import { Button } from "@/components/ui/button"

import { resetStorage } from "./store"

/** On a wide screen the prototype runs in an iframe shaped like a phone, so
 * fixed sheets and the viewport behave as they do on a real one */
export function DeviceFrame() {
  const ref = useRef<HTMLIFrameElement>(null)
  const reset = () => {
    resetStorage()
    ref.current?.contentWindow?.location.reload()
  }
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-surface-well p-6 text-foreground">
      <div className="aspect-[390/844] h-[min(844px,calc(100dvh-96px))] overflow-hidden rounded-[52px] border-[10px] border-surface-raised shadow-modal">
        <iframe ref={ref} title="Tutorial flow prototype" src={`${location.pathname}?embed`} className="size-full border-0 bg-surface-base" />
      </div>
      <div className="flex items-center gap-3 text-caption text-muted-foreground">
        <span>Solana Playground · tutorial flow on a phone · prototype</span>
        <Button variant="ghost" size="sm" onClick={reset}>
          <RotateCcw />
          Reset
        </Button>
      </div>
    </div>
  )
}
