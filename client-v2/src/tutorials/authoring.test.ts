import { readFileSync } from "fs";
import { join } from "path";
import { describe, expect, it } from "vitest";

import {
  checkDefinition,
  formatError,
  slugOf,
} from "@/entities/tutorial/model/definition/check";
import type { Beat, TutorialDefinition } from "@/entities/tutorial";
import hello from "./hello-anchor/tutorial.json";

/**
 * `AUTHORING.md` is handed to an LLM with the schema and nothing else, so its
 * examples are the format as far as the author's agent knows. These tests
 * keep them true: a beat example is a beat of Hello Anchor, the worked
 * example passes the check, and the errors it explains are printed as the
 * check prints them.
 */

const AUTHORING = readFileSync(join(__dirname, "AUTHORING.md"), "utf8");

/** The fenced blocks whose info string is `json <tag>`, parsed */
const blocks = (tag: string): unknown[] =>
  [
    ...AUTHORING.matchAll(
      new RegExp("^```json " + tag + "\\n([\\s\\S]*?)^```$", "gm")
    ),
  ].map((m) => JSON.parse(m[1]));

const helloBeats = new Map<string, Beat>(
  (hello as unknown as TutorialDefinition).steps
    .flatMap((s) => [...s.beats, ...(s.onFail ?? [])])
    .map((b) => [b.id, b])
);

describe("tutorials/AUTHORING.md", () => {
  it("every beat example is a beat of Hello Anchor", () => {
    const beats = blocks("beat") as Beat[];
    expect(new Set(beats.map((b) => b.kind))).toEqual(
      new Set(["say", "write", "ask", "act"])
    );
    for (const beat of beats) {
      expect(beat, `beat ${beat.id}`).toEqual(helloBeats.get(beat.id));
    }
  });

  it("the worked example is a two-step definition the check accepts", () => {
    const [example, ...more] = blocks("tutorial") as TutorialDefinition[];
    expect(more).toEqual([]);
    expect(example.steps).toHaveLength(2);
    expect(
      checkDefinition(example, new Set(), {
        slug: slugOf(example.name),
        docs: {},
      }).map(formatError)
    ).toEqual([]);
  });

  it("explains the missing reason exactly as the check prints it", () => {
    expect(AUTHORING).toContain(
      "steps[1].beats[3].why[2]: a wrong option needs a reason, found null"
    );
  });

  it("every error it quotes has the check's shape: path, expected, found", () => {
    const section = AUTHORING.split(/^## /m).find((s) =>
      s.startsWith("Reading the check's errors")
    );
    expect(section).toBeDefined();
    const quoted = [...section!.matchAll(/^- `([^`]+: [^`]+)`/gm)].map(
      (m) => m[1]
    );
    expect(quoted.length).toBeGreaterThan(5);
    for (const line of quoted) {
      expect(line).toMatch(/^[\w[\]."()-]+: .+, found .+$/);
    }
  });
});
