import { ArrowRightLeft, AtSign, CircleDashed, Code, Database, Eye, Hourglass, Layers, Scale, Share2, StickyNote, Vote, type LucideIcon } from "lucide-react"

import { cn } from "@/lib/utils"

import type { ProgramMeta, Topic } from "../data"

/* A program's cover, made the way a tutorial's is (ui/TutorialCover.tsx): a ground of soft colour
   fields and the program's icon in white on it. Tutorials sit on the brand's violets; programs are
   what lives on devnet, so they take Solana's greens and teals. The ground says the section, the icon
   the program */

type Field = { c: string; x: number; y: number; s: number; o?: number }

const BEDS: Record<Topic, string> = { Basics: "#169C7C", "Tokens and trading": "#1A7F94", "Network services": "#1F4F86" }

const FIELDS: Record<Topic, Field[]> = {
  Basics: [
    { c: "#14F195", x: 104, y: -6, s: 0.7 },
    { c: "#0E7C6B", x: -4, y: 106, s: 0.66 },
    { c: "#2FD9A6", x: 44, y: 52, s: 1.0 },
    { c: "#7CF2C8", x: -6, y: -4, s: 0.56 },
    { c: "#11B886", x: 104, y: 70, s: 0.62 },
    { c: "#0B6A5F", x: 40, y: 108, s: 0.62 },
  ],
  "Tokens and trading": [
    { c: "#19E3C0", x: 104, y: -6, s: 0.66 },
    { c: "#1B5FA8", x: -4, y: 106, s: 0.64 },
    { c: "#24B8C4", x: 46, y: 54, s: 1.0 },
    { c: "#5FE3D0", x: -6, y: -4, s: 0.58 },
    { c: "#2F8FD6", x: 104, y: 72, s: 0.62 },
    { c: "#145F86", x: 36, y: 108, s: 0.62 },
  ],
  "Network services": [
    { c: "#14F195", x: 104, y: -6, s: 0.6 },
    { c: "#3A2893", x: -4, y: 106, s: 0.7 },
    { c: "#2A6FB8", x: 46, y: 54, s: 1.0 },
    { c: "#2DCEA9", x: -6, y: -4, s: 0.56 },
    { c: "#5B4FD1", x: 104, y: 72, s: 0.6 },
    { c: "#173E73", x: 36, y: 108, s: 0.64 },
  ],
}

/** What each program does, drawn in the middle of its cover */
const ICONS: Record<string, LucideIcon> = {
  "spl-memo": StickyNote,
  "spl-noop": CircleDashed,
  "spl-record": Database,
  "spl-shared-memory": Share2,
  "token-vesting": Hourglass,
  "spl-stateless-asks": ArrowRightLeft,
  "spl-binary-option": Scale,
  "spl-binary-oracle-pair": Eye,
  "spl-stake-pool": Layers,
  "spl-feature-proposal": Vote,
  "spl-name-service": AtSign,
}

/** A program's icon by its slug; the catalog banner draws the same one in voxels */
export const programCoverIcon = (slug: string) => ICONS[slug] ?? Code

const FIELD_FILL =
  "radial-gradient(closest-side, currentColor 0%, color-mix(in srgb, currentColor 72%, transparent) 30%, color-mix(in srgb, currentColor 34%, transparent) 60%, color-mix(in srgb, currentColor 10%, transparent) 82%, transparent 100%)"

/** Decorative: the card's own text names the program */
export function ProgramCover({ p, className }: { p: ProgramMeta; className?: string }) {
  const Icon = programCoverIcon(p.slug)
  return (
    <span aria-hidden="true" style={{ backgroundColor: BEDS[p.topic] }} className={cn("relative block shrink-0 overflow-hidden text-white", className)}>
      {FIELDS[p.topic].map((f, i) => (
        <span
          key={i}
          className="absolute aspect-square w-full rounded-full"
          style={{ color: f.c, opacity: f.o ?? 0.94, left: `${f.x}%`, top: `${f.y}%`, transform: `translate(-50%, -50%) scale(${f.s})`, background: FIELD_FILL }}
        />
      ))}
      {/* Half the tile, as the tutorials' covers draw it */}
      <Icon strokeWidth={1.75} className="absolute inset-1/4 size-1/2" />
    </span>
  )
}
