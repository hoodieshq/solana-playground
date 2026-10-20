import { useState } from "react"

import { Button } from "@/components/ui/button"
import { Drawer, DrawerContent, DrawerFooter, DrawerHeader, DrawerTitle } from "@/components/ui/drawer"

import { STEPS, type Patch } from "../data"
import { useStore } from "../store"
import { AssistantHead } from "../ui/AssistantHead"
import { PatchDiff } from "../ui/PatchDiff"
import { Typed } from "../ui/Typed"

function Body({ patch }: { patch: Patch }) {
  const { dispatch } = useStore()
  const [ready, setReady] = useState(false)
  return (
    <>
      <div className="min-h-0 overflow-y-auto px-4">
        <p className="text-body">
          <Typed key={patch.summary} text={patch.summary} onDone={() => setReady(true)} />
        </p>
        {ready && <PatchDiff patch={patch} className="mt-3" />}
      </div>
      <DrawerFooter className="flex-row gap-2 pb-[max(var(--safe-bottom),16px)]">
        <Button variant="secondary" className="h-11 flex-1" onClick={() => dispatch({ type: "close" })}>
          Discard
        </Button>
        <Button className="h-11 flex-1" disabled={!ready} onClick={() => dispatch({ type: "apply" })}>
          Apply
        </Button>
      </DrawerFooter>
    </>
  )
}

export function PatchSheet() {
  const { s, dispatch } = useStore()
  const patch = STEPS[s.step].patch
  const open = s.phase === "patch" && s.sheet && !!patch
  return (
    <Drawer open={open} onOpenChange={(o) => !o && dispatch({ type: "close" })}>
      <DrawerContent className="max-h-[72dvh]">
        <DrawerHeader className="text-left">
          <DrawerTitle className="sr-only">Patch for this step</DrawerTitle>
          <AssistantHead />
        </DrawerHeader>
        {patch && open && <Body patch={patch} />}
      </DrawerContent>
    </Drawer>
  )
}
