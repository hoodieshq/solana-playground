import type { LitIconName } from "../desktop/navLit/icons"

/** Help's links out, written once: the account menu's Help fold and ⌘K both read them. Report a bug is
 * the product's GITHUB_LINKS.bug */
export const HELP_LINKS: { label: string; url: string; icon: LitIconName }[] = [
  { label: "Solana docs", url: "https://solana.com/docs", icon: "book" },
  { label: "Anchor docs", url: "https://www.anchor-lang.com/docs", icon: "book" },
  { label: "Report a bug", url: "https://github.com/solana-foundation/solana-playground/issues", icon: "bug" },
]
