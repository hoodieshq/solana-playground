import type { Framework } from "../../programs/project"

/* What First Light offers: the four starters, the bundled Basics, and the fake repos Import reads
   (CONSENSUS.md, sections 3.5 to 3.7 and 8) */

export type FrameworkId = Framework

export type FrameworkInfo = {
  id: FrameworkId
  name: string
  language: string
  who: string
  logo: string
  round?: boolean
  base: string
  main: string
  /** "Create Anchor project", "Create client project" */
  word: string
}

const logo = (file: string) => `${import.meta.env.BASE_URL}prototype/frameworks/${file}`

export const FRAMEWORKS: FrameworkInfo[] = [
  {
    id: "anchor",
    name: "Anchor",
    language: "Rust",
    who: "Most Solana programs start here. Less code for accounts and checks.",
    logo: logo("anchor.png"),
    base: "anchor-project",
    main: "src/lib.rs",
    word: "Anchor",
  },
  {
    id: "native",
    name: "Native",
    language: "Rust",
    who: "No framework. More code, full control. For people who know Solana.",
    logo: logo("native.png"),
    base: "native-project",
    main: "src/lib.rs",
    word: "Native",
  },
  {
    id: "seahorse",
    name: "Seahorse",
    language: "Python",
    who: "Python that compiles to Anchor. Fewer guides and examples than Anchor.",
    logo: logo("seahorse.png"),
    round: true,
    base: "seahorse-project",
    main: "src/fizzbuzz.py",
    word: "Seahorse",
  },
  {
    id: "ts-client",
    name: "TypeScript client",
    language: "TypeScript",
    who: "No program. A script that calls programs already on devnet.",
    logo: logo("typescript.svg"),
    base: "client-project",
    main: "client/client.ts",
    word: "client",
  },
]

export const frameworkOf = (id: FrameworkId) => FRAMEWORKS.find((f) => f.id === id)!

/** The five small programs bundled with the app (concept): they create offline and cost no GitHub call */
export type Basic = { slug: string; framework: FrameworkId; line: string }

export const BASICS: Basic[] = [
  { slug: "hello-solana", framework: "native", line: "Logs a message. The smallest program there is." },
  { slug: "counter", framework: "anchor", line: "Stores a number in an account and adds one to it." },
  { slug: "create-account", framework: "anchor", line: "Makes a new account owned by the program." },
  { slug: "transfer-sol", framework: "anchor", line: "Sends SOL from one account to another." },
  { slug: "favorites", framework: "anchor", line: "Saves each wallet's favorite number in its own account." },
]

/** A program found in a repo */
export type RepoProgram = { path: string; name: string; framework: FrameworkId; readme: boolean }

export const SAMPLE_REPO = "https://github.com/solana-developers/program-examples"
export const SAMPLE_LINK = `${SAMPLE_REPO}/tree/main/basics/counter/anchor`

export const SAMPLE_PROGRAMS: RepoProgram[] = [
  { path: "basics/counter/anchor", name: "counter", framework: "anchor", readme: true },
  { path: "basics/hello-solana/native", name: "hello-solana", framework: "native", readme: true },
  { path: "tokens/escrow/anchor", name: "escrow", framework: "anchor", readme: true },
]

/** The chips under Describe it: what each puts in the box */
export const DESCRIBE_CHIPS = [
  { label: "A counter", text: "A counter that anyone can increase by one and only the owner can reset." },
  { label: "A tip jar", text: "A tip jar that collects SOL and lets only the owner withdraw it." },
  { label: "A yes or no vote", text: "A vote with yes and no, where each wallet can vote once." },
]
