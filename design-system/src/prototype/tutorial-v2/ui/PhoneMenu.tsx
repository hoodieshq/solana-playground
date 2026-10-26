import { useState, type ReactNode } from "react"
import { Menu } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet"
import { cn } from "@/lib/utils"

import { useStore } from "../store"
import { BrandIcon, type BrandIconName } from "./brandGlyphs"
import { NAV_ICONS } from "./navIcons"

const soon = () => toast("Only the tutorial flow is in this prototype")

function Row({ glyph, label, current = false, onClick }: { glyph: ReactNode; label: string; current?: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-current={current ? "page" : undefined}
      className={cn(
        // The sheet is the hover grey itself, so the current row and a press take fills of their own,
        // as the Files sheet's open file does
        "flex h-11 w-full items-center gap-3 rounded-lg px-3 text-left text-[0.9375rem] transition-colors outline-none active:bg-foreground/[0.05] focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-brand-purple [&>span:first-child]:size-5",
        current ? "bg-foreground/[0.07] text-foreground active:bg-foreground/[0.07]" : "text-muted-foreground"
      )}
    >
      <span aria-hidden="true" className="flex shrink-0 items-center justify-center [&>svg]:size-full">
        {glyph}
      </span>
      {label}
    </button>
  )
}

/** The product's navigation on a phone: the menu button at the top bar's start opens the desktop
 * sidebar's rows in a sheet from the left, so the phone reaches the same places */
export function PhoneMenu() {
  const { s, dispatch } = useStore()
  const [open, setOpen] = useState(false)
  const inProject = s.screen === "step" || s.screen === "finish"
  const go = (then: () => void) => () => {
    setOpen(false)
    then()
  }
  const destinations: { label: string; icon: BrandIconName; current: boolean; onClick: () => void }[] = [
    { label: "Home", icon: "home", current: false, onClick: go(soon) },
    { label: "New project", icon: "new", current: false, onClick: go(soon) },
    { label: "Tutorials", icon: "tutorial", current: !inProject, onClick: go(() => dispatch({ type: "open", screen: "gallery" })) },
    { label: "Programs", icon: "programs", current: false, onClick: go(soon) },
  ]
  const projects = ["Counter", "Token Faucet", "Voting", "Tip Jar", ...(s.startedAt !== null ? ["Hello Anchor"] : [])]

  return (
    <>
      <Button variant="ghost" size="icon" className="size-11" aria-label="Menu" onClick={() => setOpen(true)}>
        <Menu strokeWidth={1.75} className="size-6" />
      </Button>
      <Sheet open={open} onOpenChange={setOpen}>
        {/* No first row taken on open: a tap had Home ringed as if it were the page. The sheet itself
            holds the focus, so Tab still starts at the top. A soft shadow parts it from the page, no rule */}
        <SheetContent
          side="left"
          onOpenAutoFocus={(e) => {
            e.preventDefault()
            ;(e.currentTarget as HTMLElement).focus()
          }}
          className="w-[18rem]! gap-0 border-r-0 bg-surface-panel p-0 pt-[env(safe-area-inset-top)] shadow-[12px_0_40px_rgb(0_0_0/0.45)] outline-none"
        >
          <SheetTitle className="flex h-phone-head items-center px-5 font-heading text-title font-normal">Solana Playground</SheetTitle>
          <div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-2 pt-2">
            {destinations.map((d) => (
              <Row key={d.label} glyph={<BrandIcon name={d.icon} />} label={d.label} current={d.current} onClick={d.onClick} />
            ))}
            <p className="mt-5 mb-1 px-3 text-caption text-muted-foreground">Projects</p>
            {projects.map((name) => (
              <Row
                key={name}
                glyph={NAV_ICONS.folder}
                label={name}
                current={name === "Hello Anchor" && inProject}
                onClick={go(name === "Hello Anchor" ? () => dispatch({ type: "open", screen: "step" }) : soon)}
              />
            ))}
          </div>
          <div className="flex flex-col gap-px border-t border-border px-2 pt-1.5 pb-[max(var(--safe-bottom),12px)]">
            <Row glyph={<span className="mx-auto block size-2 rounded-full bg-success" />} label="Devnet" onClick={go(soon)} />
            <Row glyph={<BrandIcon name="profile" />} label="Sign in" onClick={go(soon)} />
          </div>
        </SheetContent>
      </Sheet>
    </>
  )
}
