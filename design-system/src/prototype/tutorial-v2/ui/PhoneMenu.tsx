import { useState } from "react"
import { Menu, X } from "lucide-react"
import { Dialog } from "radix-ui"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

import { TopBar } from "./TopBar"
import { LitNav } from "../desktop/navLit/LitNav"
import { view } from "../view"

// Each group drops in 8px behind the one above it. Reduced motion keeps only the layer's fade
const ENTER = "animate-in fade-in-0 slide-in-from-top-2 duration-200 ease-out fill-mode-both motion-reduce:animate-none"

/** The product's navigation on a phone: the menu button opens Lit Path's column over the whole
 * screen, and its X takes the menu button's own spot, so the same tap closes it. Nothing of the page
 * shows behind, so the layer runs under the status bar too and needs no scrim */
export function PhoneMenu() {
  const [open, setOpen] = useState(false)
  // The upright tablet slides the nav in from the left over the dimmed page, as an iPad's sidebar
  // does: a full screen menu left wide empty sides there and hid where you were (Almaz, 11/09)
  const drawer = view === "portrait"
  const [searching, setSearching] = useState(false)

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger asChild>
        <Button variant="ghost" size="icon" className="size-11" aria-label="Menu">
          <Menu strokeWidth={1.75} className="size-6" />
        </Button>
      </Dialog.Trigger>
      <Dialog.Portal>
        {drawer && (
          <Dialog.Overlay className={cn("fixed inset-0 z-50 bg-black/50 data-open:animate-in data-open:fade-in-0 data-open:duration-200 data-closed:animate-out data-closed:fade-out-0 data-closed:duration-150 motion-reduce:duration-100!", searching && "invisible")} />
        )}
        {/* No first row taken on open: a tap had Home ringed as if it were the page. The layer itself
            holds the focus, so Tab still starts at the top */}
        <Dialog.Content
          aria-describedby={undefined}
          onOpenAutoFocus={(e) => {
            e.preventDefault()
            ;(e.currentTarget as HTMLElement).focus()
          }}
          className={cn(
            "fixed z-50 pt-[env(safe-area-inset-top)] text-foreground outline-none data-open:animate-in data-open:duration-200 data-open:ease-out data-closed:animate-out data-closed:duration-150 data-closed:ease-in motion-reduce:duration-100!",
            drawer && searching && "invisible",
            drawer
              ? "inset-y-0 left-0 w-80 border-r border-border bg-(--nav-ground) shadow-modal data-open:slide-in-from-left data-closed:slide-out-to-left motion-reduce:data-open:slide-in-from-left-0 motion-reduce:data-closed:slide-out-to-left-0"
              : "inset-0 bg-surface-base data-open:fade-in-0 data-closed:fade-out-0"
          )}
        >
          <Dialog.Title className="sr-only">Menu</Dialog.Title>
          {/* The page's own column, so the X sits exactly on the menu button (the drawer starts at the
              screen's edge, so its X lands there too) */}
          <div className={cn("flex h-full w-full flex-col", !drawer && "mx-auto max-w-[30rem]")}>
            <TopBar
              left={
                <Dialog.Close asChild>
                  <Button variant="ghost" size="icon" className="size-11" aria-label="Close menu">
                    <X strokeWidth={1.75} className="size-6 animate-in spin-in-[-90deg] fade-in-0 duration-[160ms] ease-out motion-reduce:animate-none" />
                  </Button>
                </Dialog.Close>
              }
            />
            {/* The same nav the desktop has, its open column at a thumb's size */}
            <div className={cn(ENTER, "min-h-0 flex-1 pb-[var(--safe-bottom)]")}>
              <LitNav sheet={{ onClose: () => setOpen(false), onSearch: drawer ? setSearching : undefined }} />
            </div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
