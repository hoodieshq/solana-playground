import { straightQuotes, uncomment } from "./check"
import { PROGRAM_ID } from "./data"

export type IdlArg = { name: string; type: string }
export type Idl = {
  address: string
  metadata: { name: string; version: string; spec: string; description: string }
  instructions: { name: string; discriminator: number[]; accounts: never[]; args: IdlArg[] }[]
}

// What Anchor writes as hello's discriminator: the first 8 bytes of sha256("global:hello"). Fixed
// here, since the prototype has no build to work it out
const HELLO_DISCRIMINATOR = [149, 118, 59, 220, 196, 127, 161, 179]

// Rust's own names for the types an argument can take here, as the IDL spells them
const TYPES: Record<string, string> = { String: "string", bool: "bool", u8: "u8", u16: "u16", u32: "u32", u64: "u64", i64: "i64", Pubkey: "pubkey" }

/** The IDL the build of `lib` writes: hello and its arguments, read off `pub fn hello(` the way the
 * build would, comments aside. The Call panel is drawn from it, so it reads what was deployed, never
 * the file being typed */
export function idlOf(lib: string): Idl {
  const sig = uncomment(straightQuotes(lib)).match(/pub\s+fn\s+hello\s*\(([^)]*)\)/)?.[1] ?? ""
  const args = sig
    .split(",")
    .map((p) => p.trim())
    .filter((p) => p && !/Context\s*</.test(p))
    .map((p) => {
      const [name, type] = p.split(":").map((x) => x.trim())
      return { name, type: TYPES[type] ?? type?.toLowerCase() ?? "string" }
    })
    .filter((a) => a.name)
  return {
    address: PROGRAM_ID,
    metadata: { name: "hello_anchor", version: "0.1.0", spec: "0.1.0", description: "Created with Anchor" },
    instructions: [{ name: "hello", discriminator: HELLO_DISCRIMINATOR, accounts: [], args }],
  }
}

/** hello's arguments in the program as deployed, or none before any deploy */
export const deployedArgs = (deployed: string | null): IdlArg[] => (deployed === null ? [] : idlOf(deployed).instructions[0].args)

/** The signature as the form's head and the result meta write it: `hello(name: string)` */
export const signature = (args: IdlArg[]) => `(${args.map((a) => `${a.name}: ${a.type}`).join(", ")})`
