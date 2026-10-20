import { CircleAlert, CircleCheck } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Drawer, DrawerContent, DrawerDescription, DrawerFooter, DrawerHeader, DrawerTitle } from "@/components/ui/drawer"

import { PROGRAM_ID, STEPS } from "../data"
import { lastResult, useStore } from "../store"

export function ResultSheet({ onUndo }: { onUndo: () => void }) {
  const { s, dispatch } = useStore()
  const step = STEPS[s.step]
  const r = lastResult(s)
  const open = s.sheet && (s.phase === "passed" || s.phase === "failed") && r !== null
  const last = s.step === STEPS.length - 1

  return (
    <Drawer open={open} onOpenChange={(o) => !o && dispatch({ type: "close" })}>
      <DrawerContent>
        {r?.ok ? (
          <>
            <DrawerHeader className="text-left">
              <DrawerTitle className="flex items-center gap-2 text-title text-success">
                <CircleCheck className="size-5" />
                Step passed
              </DrawerTitle>
              <DrawerDescription className="text-body text-muted-foreground">{r.note}</DrawerDescription>
            </DrawerHeader>
            {step.deploy && (
              <div className="mx-4 rounded-control bg-surface-raised p-3 text-caption">
                <p className="text-muted-foreground">Program id</p>
                <p className="mt-0.5 font-mono break-all text-foreground">{PROGRAM_ID}</p>
                <p className="mt-2 text-primary underline underline-offset-2">View on Explorer (devnet)</p>
              </div>
            )}
            <DrawerFooter className="pb-[max(var(--safe-bottom),16px)]">
              {s.undo && (
                <p className="text-center text-caption text-muted-foreground">
                  Applied ·{" "}
                  <button type="button" className="underline underline-offset-2" onClick={onUndo}>
                    Undo
                  </button>
                </p>
              )}
              <Button className="h-11" onClick={() => dispatch({ type: "next" })}>
                {last ? "Finish tutorial" : `Step ${s.step + 2}: ${STEPS[s.step + 1].title}`}
              </Button>
            </DrawerFooter>
          </>
        ) : r ? (
          <>
            <DrawerHeader className="text-left">
              <DrawerTitle className="flex items-center gap-2 text-title text-error">
                <CircleAlert className="size-5" />
                Not yet
              </DrawerTitle>
              <DrawerDescription className="text-body text-muted-foreground">{s.error?.reason}</DrawerDescription>
            </DrawerHeader>
            <DrawerFooter className="pb-[max(var(--safe-bottom),16px)]">
              <div className="flex gap-2">
                <Button variant="secondary" className="h-11 flex-1" onClick={() => dispatch({ type: "retry" })}>
                  Try again
                </Button>
                <Button className="h-11 flex-1" onClick={() => dispatch({ type: "explain", mode: "error" })}>
                  Explain
                </Button>
              </div>
              <Button variant="ghost" className="h-11 text-muted-foreground" onClick={onUndo}>
                Undo patch
              </Button>
            </DrawerFooter>
          </>
        ) : null}
      </DrawerContent>
    </Drawer>
  )
}
