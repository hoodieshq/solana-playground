import { describe, expect, it } from "vitest";

import { interactFacts, interactSurface } from "./interact-surface";

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

  it("a chain read that has not settled yet is checking", () => {
    expect(
      interactSurface({
        hasProject: true,
        idl: IDL,
        imported: false,
        hasProgramId: true,
        onChain: undefined,
      })
    ).toBe("checking");
  });

  it("a failed chain read is unreachable", () => {
    expect(
      interactSurface({
        hasProject: true,
        idl: IDL,
        imported: false,
        hasProgramId: true,
        onChain: null,
      })
    ).toBe("unreachable");
  });

  it("instructions that are not a list make a bad IDL", () => {
    expect(
      interactSurface({
        hasProject: true,
        idl: { instructions: { initialize: {} } },
        imported: false,
        hasProgramId: true,
        onChain: { deployed: true },
      })
    ).toBe("bad-idl");
  });

  it("a missing program id is said before a bad IDL", () => {
    expect(
      interactSurface({
        hasProject: true,
        idl: {},
        imported: false,
        hasProgramId: false,
        onChain: { deployed: true },
      })
    ).toBe("no-program-id");
  });

  it("an imported program with its IDL is ready", () => {
    expect(
      interactSurface({
        hasProject: true,
        idl: IDL,
        imported: true,
        hasProgramId: true,
        onChain: { deployed: true },
      })
    ).toBe("ready");
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

describe("interactFacts", () => {
  const PK = { toBase58: () => "6PNd" };

  it("a temporary explorer counts as a project", () => {
    expect(
      interactFacts(
        { isTemporary: true, currentWorkspaceName: null },
        {
          idl: null,
          importedProgram: null,
          uuid: null,
          pk: null,
          onChain: undefined,
        }
      ).hasProject
    ).toBe(true);
  });

  it("no workspace and no temporary explorer is no project", () => {
    expect(
      interactFacts(
        { isTemporary: false, currentWorkspaceName: null },
        {
          idl: null,
          importedProgram: null,
          uuid: null,
          pk: null,
          onChain: undefined,
        }
      ).hasProject
    ).toBe(false);
  });

  it("a program uploaded by uuid counts as imported", () => {
    expect(
      interactFacts(
        { isTemporary: false, currentWorkspaceName: "p" },
        { idl: null, importedProgram: null, uuid: "u-1", pk: PK, onChain: null }
      )
    ).toEqual({
      hasProject: true,
      idl: null,
      imported: true,
      hasProgramId: true,
      onChain: null,
    });
  });

  it("an imported program counts as imported", () => {
    expect(
      interactFacts(
        { isTemporary: false, currentWorkspaceName: "p" },
        {
          idl: null,
          importedProgram: { buffer: [] },
          uuid: null,
          pk: null,
          onChain: undefined,
        }
      ).imported
    ).toBe(true);
  });
});
