import { useState } from "react"

import {
  ActionCard,
  ActionCardContent,
  ActionCardDescription,
  ActionCardLink,
  ActionCardTitle,
} from "@/components/ui/action-card"
import { ArrowUp, CirclePlay } from "lucide-react"

import { BrandButton } from "@/components/ui/brand-button"
import { Composer, ComposerSend, ComposerToolbar } from "@/components/ui/composer"

import { useStore } from "../store"
import { CATALOG } from "../ui/catalog"
import { StartFromScratch } from "../newProject"
import { useNewProjectDesign } from "../newProject/design"
import { expressCreate, openFirstLight } from "../newProject/next/open"
import { Page, soon, TutorialRow } from "./Catalog"
import { LIT_STROKE, LitIcon, type LitIconName } from "./navLit/icons"
import { LimitNotice } from "./navLit/LimitNotice"

/* Lucide throughout, as the nav draws it (Almaz, 10 Nov): the glyphs cut from the product's mark are
   gone from Oak. The tiles take the nav's own icon for where they go */

/** The four the product's Home shows first, in its order */
const HOME_TUTORIALS = ["hello-anchor", "hello-seahorse", "hello-solana", "bank-simulator"].map((slug) => CATALOG.find((t) => t.slug === slug)).filter((t) => t !== undefined)

/** One of the three ways in, as the product's tiles: the nav's own glyph alone above the title. No line
 * under it: the title says where it goes */
function Tile({ icon, title, onClick, expanded }: { icon: LitIconName; title: string; onClick: () => void; expanded?: boolean }) {
  return (
    <ActionCard orientation="vertical">
      <span aria-hidden="true" className="mb-1 flex size-[1.125rem] text-muted-foreground [&>svg]:size-full">
        <LitIcon name={icon} />
      </span>
      <ActionCardContent>
        <ActionCardTitle>
          <ActionCardLink asChild>
            <button type="button" aria-expanded={expanded} onClick={onClick}>
              {title}
            </button>
          </ActionCardLink>
        </ActionCardTitle>
      </ActionCardContent>
    </ActionCard>
  )
}

/** Home, as client-v2's widgets/home BaseHome draws a first visit (scope/interface-2): the question,
 * the starter to run, the composer that opens the assistant, three ways in, and four tutorials. Run
 * it, the composer and Start aren't in this prototype; the tiles and the tutorials are */
export function Home() {
  const { dispatch } = useStore()
  const [unfolded, setUnfolded] = useState(false)
  // First Light: the tile opens the dialog, Run it makes and builds the Anchor starter
  const firstLight = useNewProjectDesign() === "next"

  return (
    <Page>
      <div className="mx-auto flex w-full max-w-[50rem] flex-col gap-5 px-8 pt-20 pb-16">
        <h1 className="text-center font-heading text-[2rem] leading-tight font-medium tracking-[-0.02em] text-foreground">Where should we begin?</h1>

        <section aria-label="Try an example">
          <ActionCard className="items-center">
            <ActionCardContent>
              <ActionCardTitle>Try the Anchor starter</ActionCardTitle>
              <ActionCardDescription>This program saves a number in an account and writes it to the logs.</ActionCardDescription>
            </ActionCardContent>
            <div className="relative z-10 ml-auto shrink-0 self-center">
              <BrandButton onClick={firstLight ? expressCreate : soon} aria-label={firstLight ? "Run the Anchor starter" : undefined}>
                Run it
                <CirclePlay strokeWidth={LIT_STROKE} />
              </BrandButton>
            </div>
          </ActionCard>
        </section>

        <LimitNotice className="-mb-2 px-1" />
        {/* No textarea: with no project, the whole box is one button that hands over to the assistant */}
        <Composer onSubmit={(e) => e.preventDefault()}>
          <button type="button" aria-label="Ask the assistant" onClick={soon} className="min-h-16 w-full px-[1.125rem] pt-[1.125rem] text-left text-[0.9375rem] text-subtle outline-none">
            Ask anything…
          </button>
          <ComposerToolbar>
            <ComposerSend
              type="button"
              disabled={false}
              onClick={soon}
              className="brand-action bg-transparent text-foreground [--stroke-fill:var(--surface-hover)] hover:bg-transparent hover:text-white"
            >
              <ArrowUp strokeWidth={LIT_STROKE} className="size-4" />
            </ComposerSend>
          </ComposerToolbar>
        </Composer>

        <div className="grid grid-cols-3 gap-3">
          {firstLight ? (
            <Tile icon="new" title="New project" onClick={() => openFirstLight({ entry: "home-tile" })} />
          ) : (
            <Tile icon="new" title="New project" expanded={unfolded} onClick={() => setUnfolded(!unfolded)} />
          )}
          <Tile icon="tutorials" title="Follow a tutorial" onClick={() => dispatch({ type: "open", screen: "gallery" })} />
          <Tile icon="programs" title="Open a program" onClick={() => dispatch({ type: "open", screen: "programs" })} />
        </div>

        {unfolded && <StartFromScratch />}

        {/* No All 16 here: Follow a tutorial just above opens the whole list. Setup lives in the nav's row */}
        <p className="mt-3 text-caption text-muted-foreground">Or learn from one of these</p>
        <div className="grid grid-cols-2 gap-3 max-lg:grid-cols-1">
          {HOME_TUTORIALS.map((t) => (
            <TutorialRow key={t.slug} t={t} />
          ))}
        </div>
      </div>
    </Page>
  )
}
