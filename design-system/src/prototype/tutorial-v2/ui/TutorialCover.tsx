import {
  Anchor,
  Axe,
  Coins,
  Compass,
  Droplet,
  GraduationCap,
  Grid3x3,
  Hand,
  Hash,
  Landmark,
  ListChecks,
  MapIcon,
  MemoryStick,
  Receipt,
  Swords,
  Vault,
  Waves,
  type LucideIcon,
} from "lucide-react"

import { cn } from "@/lib/utils"

/* A tutorial's cover in the brand, as client-v2 draws it: one of the Styleguide's grounds and the
   lesson's icon in white on it, so a wall of them reads as one family and each still differs. The
   ground says the framework, the icon the lesson. The grounds' fields are the deck's
   (views/deck/Atmosphere.tsx), held still */

type Ground = "haze" | "deep" | "explore" | "violet"
type Field = { c: string; x: number; y: number; s: number; o?: number }

const BEDS: Record<Ground, string> = { haze: "#B8A6F5", deep: "#6858D2", explore: "#6A63CD", violet: "#6A4BCF" }

const FIELDS: Record<Ground, Field[]> = {
  haze: [
    { c: "#2DCEA9", x: 104, y: -6, s: 0.62 },
    { c: "#5FD5C1", x: -4, y: 106, s: 0.62 },
    { c: "#D2B0FF", x: 36, y: 44, s: 1.05 },
    { c: "#ACBCEC", x: -6, y: 8, s: 0.6 },
    { c: "#7F87E5", x: 92, y: 58, s: 0.66 },
    { c: "#AA8FF4", x: 62, y: 96, s: 0.66 },
    { c: "#C0A6F9", x: 30, y: -4, s: 0.6 },
  ],
  deep: [
    { c: "#2DCEA9", x: 104, y: -6, s: 0.58 },
    { c: "#2B9C9E", x: -4, y: 106, s: 0.58 },
    { c: "#6A4AD4", x: 46, y: 56, s: 1.0 },
    { c: "#7D90E8", x: -6, y: 4, s: 0.6 },
    { c: "#5595CB", x: 104, y: 62, s: 0.6 },
    { c: "#4A4AAF", x: 38, y: 108, s: 0.66 },
    { c: "#8F78F6", x: 34, y: -6, s: 0.6 },
  ],
  explore: [
    { c: "#14F195", x: 104, y: 14, s: 0.66 },
    { c: "#3D95AC", x: -4, y: 86, s: 0.6 },
    { c: "#7456D9", x: 44, y: 56, s: 0.9 },
    { c: "#33CFAE", x: -6, y: -4, s: 0.58 },
    { c: "#16EE97", x: 104, y: 88, s: 0.7 },
    { c: "#4A48AD", x: 28, y: 108, s: 0.62 },
    { c: "#8C6EF5", x: 44, y: -6, s: 0.6 },
  ],
  violet: [
    { c: "#9945FF", x: 104, y: -6, s: 0.8 },
    { c: "#1E2173", x: -4, y: 106, s: 0.78 },
    { c: "#7A56DA", x: 46, y: 52, s: 0.9 },
    { c: "#9496F9", x: -6, y: -6, s: 0.66 },
    { c: "#8A4AF0", x: 104, y: 58, s: 0.6 },
    { c: "#3A2893", x: 36, y: 108, s: 0.66 },
    { c: "#957BFB", x: 40, y: -6, s: 0.6 },
  ],
}

const GROUND_BY_FRAMEWORK: Record<string, Ground> = { Anchor: "deep", Native: "explore", Seahorse: "violet" }

/* By level, for the gallery's sections (Almaz, 6 Nov, after the Programs covers): three clear steps
   inside the tutorials' violets, a green lean for Beginner, blue for Intermediate, deep purple for
   Advanced. The framework grounds above share one base and read as one colour side by side */
