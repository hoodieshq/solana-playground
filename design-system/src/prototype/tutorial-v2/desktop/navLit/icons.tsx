import { Blocks, BookOpen, Bug, Check, ChevronDown, Folder, GraduationCap, House, Keyboard, PanelLeft, Plus, Search, Settings, User, X, type LucideIcon } from "lucide-react"

/** Lit Path's icons, all from Lucide at one stroke, so they read as one family (as Claude's sidebar
 * does). The container sets the size */
export const LIT_ICONS = {
  search: Search,
  home: House,
  new: Plus,
  tutorials: GraduationCap,
  programs: Blocks,
  /** A project, where a row has to say what it is: in Pinned, beside lessons */
  project: Folder,
  sidebar: PanelLeft,
  caret: ChevronDown,
  close: X,
  check: Check,
  profile: User,
  settings: Settings,
  keyboard: Keyboard,
  book: BookOpen,
  bug: Bug,
} satisfies Record<string, LucideIcon>

/** Heavier than Lucide's 2 (Almaz, 11/06), nearer the weight of the labels beside them */
export const LIT_STROKE = 2.4

export type LitIconName = keyof typeof LIT_ICONS

export function LitIcon({ name, className }: { name: LitIconName; className?: string }) {
  const Icon = LIT_ICONS[name]
  return <Icon aria-hidden="true" strokeWidth={LIT_STROKE} className={className} />
}
