import { Fragment, useEffect, useState } from "react"
import { Check, Copy, Monitor, Share } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Drawer, DrawerContent, DrawerDescription, DrawerFooter, DrawerHeader, DrawerTitle } from "@/components/ui/drawer"

import { STEPS } from "../data"
import { useStore } from "../store"

/** The way out for someone who wants to type the code: the phone's editor is
 * read-only, so the step continues on a computer from the same place */
export function ContinueSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { s } = useStore()
  // Where the phone can hand the link on, to a laptop by AirDrop or a message to yourself. A
  // browser without it gets Copy alone
  const canShare = typeof navigator.share === "function"
  const link = `beta.solpg.io/t/hello-anchor/${s.step + 1}`
  const url = `https://${link}`
  // Copy says it worked in its own words for a moment, where the eye already is
  const [copied, setCopied] = useState(false)
  useEffect(() => {
    if (!copied) return
    const t = window.setTimeout(() => setCopied(false), 2000)
    return () => window.clearTimeout(t)
  }, [copied])

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url)
    } catch {
      // No clipboard in this context (an embed, an automated browser): the prototype still shows the intent
    }
    setCopied(true)
  }

  const share = async () => {
    try {
      await navigator.share({ title: `Hello Anchor, step ${s.step + 1}`, url })
    } catch {
      // Closing the share sheet rejects too, and that's not an error worth a word
    }
  }

  return (
    <Drawer open={open} onOpenChange={(o) => !o && onClose()}>
      {/* As the Explain sheet: the body scrolls when a large font needs it, the footer stays put */}
      <DrawerContent className="max-h-[82dvh]">
        {/* Everything but the footer scrolls: with a large font on a small phone even the title is
            worth the room */}
        <div className="min-h-0 flex-1 overflow-y-auto pb-2">
          <DrawerHeader>
            <span className="mb-2 flex size-12 items-center justify-center rounded-panel bg-surface-raised text-muted-foreground">
              <Monitor strokeWidth={1.75} className="size-6" />
            </span>
            <DrawerTitle className="font-heading text-title! font-normal!">Write it yourself on a computer</DrawerTitle>
          </DrawerHeader>
          <div className="px-4">
            {/* text-body needs the ! here: cn drops it next to a colour class and the stock 14px comes back */}
            <DrawerDescription className="text-body! font-read text-muted-foreground">
              On a phone the code is read-only. Open this link on your computer to type step {s.step + 1}, {STEPS[s.step].title}, yourself. Your progress
              comes with you.
            </DrawerDescription>
            {/* The whole link, wrapped, never cut: it's what gets typed in if nothing else works. It
                breaks after a slash where it can, inside a word only where it must */}
            <p className="mt-4 rounded-control border border-border bg-surface-well px-3 py-3 font-mono text-code wrap-anywhere text-foreground select-all">
              {link.split("/").map((part, i) => (
                <Fragment key={i}>
                  {i > 0 && (
                    <>
                      /<wbr />
                    </>
                  )}
                  {part}
                </Fragment>
              ))}
            </p>
            <div className="mt-2 flex gap-2">
              <Button variant="secondary" className="h-12 flex-1 gap-2" onClick={copy}>
                {copied ? <Check strokeWidth={2} className="size-4 text-success" /> : <Copy strokeWidth={1.75} className="size-4" />}
                {/* Announced as it changes, so a screen reader hears it worked too */}
                <span aria-live="polite">{copied ? "Copied" : "Copy link"}</span>
              </Button>
              {canShare && (
                <Button variant="secondary" className="h-12 flex-1 gap-2" onClick={share}>
                  <Share strokeWidth={1.75} className="size-4" />
                  Share
                </Button>
              )}
            </div>
          </div>
        </div>
        <DrawerFooter className="shrink-0 pb-[max(var(--safe-bottom),16px)]">
          <Button variant="secondary" className="h-14" onClick={onClose}>
            Stay on the phone
          </Button>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  )
}
