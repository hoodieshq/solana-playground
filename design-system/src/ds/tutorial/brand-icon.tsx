import { BrandIcon, type BrandIconName } from "@/components/ui/brand-icon"

import { Block, More } from "../parts"

const ICONS: { name: BrandIconName; label: string }[] = [
  { name: "home", label: "Home" },
  { name: "new", label: "New project" },
  { name: "tutorial", label: "Tutorials" },
  { name: "programs", label: "Programs" },
  { name: "search", label: "Search" },
  { name: "profile", label: "Profile" },
]

function BrandIconBlock() {
  return (
    <Block
      id="brand-icon"
      title="Brand icon"
      source="playground"
      registry="brand-icon"
      note="The product's own icons, each cut from the mark's shapes: home, new, tutorial, programs, search and profile. They are client-v2's, drawn from the brand's mark, the one LogoMark draws (the play triangle folded from Solana's three bars, with the O beside it). Each keeps its own aspect inside a square box, so a row of them sits on one line. The colour comes from the text around it; the label beside it names it, so the icon is hidden from a screen reader."
      more={
        <More label="In a nav row, at 16px and 20px">
          <div className="flex flex-col gap-1 text-[0.8125rem] text-muted-foreground">
            {ICONS.slice(0, 4).map((icon, i) => (
              <span
                key={icon.name}
                className={i === 2 ? "flex h-7 items-center gap-2 rounded-md bg-surface-hover px-2 font-medium text-foreground" : "flex h-7 items-center gap-2 px-2"}
              >
                <BrandIcon name={icon.name} />
                {icon.label}
              </span>
            ))}
          </div>
          <div className="flex items-center gap-4 text-muted-foreground">
            {ICONS.map((icon) => (
              <BrandIcon key={icon.name} name={icon.name} className="size-5" />
            ))}
          </div>
        </More>
      }
    >
      {ICONS.map((icon) => (
        <span key={icon.name} className="flex items-center gap-2 text-[0.8125rem] text-muted-foreground">
          <BrandIcon name={icon.name} className="size-5 text-foreground" />
          {icon.label}
        </span>
      ))}
    </Block>
  )
}

export { BrandIconBlock }
