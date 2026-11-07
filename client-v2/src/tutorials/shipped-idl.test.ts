import { existsSync, readdirSync, readFileSync } from "fs";
import { join } from "path";
import { describe, expect, it } from "vitest";

import type { TutorialDefinition } from "@/entities/tutorial";

/**
 * A step's `idl` is generated from its target program (`yarn tutorial:idl`),
 * and nothing else regenerates it: a program edited without it would ship an
 * IDL the Call panel calls with and the program refuses. These tests read the
 * program's `#[program]` module and hold every step's IDL to it, without Rust.
 */

const PROGRAM_FILE = "src/lib.rs";

interface Shape {
  /** Instruction name to its argument names, in order */
  [instruction: string]: string[];
}

/** The `pub fn`s of the `#[program]` module and their arguments after `ctx` */
const shapeOfSource = (source: string): Shape => {
  const at = source.indexOf("#[program]");
  if (at === -1) return {};
  const shape: Shape = {};
  const fns = source
    .slice(at)
    .matchAll(/pub fn (\w+)\s*(?:<[^>]*>)?\s*\(([^)]*)\)/g);
  for (const [, name, params] of fns) {
    shape[name] = params
      .split(",")
      .map((p) => p.trim())
      .filter(Boolean)
      .slice(1)
      .map((p) => p.split(":")[0].trim().replace(/^_/, ""));
  }
  return shape;
};

const shapeOfIdl = (idl: string): Shape => {
  const { instructions } = JSON.parse(idl) as {
    instructions: { name: string; args: { name: string }[] }[];
  };
  return Object.fromEntries(
    instructions.map((ix) => [ix.name, ix.args.map((a) => a.name)])
  );
};

const tutorials = readdirSync(__dirname, { withFileTypes: true })
  .filter((e) => e.isDirectory() && !e.name.startsWith("__"))
  .map((e) => join(__dirname, e.name, "tutorial.json"))
  .filter(existsSync)
  .map((path) => JSON.parse(readFileSync(path, "utf8")) as TutorialDefinition)
  .filter((d) => d.framework === "Anchor");

describe("tutorials: shipped IDLs", () => {
  it("covers the Breakpoint tutorials", () => {
    expect(tutorials.map((d) => d.name)).toEqual(
      expect.arrayContaining(["Hello Anchor", "Zero Copy"])
    );
  });

  describe.each(tutorials.map((d) => [d.name, d] as const))(
    "%s",
    (_name, d) => {
      it("ships an IDL from its first step with a program", () => {
        const first = d.steps.find((s) => s.target[PROGRAM_FILE]);
        expect(first?.idl).toBeDefined();
      });

      it.each(d.steps.map((s, i) => [s.id, i] as const))(
        "step %s calls the program its target holds",
        (_id, i) => {
          const source =
            d.steps[i].target[PROGRAM_FILE] ?? d.steps[i].start[PROGRAM_FILE];
          if (!source) return;
          const idl = d.steps
            .slice(0, i + 1)
            .reverse()
            .find((s) => s.idl !== undefined)?.idl;
          expect(idl, "no IDL holds at this step").toBeDefined();
          expect(shapeOfIdl(idl as string)).toEqual(shapeOfSource(source));
        }
      );
    }
  );
});