const LEVEL_BEDS: Record<string, string> = { Beginner: "#7A5FE0", Intermediate: "#4C5FD6", Advanced: "#6A2FC4" }
const LEVEL_FIELDS: Record<string, Field[]> = {
  Beginner: FIELDS.explore,
  Intermediate: [
    { c: "#3FA9F5", x: 104, y: -6, s: 0.62 },
    { c: "#2E3A9E", x: -4, y: 106, s: 0.66 },
    { c: "#5A6CF0", x: 46, y: 54, s: 1.0 },
    { c: "#7FB2F2", x: -6, y: -4, s: 0.58 },
    { c: "#4A8BE0", x: 104, y: 70, s: 0.6 },
    { c: "#2A2F86", x: 36, y: 108, s: 0.64 },
  ],
  Advanced: [
    { c: "#C04BF0", x: 104, y: -6, s: 0.66 },
    { c: "#2A1270", x: -4, y: 106, s: 0.72 },
    { c: "#8A3BEA", x: 46, y: 52, s: 0.95 },
    { c: "#B07CFB", x: -6, y: -6, s: 0.58 },
    { c: "#9945FF", x: 104, y: 62, s: 0.62 },
    { c: "#3A1A93", x: 36, y: 108, s: 0.66 },
  ],
}

/* What each lesson is about, drawn in the middle of its cover, as client-v2 draws it on
   scope/interface-2 (entities/tutorial/ui/art/TutorialCover.tsx). A tutorial with no icon here, a new
   one, gets the cap */
const ICONS: Record<string, LucideIcon> = {
  "Hello Anchor": Anchor,
  "Hello Seahorse": Waves,
  "Hello Solana": Hand,
  "Bank Simulator": Landmark,
  "Battle Coins": Coins,
  "Boss Battle": Swords,
  "Counter PDA Tutorial": Hash,
  "Expense Tracker": Receipt,
  "Faucet Seahorse": Droplet,
  Lumberjack: Axe,
  "Spl Token Vault": Vault,
  "Tic-tac-toe Seahorse": Grid3x3,
  "Tiny Adventure": MapIcon,
  "Tiny Adventure Two": Compass,
  "Todo App Seahorse": ListChecks,
  "Zero Copy": MemoryStick,
}

/** A lesson's icon by the product's (upstream's) name; the banner draws the same one in voxels */
export const tutorialIcon = (name: string) => ICONS[name] ?? GraduationCap

const FIELD_FILL =
  "radial-gradient(closest-side, currentColor 0%, color-mix(in srgb, currentColor 72%, transparent) 30%, color-mix(in srgb, currentColor 34%, transparent) 60%, color-mix(in srgb, currentColor 10%, transparent) 82%, transparent 100%)"

/** Decorative: the card's own text names the tutorial. `name` is the product's (upstream's) name,
 * which picks the icon, so a cover matches the product's */
export function TutorialCover({ name, framework, level, className }: { name: string; framework?: string; level?: string; className?: string }) {
  const ground = GROUND_BY_FRAMEWORK[framework ?? ""] ?? "haze"
  // A level, where the caller passes one, picks the ground instead of the framework
  const bed = (level && LEVEL_BEDS[level]) || BEDS[ground]
  const fields = (level && LEVEL_FIELDS[level]) || FIELDS[ground]
  const Icon = tutorialIcon(name)
  return (
    <span aria-hidden="true" style={{ backgroundColor: bed }} className={cn("relative block shrink-0 overflow-hidden text-white", className)}>
      {fields.map((f, i) => (
        <span
          key={i}
          className="absolute aspect-square w-full rounded-full"
          style={{
            color: f.c,
            opacity: f.o ?? 0.94,
            left: `${f.x}%`,
            top: `${f.y}%`,
            transform: `translate(-50%, -50%) scale(${f.s})`,
            background: FIELD_FILL,
          }}
        />
      ))}
      {/* Half the tile, a touch lighter than lucide's stroke of 2 */}
      <Icon strokeWidth={1.75} className="absolute inset-1/4 size-1/2" />
    </span>
  )
}
