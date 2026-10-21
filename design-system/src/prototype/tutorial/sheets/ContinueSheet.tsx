import { Copy, Monitor } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Drawer, DrawerContent, DrawerDescription, DrawerFooter, DrawerHeader, DrawerTitle } from "@/components/ui/drawer"

import { STEPS } from "../data"
import { useStore } from "../store"

/** The way out for someone who wants to type the code: the phone's editor is
 * read-only, so the step continues on a computer from the same place */
export function ContinueSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { s } = useStore()
  const link = `beta.solpg.io/t/hello-anchor/${s.step + 1}`

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(`https://${link}`)
    } catch {
      // No clipboard in this context: the toast still shows the intent
    }
    toast("Link copied")
  }

  return (
    <Drawer open={open} onOpenChange={(o) => !o && onClose()}>
      <DrawerContent>
        <DrawerHeader>
          <span className="mb-2 flex size-12 items-center justify-center rounded-panel bg-surface-raised text-muted-foreground">
            <Monitor strokeWidth={1.75} className="size-6" />
          </span>
          <DrawerTitle className="font-heading text-title! font-normal!">Write it yourself on a computer</DrawerTitle>
          <DrawerDescription className="mt-1 text-body text-muted-foreground">
            On a phone the code is read-only. Open this link on your computer to type step {s.step + 1}, {STEPS[s.step].title}, yourself. Your progress
            comes with you.
          </DrawerDescription>
        </DrawerHeader>
        <div className="px-4">
          <div className="flex h-14 items-center gap-2 rounded-control border border-border bg-surface-well pr-1 pl-3">
            <span className="min-w-0 flex-1 truncate font-mono text-code text-foreground">{link}</span>
            <Button variant="secondary" className="h-11 gap-2 px-3" onClick={copy}>
              <Copy strokeWidth={1.75} className="size-4" />
              Copy
            </Button>
          </div>
        </div>
        <DrawerFooter className="pb-[max(var(--safe-bottom),16px)]">
          <Button variant="secondary" className="h-14" onClick={onClose}>
            Stay on the phone
          </Button>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  )
}
