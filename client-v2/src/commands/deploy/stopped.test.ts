// A file of its own: `src/commands/` is a runtime module the UI move rule
// never touches, so its tests stay out of the modules (AGENTS.md)
import { describe, expect, it } from "vitest";

import { deployStoppedLine } from "./stopped";

describe("commands/deploy/stopped", () => {
  it("says nothing is left before the buffer exists", () => {
    expect(deployStoppedLine(null)).toBe(
      "Stopped. The program was not deployed."
    );
  });

  it("names the buffer and how to reclaim its SOL", () => {
    expect(deployStoppedLine("Buf1111")).toBe(
      "Stopped. The program was not deployed. The buffer account Buf1111 " +
        "still holds its SOL; run `solana program close --buffers` to reclaim it."
    );
  });
});
