/** The product's program gallery, client-v2/static/programs/programs.json on scope/interface-2. The
 * icons are the two GitHub avatars it links, saved under public/prototype/programs */
export type Program = { name: string; description: string; framework: string; categories: string[]; icon: string }

const SPL = "spl.png"

export const PROGRAMS: Program[] = [
  {
    name: "spl-binary-option",
    framework: "Native",
    categories: ["DeFi", "SPL", "Trading"],
    icon: SPL,
    description: "A primitive binary option: two parties take the long and the short side of an event, each paying in tokens that the winner collects.",
  },
  {
    name: "spl-binary-oracle-pair",
    framework: "Native",
    categories: ["DeFi", "SPL"],
    icon: SPL,
    description: "Mints a pass token and a fail token for every deposit; after the decision window, an oracle picks which one redeems.",
  },
  {
    name: "spl-feature-proposal",
    framework: "Native",
    categories: ["Governance", "SPL"],
    icon: SPL,
    description: "Proposes a new cluster feature and mints tokens for the participants; once enough of them vote, the feature activates.",
  },
  { name: "spl-memo", framework: "Native", categories: ["SPL"], icon: SPL, description: "A simple program that validates a string of UTF-8 encoded characters and logs it in the transaction log." },
  {
    name: "spl-name-service",
    framework: "Native",
    categories: ["SPL"],
    icon: SPL,
    description: "A spl program for issuing and managing ownership of: domain names, Solana Pubkeys, URLs, twitter handles and more.",
  },
  { name: "spl-noop", framework: "Native", categories: ["SPL"], icon: SPL, description: "Does nothing." },
  { name: "spl-record", framework: "Native", categories: ["SPL"], icon: SPL, description: "Stores arbitrary data in an account that only its authority can write, update or close." },
  {
    name: "spl-shared-memory",
    framework: "Native",
    categories: ["SPL"],
    icon: SPL,
    description: "Lets a program called through a cross-program invocation hand data back to its caller, by writing it into a shared account.",
  },
  {
    name: "spl-stake-pool",
    framework: "Native",
    categories: ["SPL", "Staking"],
    icon: SPL,
    description: "A program for pooling together SOL to be staked by an off-chain agent running a Delegation Bot.",
  },
  {
    name: "spl-stateless-asks",
    framework: "Native",
    categories: ["SPL", "Token", "Trading"],
    icon: SPL,
    description: "Swaps one token for another with no escrow account: the maker approves a program-derived address to move the tokens.",
  },
  {
    name: "token-vesting",
    framework: "Native",
    categories: ["Token"],
    icon: "bonfida.jpg",
    description: "Bonfida's token vesting: locks tokens under a schedule and releases each portion to the recipient when it comes due.",
  },
]

export const programIcon = (p: Program) => `${import.meta.env.BASE_URL}prototype/programs/${p.icon}`

/** The eyebrow the product writes: the framework, then the first category that isn't SPL itself */
export const programTags = (p: Program) => [p.framework, p.categories.find((c) => c !== "SPL") ?? p.categories[0]].join(" · ")

export function filterPrograms(query: string) {
  const q = query.trim().toLowerCase()
  if (!q) return PROGRAMS
  return PROGRAMS.filter((p) => [p.name, p.description, p.framework, ...p.categories].some((f) => f.toLowerCase().includes(q)))
}
