// @vitest-environment node
// The From-seed generator fills a PDA only with the address the program
// derives: checked against Anchor's seed rule on real Anchor 1.1.2 IDLs
import BN from "bn.js";
import { describe, expect, it, vi } from "vitest";

import { readIdl } from "@/entities/idl";
import amm from "@/entities/idl/model/__fixtures__/amm_v3.json";
import generics from "@/entities/idl/model/__fixtures__/generics.json";
import idlJson from "@/entities/idl/model/__fixtures__/idl.json";
import pda from "@/entities/idl/model/__fixtures__/pda.json";
import relations from "@/entities/idl/model/__fixtures__/relations.json";
import type { IdlV1 } from "@/entities/idl";
import { generateValue } from "./generator";
import { getIdlType } from "./idl-types";
import type { Idl, IdlInstruction } from "./idl-types";
import { createGeneratableInstruction } from "./instruction";
import { PgWeb3 } from "../web3";

// These reach the whole playground; the current program is the IDL's own
const current = vi.hoisted(() => ({ pk: "" }));
vi.mock("./generators", () => ({ getPrograms: () => [] }));
vi.mock("../wallet", () => ({ PgWallet: {} }));
vi.mock("../program-info", () => ({
  PgProgramInfo: { getPkStr: () => current.pk },
}));

type RawSeed = {
  kind: "const" | "arg" | "account";
  value?: number[];
  path?: string;
  account?: string;
};
type RawAccount = {
  name: string;
  accounts?: RawAccount[];
  pda?: { seeds: RawSeed[]; program?: RawSeed };
};
type RawIx = { name: string; accounts: RawAccount[]; args: RawArg[] };
type RawArg = { name: string; type: unknown };

const FIXTURES = {
  amm,
  generics,
  idlJson,
  pda,
  relations,
} as unknown as Record<string, IdlV1>;

const SIGNED = /^i(8|16|32|64|128)$/;
const UNSIGNED = /^u(8|16|32|64|128)$/;

/** A value per argument, negative for a signed integer */
const argValue = (type: unknown): string | null => {
  if (typeof type !== "string") return null;
  if (SIGNED.test(type)) return "-7";
  if (UNSIGNED.test(type)) return "300";
  if (type === "string") return "seed-text";
  if (type === "pubkey") return PgWeb3.Keypair.generate().publicKey.toBase58();
  if (type === "bool") return "true";
  return null;
};

/** Anchor's bytes for an argument seed: little-endian, two's complement */
const argBytes = (type: string, value: string): Buffer => {
  const int = type.match(/^[iu](8|16|32|64|128)$/);
  if (int) {
    const bits = Number(int[1]);
    return new BN(value).toTwos(bits).toArrayLike(Buffer, "le", bits / 8);
  }
  if (type === "string") return Buffer.from(value);
  if (type === "pubkey") return new PgWeb3.PublicKey(value).toBuffer();
  if (type === "bool") return Buffer.from([value === "true" ? 1 : 0]);
  throw new Error(`no seed rule for ${type}`);
};

describe("utils/program-interaction seeds on Anchor 1.x IDLs", () => {
  for (const [file, raw] of Object.entries(FIXTURES)) {
    const reading = readIdl(raw);
    if (reading.kind === "refused") continue;
    const idl = reading.idl as Idl;
    const rawIxs = (raw as unknown as { instructions: RawIx[] }).instructions;

    rawIxs.forEach((rawIx, i) => {
      const ixIdl = idl.instructions[i] as IdlInstruction;
      // Composite accounts are not filled from seeds (instruction.ts)
      if (rawIx.accounts.some((a) => a.accounts)) return;
      const ix = createGeneratableInstruction(ixIdl);

      rawIx.accounts.forEach((rawAcc, j) => {
        if (!rawAcc.pda) return;
        const acc = ix.values.accounts[j];

        it(`${file} ${rawIx.name}.${rawAcc.name}`, () => {
          const fillable = rawAcc.pda!.seeds.every(
            (s) =>
              s.kind === "const" ||
              (!s.path!.includes(".") && !(s.kind === "account" && s.account))
          );
          if (!fillable) {
            // A seed reads another account's data: left to the person
            expect(acc.generator.type).not.toBe("From seed");
            return;
          }
          expect(acc.generator.type).toBe("From seed");

          const program = new PgWeb3.PublicKey(
            (raw as { address?: string }).address ??
              PgWeb3.Keypair.generate().publicKey
          );
          current.pk = program.toBase58();

          // Every account a fixed key, every argument a value
          const keys = new Map(
            rawIx.accounts.map((a) => [
              a.name,
              PgWeb3.Keypair.generate().publicKey,
            ])
          );
          const args = new Map(
            rawIx.args.map((a) => [a.name, argValue(a.type)])
          );
          // A fresh instruction per case, so these fills stay in it
          const { values } = createGeneratableInstruction(ixIdl);
          values.accounts.forEach((a, k) => {
            if (k === j) return;
            const key = keys.get(rawIx.accounts[k].name)!.toBase58();
            a.generator = { type: "Custom", value: key };
          });
          values.args.forEach((a, k) => {
            const value = args.get(rawIx.args[k].name) ?? "";
            a.generator = { type: "Custom", value };
          });

          const bytesOf = (s: RawSeed): Buffer => {
            if (s.kind === "const") return Buffer.from(s.value!);
            if (s.kind === "account") return keys.get(s.path!)!.toBuffer();
            const arg = rawIx.args.find((a) => a.name === s.path)!;
            return argBytes(arg.type as string, args.get(arg.name)!);
          };
          const seedProgram = rawAcc.pda!.program
            ? new PgWeb3.PublicKey(bytesOf(rawAcc.pda!.program))
            : program;
          const [expected] = PgWeb3.PublicKey.findProgramAddressSync(
            rawAcc.pda!.seeds.map(bytesOf),
            seedProgram
          );

          expect(generateValue(values.accounts[j].generator, values)).toBe(
            expected.toBase58()
          );
        });
      });
    });
  }

  it.each(["i16", "i32", "i64", "i128"])(
    "writes a negative %s as two's complement",
    (type) => {
      const { parse, toBuffer } = getIdlType(type as never);
      const bits = Number(type.slice(1));
      expect(toBuffer(parse("-5"))).toEqual(
        new BN(-5).toTwos(bits).toArrayLike(Buffer, "le", bits / 8)
      );
    }
  );
});
