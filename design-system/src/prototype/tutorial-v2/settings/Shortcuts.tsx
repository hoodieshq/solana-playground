import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Kbd } from "@/components/ui/kbd"

import { SHORTCUTS } from "../desktop/keys"

/** Every shortcut that works in Oak, in four groups: the keys that work anywhere, what you do in the
 * lesson, the panels, and moving between steps. Without rules the alike rows ran together; the groups
 * give the eye a place to rest, 16 apart, each under a small grey name. Rows are 32, the words in the
 * text's colour and size so they lead the key caps, and the dialog is 320 wide so a short name isn't far
 * from its keys. One overlay for the app: Help, ⌘K, ? and the lesson's ⋯ all open it */
const GROUPS = ["Everywhere", "In the lesson", "Panels", "Steps"] as const
export function ShortcutsDialog({ open, onOpenChange, onCloseAutoFocus }: { open: boolean; onOpenChange: (open: boolean) => void; onCloseAutoFocus?: (e: Event) => void }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-80!" onCloseAutoFocus={onCloseAutoFocus}>
        <DialogHeader>
          <DialogTitle>Keyboard shortcuts</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-4">
          {GROUPS.map((group) => (
            <section key={group} aria-label={group}>
              <h3 className="mb-1 text-[0.75rem] leading-4 text-subtle">{group}</h3>
              <dl className="flex flex-col">
                {SHORTCUTS.filter((k) => k.group === group).map((k) => (
                  <div key={k.what} className="flex h-8 items-center justify-between gap-4">
                    <dt className="text-[0.875rem] leading-[1.125rem] text-foreground/80">{k.what}</dt>
                    <dd className="flex gap-1">
                      {k.keys.split(" ").map((key) => (
                        <Kbd key={key}>{key}</Kbd>
                      ))}
                    </dd>
                  </div>
                ))}
              </dl>
            </section>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  )
}
