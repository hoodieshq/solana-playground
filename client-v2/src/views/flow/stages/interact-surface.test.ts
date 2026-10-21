import { describe, expect, it } from "vitest";

import { interactSurface } from "./interact-surface";

const IDL = { instructions: [] };

describe("interactSurface", () => {
  it("no open project wins over everything", () => {
    expect(
      interactSurface({
        hasProject: false,
        idl: IDL,
        imported: false,
        hasProgramId: true,
        onChain: { deployed: true },
      })
    ).toBe("no-project");
  });

  it("no IDL on the project's own program asks for a build", () => {
    expect(
      interactSurface({
        hasProject: true,
        idl: null,
        imported: false,
        hasProgramId: true,
        onChain: { deployed: true },
      })
    ).toBe("not-built");
  });

  it("no IDL on an imported program asks for the IDL", () => {
    expect(
      interactSurface({
        hasProject: true,
        idl: null,
        imported: true,
        hasProgramId: true,
        onChain: { deployed: true },
      })
    ).toBe("no-idl");
  });

  it("an IDL without a program id", () => {
    expect(
      interactSurface({
        hasProject: true,
        idl: IDL,
        imported: false,
        hasProgramId: false,
        onChain: { deployed: true },
      })
    ).toBe("no-program-id");
  });

  it("an IDL with no instructions is a bad IDL", () => {
    expect(
      interactSurface({
        hasProject: true,
        idl: {},
        imported: false,
        hasProgramId: true,
        onChain: { deployed: true },
      })
    ).toBe("bad-idl");
  });

  it("a pending or failed chain read reads as unreachable", () => {
    expect(
      interactSurface({
        hasProject: true,
        idl: IDL,
        imported: false,
        hasProgramId: true,
        onChain: undefined,
      })
    ).toBe("unreachable");
  });

  it("a program not on the cluster is not deployed", () => {
    expect(
      interactSurface({
        hasProject: true,
        idl: IDL,
        imported: false,
        hasProgramId: true,
        onChain: { deployed: false },
      })
    ).toBe("not-deployed");
  });

  it("a deployed program with an IDL is ready", () => {
    expect(
      interactSurface({
        hasProject: true,
        idl: IDL,
        imported: false,
        hasProgramId: true,
        onChain: { deployed: true },
      })
    ).toBe("ready");
  });
});
