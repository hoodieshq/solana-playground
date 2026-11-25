import { cn } from "@/lib/utils"

import { QUIET_SWEEP, TileCover } from "../../ui/TileCover"
import type { Framework } from "../store"

/* A project of your own: the tile cover the catalog and the lessons wear, in Solana's purple to green,
   with a picture of the framework it was started on. The framework's own logo on a grey tile was the
   last cover left in the old style (Almaz, 11 Nov) */

// Every cover in Programs, yours and the catalog's, in the tutorials' quiet grey (ui/TileCover.tsx)
export const SWEEP = QUIET_SWEEP

const ART: Record<Framework | "account" | "tutorial", string[]> = {
  anchor: [
    "............",
    ".....##.....",
    "....#..#....",
    ".....##.....",
    ".....##.....",
    "...######...",
    ".....##.....",
    ".#...##...#.",
    ".#...##...#.",
    ".##..##..##.",
    "..########..",
    "....####....",
  ],
  // Rust's crab, claws up
  native: [
    "............",
    "............",
    ".#........#.",
    "##.#....#.##",
    ".##......##.",
    "..#.####.#..",
    "...######...",
    "..########..",
    ".#.######.#.",
    ".#..#..#..#.",
    "....#..#....",
    "............",
  ],
  // Pinocchio in outline, as the anchor and the crab are: the cap leaning back, one eye, the long nose
  pinocchio: [
    "#...........",
    ".##.........",
    "..###.......",
    "..#..##.....",
    ".########...",
    "..#.....#...",
    "..#..#..#...",
    "..#.....####",
    "..#.....#...",
    "...#...#....",
    "....###.....",
    "............",
  ],
  // A quasar: the bright core, its disk seen edge on to each side, a jet out of each pole. Drawn as a
  // closed oval with the core inside, it read as an eye (Almaz, 23 Nov)
  quasar: [
    ".....##.....",
    ".....##.....",
    ".....##.....",
    "............",
    "....####....",
    "###.####.###",
    "###.####.###",
    "....####....",
    "............",
    ".....##.....",
    ".....##.....",
    ".....##.....",
  ],
  // TS: the S with its corners cut, so it isn't a 5
  "ts-client": [
    "............",
    "............",
    "#####..####.",
    "..#...#.....",
    "..#...#.....",
    "..#....###..",
    "..#.......#.",
    "..#.......#.",
    "..#.......#.",
    "..#...####..",
    "............",
    "............",
  ],
  // An open book: New project's way to the tutorials. Empty pages: a dot on each read as an animal's
  // eyes, lines of text as letters (Almaz, 23 Nov)
  tutorial: [
    "............",
    "............",
    ".####..####.",
    ".#...##...#.",
    ".#...##...#.",
    ".#...##...#.",
    ".#...##...#.",
    ".#...##...#.",
    ".####..####.",
    ".....##.....",
    "............",
    "............",
  ],
  // Saved to your account, nothing more known about it
  account: [
    "............",
    "............",
    ".####.......",
    ".#..#######.",
    ".##########.",
    ".#........#.",
    ".#........#.",
    ".#........#.",
    ".#........#.",
    ".##########.",
    "............",
    "............",
  ],
}

/** Decorative: the row's own words name the project. 44 on a row, as the catalog's and the lessons' */
export function ProjectCover({ framework, className }: { framework: Framework | "account" | "tutorial"; className?: string }) {
  return <TileCover art={ART[framework]} sweep={SWEEP} className={cn("size-11 shrink-0 rounded-[9px]", className)} />
}
