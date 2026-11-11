import { BookOpen, Bug, Check, ChevronDown, Keyboard, PanelLeft, Settings, X } from "lucide-react"
import type { ComponentType } from "react"

import { SmallIcon, type SmallIconName } from "../../ui/smallGlyphs"

type Icon = ComponentType<{ className?: string; strokeWidth?: number }>

/** One of the mark's own icons, drawn for the nav's size (ui/smallGlyphs.tsx), as a component the rows
 * take in a Lucide icon's place. Filled, so the stroke a row passes is nothing to it */
const mark = (name: SmallIconName): Icon => ({ className }) => <SmallIcon name={name} className={className} />

/** Lit Path's icons. Where you go and what is yours wear the mark's icons (Almaz, 11 Nov: the art
 * director's set, redrawn so its slits and cuts hold at 16 to 20 pixels); the rest is Lucide at one
 * stroke. The container sets the size */
export const LIT_ICONS = {
  search: mark("search"),
  home: mark("home"),
  new: mark("new"),
  tutorials: mark("tutorial"),
  programs: mark("programs"),
  /** A project, where a row has to say what it is: in Pinned, beside lessons. Programs' own icon, as a
   * lesson's row wears Tutorials' */
  project: mark("programs"),
  sidebar: PanelLeft,
  caret: ChevronDown,
  close: X,
  check: Check,
  profile: mark("profile"),
  settings: Settings,
  keyboard: Keyboard,
  book: BookOpen,
  bug: Bug,
} satisfies Record<string, Icon>

/** Heavier than Lucide's 2 (Almaz, 11/06), nearer the weight of the labels beside them */
export const LIT_STROKE = 2.4

export type LitIconName = keyof typeof LIT_ICONS

export function LitIcon({ name, className }: { name: LitIconName; className?: string }) {
  const Icon = LIT_ICONS[name]
  return <Icon aria-hidden="true" strokeWidth={LIT_STROKE} className={className} />
}
