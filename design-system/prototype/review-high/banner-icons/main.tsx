import { createRoot } from "react-dom/client"

import "@/index.css"

import { CATALOG as PROGRAMS } from "@/prototype/tutorial-v2/programs/data"
import { programCoverIcon } from "@/prototype/tutorial-v2/programs/next/ProgramCover"
import { ProgramVoxels } from "@/prototype/tutorial-v2/programs/next/ProgramVoxels"
import { CATALOG, shownName, upstreamName } from "@/prototype/tutorial-v2/ui/catalog"
import { IsoVoxels } from "@/prototype/tutorial-v2/ui/IsoVoxels"
import { tutorialIcon } from "@/prototype/tutorial-v2/ui/TutorialCover"

/* Every tutorial's and program's icon as their banners lay it down, at the desktop banner's 736 by
   247. Only the art and the name; the banners' own words and buttons are in Oak */
function Board() {
  return (
    <main className="mx-auto max-w-[1520px] p-8">
      <h1 className="font-heading text-2xl text-foreground">Banner icons</h1>
      <h2 className="mt-6 font-heading text-xl text-foreground">Tutorials</h2>
      <p className="mt-1 text-sm text-muted-foreground">The lesson's icon in voxels, at the desktop banner's size. The banner itself shows Hello Anchor, Lumberjack and Zero Copy.</p>
      <div className="mt-6 grid grid-cols-[repeat(auto-fill,736px)] gap-4">
        {CATALOG.map((t) => (
          <section
            key={t.slug}
            style={{ background: "radial-gradient(120% 140% at 100% 0%, #9945ff24, transparent 62%), var(--surface-panel)" }}
            className="relative isolate h-[247px] w-[736px] overflow-hidden rounded-card border border-border"
          >
            <IsoVoxels icon={tutorialIcon(upstreamName(t))} />
            <div className="relative p-7">
              <p className="text-[0.8125rem] text-muted-foreground">{t.framework}</p>
              <h2 className="mt-1.5 font-heading text-[1.5rem] font-normal tracking-[-0.015em] text-foreground">{shownName(t)}</h2>
            </div>
          </section>
        ))}
      </div>
      <h2 className="mt-12 font-heading text-xl text-foreground">Programs</h2>
      <p className="mt-1 text-sm text-muted-foreground">The Programs banner shows spl-memo.</p>
      <div className="mt-6 grid grid-cols-[repeat(auto-fill,736px)] gap-4">
        {PROGRAMS.map((p) => (
          <section
            key={p.slug}
            style={{ background: "radial-gradient(120% 140% at 100% 0%, #14f1951a, transparent 62%), var(--surface-panel)" }}
            className="relative isolate h-[240px] w-[736px] overflow-hidden rounded-card border border-border"
          >
            <ProgramVoxels icon={programCoverIcon(p.slug)} />
            <div className="relative p-7">
              <p className="text-[0.8125rem] text-muted-foreground">{p.topic}</p>
              <h2 className="mt-1.5 font-heading text-[1.5rem] font-normal tracking-[-0.015em] text-foreground">{p.name}</h2>
            </div>
          </section>
        ))}
      </div>
    </main>
  )
}

createRoot(document.getElementById("root")!).render(<Board />)
