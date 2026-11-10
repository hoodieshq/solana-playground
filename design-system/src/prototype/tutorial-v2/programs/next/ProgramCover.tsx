import { ArrowRightLeft, Binary, Braces, Code, Cpu, Eye, Hourglass, IdCard, Layers, Save, SquareCheckBig, StickyNote, type LucideIcon } from "lucide-react"

import { TileCover } from "../../ui/TileCover"
import type { ProgramMeta, Topic } from "../data"

/* A program's cover: the tile cover (ui/TileCover.tsx) in Solana's greens and teals, with a picture of
   what the program does. Each picture is drawn by hand on the 12 by 12 grid. Read off a line icon by
   machine, strokes fell between tiles and the picture broke up: a database came out as a crate
   (Almaz, 10 Nov) */

/** From the top left to the bottom right, by what the program is for. Tutorials keep the violets */
const SWEEP: Record<Topic, [string, string]> = {
  Basics: ["#9BF7D6", "#14F195"],
  "Tokens and trading": ["#5FE3D0", "#2F8FD6"],
  "Network services": ["#B78CFF", "#19E3C0"],
}

/** The pictures, a row a string, # a lit tile. Each is the plainest thing that says what the program
 * does, and no two share a shape (Almaz, 10 Nov): a sheet with its corner folded (memo), a pair of braces
 * with nothing between them (the program that does nothing), a save disk (record keeps data), a chip with its pins (shared
 * memory), an hourglass (vesting), two arrows passing (a swap), 0 and 1 (a binary option), an eye (the
 * oracle), a stack of layers (the stake pool), a ticked box (a proposal), a name card (the name
 * service); then code's two brackets for a program with no picture of its own */
const ART: Record<string, string[]> = {
  "spl-memo": [
    "............",
    ".#######....",
    ".#.....##...",
    ".#.....#.#..",
    ".#.....####.",
    ".#........#.",
    ".#.######.#.",
    ".#........#.",
    ".#.######.#.",
    ".#........#.",
    ".##########.",
    "............",
  ],
  "spl-noop": [
    "............",
    "...##..##...",
    "..##....##..",
    "..##....##..",
    "..##....##..",
    ".##......##.",
    ".##......##.",
    "..##....##..",
    "..##....##..",
    "..##....##..",
    "...##..##...",
    "............",
  ],
  "spl-record": [
    "............",
    ".#########..",
    ".#.#####.##.",
    ".#.#####..#.",
    ".#.#####..#.",
    ".#........#.",
    ".#.######.#.",
    ".#.#....#.#.",
    ".#.#....#.#.",
    ".#.#....#.#.",
    ".##########.",
    "............",
  ],
  "spl-shared-memory": [
    "............",
    "...#.##.#...",
    "..########..",
    ".##......##.",
    "..#.####.#..",
    ".##.####.##.",
    ".##.####.##.",
    "..#.####.#..",
    ".##......##.",
    "..########..",
    "...#.##.#...",
    "............",
  ],
  "token-vesting": [
    "............",
    "..########..",
    "..#......#..",
    "...#....#...",
    "....#..#....",
    ".....##.....",
    ".....##.....",
    "....#..#....",
    "...#.##.#...",
    "..#.####.#..",
    "..########..",
    "............",
  ],
  "spl-stateless-asks": [
    "............",
    ".......#....",
    ".......##...",
    ".#########..",
    ".......##...",
    ".......#....",
    "....#.......",
    "...##.......",
    "..#########.",
    "...##.......",
    "....#.......",
    "............",
  ],
  "spl-binary-option": [
    "............",
    "............",
    "..###...##..",
    ".##.##.###..",
    ".##.##..##..",
    ".##.##..##..",
    ".##.##..##..",
    ".##.##..##..",
    ".##.##..##..",
    "..###..####.",
    "............",
    "............",
  ],
  "spl-binary-oracle-pair": [
    "............",
    "............",
    "....####....",
    "..##....##..",
    ".#...##...#.",
    "#...####...#",
    "#...####...#",
    ".#...##...#.",
    "..##....##..",
    "....####....",
    "............",
    "............",
  ],
  "spl-stake-pool": [
    "............",
    ".....##.....",
    "...######...",
    ".##########.",
    "...######...",
    ".#...##...#.",
    "..###..###..",
    ".#...##...#.",
    "..###..###..",
    ".....##.....",
    "............",
    "............",
  ],
  "spl-feature-proposal": [
    "............",
    ".##########.",
    ".#........#.",
    ".#......#.#.",
    ".#.....##.#.",
    ".#....##..#.",
    ".###.##...#.",
    ".#.###....#.",
    ".#..#.....#.",
    ".#........#.",
    ".##########.",
    "............",
  ],
  "spl-name-service": [
    "............",
    "............",
    ".##########.",
    "#..........#",
    "#..##..###.#",
    "#..##......#",
    "#......###.#",
    "#.####.....#",
    "#..........#",
    ".##########.",
    "............",
    "............",
  ],
  default: [
    "............",
    "............",
    "....#..#....",
    "...#....#...",
    "..#......#..",
    ".#........#.",
    "..#......#..",
    "...#....#...",
    "....#..#....",
    "............",
    "............",
    "............",
  ],
}

/** What each program does as a line icon: the catalog banner lays this one as its voxel sculpture */
const ICONS: Record<string, LucideIcon> = {
  "spl-memo": StickyNote,
  "spl-noop": Braces,
  "spl-record": Save,
  "spl-shared-memory": Cpu,
  "token-vesting": Hourglass,
  "spl-stateless-asks": ArrowRightLeft,
  "spl-binary-option": Binary,
  "spl-binary-oracle-pair": Eye,
  "spl-stake-pool": Layers,
  "spl-feature-proposal": SquareCheckBig,
  "spl-name-service": IdCard,
}

/** A program's icon by its slug, for the banner's sculpture */
export const programCoverIcon = (slug: string) => ICONS[slug] ?? Code

/** Decorative: the card's own text names the program */
export function ProgramCover({ p, className }: { p: ProgramMeta; className?: string }) {
  return <TileCover art={ART[p.slug] ?? ART.default} sweep={SWEEP[p.topic]} className={className} />
}
