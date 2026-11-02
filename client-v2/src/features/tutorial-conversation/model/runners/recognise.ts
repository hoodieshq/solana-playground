import type { RunResult } from "../progress";

/** One signature that touched the program, newest first, as the RPC lists it */
export interface ProgramSignature {
  signature: string;
  /** Unix seconds; null when the RPC does not know it */
  blockTime: number | null;
  failed: boolean;
}

export interface RecogniseInput {
  act: "deploy" | "buildDeploy";
  programId: string | null;
  /** When the interrupted run started, in ms */
  startedAt: number;
  /** The program's two newest signatures */
  signatures(programId: string): Promise<ProgramSignature[]>;
  instructions: string[];
}

/**
 * A deploy a reload interrupted, recognised from the chain: the program's
 * newest transaction landed at or after the run started, so that run put it
 * there. Its result then posts instead of the interrupted card, and Deploy is
 * not pressed again for nothing. An older transaction before it means the
 * program was already on chain: an upgrade. The cost is not known (null).
 */
export const recogniseDeploy = async (
  input: RecogniseInput
): Promise<RunResult | null> => {
  if (!input.programId) return null;
  const [newest, older] = await input.signatures(input.programId);
  if (!newest || newest.failed || newest.blockTime === null) return null;
  if (newest.blockTime * 1000 < input.startedAt) return null;
  return {
    act: input.act,
    ok: true,
    seconds: Math.max(0, newest.blockTime - input.startedAt / 1000),
    programId: input.programId,
    signature: newest.signature,
    upgraded: !!older,
    lamports: null,
    instructions: input.instructions,
  };
};

if (import.meta.vitest) {
  const { describe, it, expect } = import.meta.vitest;

  describe("features/tutorial-conversation/model/runners/recognise", () => {
    const PROGRAM = "Prog111111111111111111111111111111111111111";
    const STARTED = 1_700_000_000_000;
    const input = (
      signatures: ProgramSignature[],
      programId: string | null = PROGRAM
    ) => ({
      act: "deploy" as const,
      programId,
      startedAt: STARTED,
      signatures: async () => signatures,
      instructions: ["hello"],
    });
    const at = (seconds: number, signature = "sig", failed = false) => ({
      signature,
      blockTime: STARTED / 1000 + seconds,
      failed,
    });

    it("recognises a first deploy that landed after the run started", async () => {
      await expect(
        recogniseDeploy(input([at(12, "deploySig")]))
      ).resolves.toEqual({
        act: "deploy",
        ok: true,
        seconds: 12,
        programId: PROGRAM,
        signature: "deploySig",
        upgraded: false,
        lamports: null,
        instructions: ["hello"],
      });
    });

    it("reads an older transaction as an upgrade", async () => {
      await expect(
        recogniseDeploy(input([at(12, "upSig"), at(-600, "firstSig")]))
      ).resolves.toMatchObject({ signature: "upSig", upgraded: true });
    });

    it("leaves a deploy that landed before the run started alone", async () => {
      await expect(recogniseDeploy(input([at(-5)]))).resolves.toBeNull();
    });

    it("leaves a program with no transaction, a failed one, or no id alone", async () => {
      await expect(recogniseDeploy(input([]))).resolves.toBeNull();
      await expect(
        recogniseDeploy(input([at(3, "sig", true)]))
      ).resolves.toBeNull();
      await expect(recogniseDeploy(input([at(3)], null))).resolves.toBeNull();
    });
  });
}
