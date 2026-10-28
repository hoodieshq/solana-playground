import { straightQuotes, uncomment } from "./check"
import { LESSON, PROGRAM_ID } from "./data"

export type IdlArg = { name: string; type: string }
export type IdlIx = { name: string; discriminator: number[]; accounts: never[]; args: IdlArg[] }
export type Idl = {
  address: string
  metadata: { name: string; version: string; spec: string; description: string }
  instructions: IdlIx[]
}

// What Anchor writes as an instruction's discriminator: the first 8 bytes of sha256("global:<name>").
// Fixed here, since the prototype has no build to work them out
const DISCRIMINATORS: Record<string, number[]> = {
  hello: [149, 118, 59, 220, 196, 127, 161, 179],
  init_player: [114, 27, 219, 144, 50, 15, 228, 66],
  chop_tree: [120, 56, 196, 91, 213, 182, 36, 28],
}

// Rust's own names for the types an argument can take here, as the IDL spells them
const TYPES: Record<string, string> = { String: "string", bool: "bool", u8: "u8", u16: "u16", u32: "u32", u64: "u64", i64: "i64", Pubkey: "pubkey" }

/** The IDL the build of `lib` writes: every `pub fn` of the `#[program]` module and its arguments,
 * read off the file the way the build would, comments aside. The Call panel is drawn from it, so it
 * reads what was deployed, never the file being typed */
export function idlOf(lib: string): Idl {
  const code = uncomment(straightQuotes(lib))
  // The module runs from `#[program]` to the first item after it that sits at the left edge
  const from = code.indexOf("#[program]")
  const body = from === -1 ? code : code.slice(from, from + Math.max(0, code.slice(from).search(/\n\}/)) + 2)
  const instructions = [...body.matchAll(/pub\s+fn\s+(\w+)\s*\(([^)]*)\)/g)].map(([, name, sig]) => ({
    name,
    discriminator: DISCRIMINATORS[name] ?? [0, 0, 0, 0, 0, 0, 0, 0],
    accounts: [] as never[],
    args: sig
      .split(",")
      .map((p) => p.trim())
      .filter((p) => p && !/Context\s*</.test(p))
      .map((p) => {
        const [name, type] = p.split(":").map((x) => x.trim())
        return { name, type: TYPES[type] ?? type?.toLowerCase() ?? "string" }
      })
      .filter((a) => a.name),
  }))
  return {
    address: PROGRAM_ID,
    metadata: { name: LESSON.program, version: "0.1.0", spec: "0.1.0", description: "Created with Anchor" },
    instructions: instructions.length ? instructions : [{ name: "hello", discriminator: DISCRIMINATORS.hello, accounts: [], args: [] }],
  }
}

/** The first instruction's arguments in the program as deployed, or none before any deploy */
export const deployedArgs = (deployed: string | null): IdlArg[] => (deployed === null ? [] : idlOf(deployed).instructions[0].args)

/** The signature as the form's head and the result meta write it: `hello(name: string)` */
export const signature = (args: IdlArg[]) => `(${args.map((a) => `${a.name}: ${a.type}`).join(", ")})`

/** An instruction as a list names it: `hello`, or `hello(name: string)` once it takes one */
const named = (ix: IdlIx) => `${ix.name}${ix.args.length ? signature(ix.args) : ""}`

/** What a build says about the IDL it wrote: `IDL: 2 instructions · init_player, chop_tree` */
export function idlLine(lib: string) {
  const ixs = idlOf(lib).instructions
  return `IDL: ${ixs.length} instruction${ixs.length === 1 ? "" : "s"} · ${ixs.map(named).join(", ")}`
}

/** The IDL's calls in one string, to tell whether a deploy changed what clients can call */
export const idlShape = (lib: string | null) => (lib === null ? "" : idlOf(lib).instructions.map(named).join(", "))
