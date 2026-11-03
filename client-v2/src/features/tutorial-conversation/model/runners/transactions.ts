import type {
  Called,
  Receipt,
  ReceiptAccount,
  Refusal,
  RunResult,
} from "../progress";

/**
 * One transaction a run or call sent, as the chain answered it: landed
 * (confirmed, with or without an error), or refused before it landed (the
 * preflight's simulation failed, or the send threw).
 */
export type SentTx =
  | {
      kind: "landed";
      signature: string;
      log: string[];
      /** The transaction's error, or null when it succeeded */
      err: unknown;
      computeUnits: number | null;
      fee: number;
      signer: string | null;
      /** The instructions it sent to the tutorial's program, decoded */
      calls: DecodedCall[];
    }
  | {
      kind: "refused";
      /** The simulation's log, empty when the send failed before it */
      log: string[];
      message: string;
      calls: DecodedCall[];
    };

/** An instruction to the tutorial's program, as the deployed IDL decodes it */
export interface DecodedCall extends Called {
  accounts: ReceiptAccount[];
}

/** Anchor logs the instruction's name first, in the program's own frame */
const INSTRUCTION = /^Program log: Instruction: (\w+)/;
/** `AnchorError thrown in ...` or `AnchorError occurred.` */
const ANCHOR_ERROR =
  /AnchorError.*Error Code: (\w+)\. Error Number: (\d+)\.(?: Error Message: (.*?)\.?$)?/;
const CUSTOM_ERROR = /custom program error: 0x([0-9a-f]+)/i;
const INVOKE = /^Program (\w+) invoke \[\d+\]$/;
const EXIT = /^Program (\w+) (success|failed)/;

/**
 * The `Program log:` lines the tutorial's program wrote itself, in order:
 * not a program it invoked, and not Anchor's `Instruction:` line
 */
export const programLines = (log: string[], programId: string): string[] => {
  const stack: string[] = [];
  const out: string[] = [];
  for (const line of log) {
    const invoke = INVOKE.exec(line);
    if (invoke) {
      stack.push(invoke[1]);
      continue;
    }
    if (EXIT.test(line)) {
      stack.pop();
      continue;
    }
    if (
      stack[stack.length - 1] === programId &&
      line.startsWith("Program log: ") &&
      !INSTRUCTION.test(line)
    ) {
      out.push(line);
    }
  }
  return out;
};

/** Unanchored and case-blind, as the goal's judge reads a pattern */
const matcher = (pattern: string | undefined): ((line: string) => boolean) => {
  if (pattern === undefined) return () => true;
  try {
    const re = new RegExp(pattern, "i");
    return (line) => re.test(line);
  } catch {
    // The judge reports a broken pattern; the card still shows a line
    return () => true;
  }
};

/**
 * The card's large line: the first line of the program's own log the step's
 * pattern matches, over every transaction in order; with no match, the
 * program's first line, so the card shows what came back even when the goal
 * does not pass. Null when the program logged nothing.
 */
export const pickLine = (
  logs: string[][],
  programId: string,
  pattern: string | undefined
): string | null => {
  const lines = logs.flatMap((log) => programLines(log, programId));
  const matches = matcher(pattern);
  return lines.find(matches) ?? lines[0] ?? null;
};

/** The error an Anchor program logged, with its message when it gave one */
const anchorError = (log: string[]) => {
  for (const line of log) {
    const m = ANCHOR_ERROR.exec(line);
    if (m) {
      return { name: m[1], code: Number(m[2]), message: m[3] ?? null };
    }
  }
  return null;
};

/** Whether the tutorial's program ran at all in this log */
const reached = (log: string[], programId: string) =>
  log.some((line) => line === `Program ${programId} invoke [1]`);

/**
 * What the program refused: the instruction (decoded, else from Anchor's
 * `Instruction:` line) and the error (Anchor's, else the custom code the
 * runtime names). Undefined when the transaction never reached the program,
 * so a `refused` goal cannot pass on a send that failed elsewhere.
 */
export const refusalOf = (
  log: string[],
  programId: string,
  calls: DecodedCall[]
): Refusal | undefined => {
  if (!reached(log, programId)) return undefined;
  const named = log.map((l) => INSTRUCTION.exec(l)?.[1]).find(Boolean);
  const instruction = calls[0]?.instruction ?? named;
  if (!instruction) return undefined;
  const anchor = anchorError(log);
  if (anchor) {
    return { instruction, error: { code: anchor.code, name: anchor.name } };
  }
  const custom = log.map((l) => CUSTOM_ERROR.exec(l)?.[1]).find(Boolean);
  return {
    instruction,
    error: custom ? { code: parseInt(custom, 16), name: null } : null,
  };
};

/** A failure in a sentence: Anchor's message, else the chain's first line */
const reasonOf = (tx: SentTx): string => {
  const anchor = anchorError(tx.log);
  if (anchor?.message) return anchor.message;
  if (anchor) return anchor.name;
  if (tx.kind === "refused") return tx.message.split("\n")[0];
  return `The transaction failed: ${JSON.stringify(tx.err)}`;
};

const failed = (tx: SentTx): boolean =>
  tx.kind === "refused" || tx.err !== null;

/**
 * One result from every transaction a run or call sent, at least one. Any failure fails
 * the run, with the first failure's reason, log and refusal; otherwise the
 * run landed, with every signature, the picked line, every call to the
 * program, and the last transaction's receipt.
 */
export const resultOf = ({
  act,
  sent,
  programId,
  pattern,
  seconds,
}: {
  act: "run" | "call";
  sent: SentTx[];
  programId: string;
  pattern: string | undefined;
  seconds: number;
}): Extract<RunResult, { act: "run" | "call" }> => {
  const failure = sent.find(failed);
  if (failure) {
    const refused = refusalOf(failure.log, programId, failure.calls);
    return {
      act,
      ok: false,
      seconds,
      message: reasonOf(failure),
      log: failure.log.join("\n"),
      ...(refused ? { refused } : {}),
    };
  }
  const landed = sent.filter(
    (tx): tx is Extract<SentTx, { kind: "landed" }> => tx.kind === "landed"
  );
  // `sent` holds a transaction, and with no failure every one landed
  const last = landed[landed.length - 1];
  return {
    act,
    ok: true,
    seconds,
    signatures: landed.map((tx) => tx.signature),
    line: pickLine(
      landed.map((tx) => tx.log),
      programId,
      pattern
    ),
    called: landed.flatMap((tx) =>
      tx.calls.map(({ instruction, args }) => ({ instruction, args }))
    ),
    receipt: receiptOf(last, programId),
  };
};

/** The rows the result card and the finish card's receipt draw */
const receiptOf = (
  tx: Extract<SentTx, { kind: "landed" }>,
  programId: string
): Receipt => {
  const receipt: Receipt = { fee: tx.fee, log: tx.log };
  if (tx.signer) receipt.signer = tx.signer;
  if (tx.computeUnits !== null) receipt.computeUnits = tx.computeUnits;
  receipt.accounts = [
    { name: "program", address: programId },
    ...tx.calls.flatMap((c) => c.accounts),
  ];
  return receipt;
};

if (import.meta.vitest) {
  const { describe, it, expect } = import.meta.vitest;

  describe("features/tutorial-conversation/model/runners/transactions", () => {
    const PROGRAM = "He11o1111111111111111111111111111111111111";
    const WALLET = "Wa11et1111111111111111111111111111111111111";

    /** Hello Anchor's step 3, as devnet logged it */
    const HELLO_LOG = [
      `Program ${PROGRAM} invoke [1]`,
      "Program log: Instruction: Hello",
      "Program log: Hello, World!",
      `Program ${PROGRAM} consumed 389 of 200000 compute units`,
      `Program ${PROGRAM} success`,
    ];

    /** Lumberjack's chop with no energy left, as Anchor 0.29 logs it */
    const CHOP_LOG = [
      `Program ${PROGRAM} invoke [1]`,
      "Program log: Instruction: ChopTree",
      "Program log: AnchorError thrown in programs/lumberjack/src/lib.rs:31:9. Error Code: NotEnoughEnergy. Error Number: 6000. Error Message: Not enough energy.",
      `Program ${PROGRAM} consumed 4210 of 200000 compute units`,
      `Program ${PROGRAM} failed: custom program error: 0x1770`,
    ];

    const hello = (args: Record<string, string> = {}): DecodedCall => ({
      instruction: "hello",
      args,
      accounts: [],
    });

    const landed = (
      log: string[],
      calls: DecodedCall[] = [hello()],
      err: unknown = null
    ): SentTx => ({
      kind: "landed",
      signature: `sig${log.length}`,
      log,
      err,
      computeUnits: 389,
      fee: 5000,
      signer: WALLET,
      calls,
    });

    describe("pickLine", () => {
      it("picks the program's own line the pattern matches", () => {
        expect(pickLine([HELLO_LOG], PROGRAM, "Hello, World!")).toBe(
          "Program log: Hello, World!"
        );
      });

      it("skips Anchor's Instruction line and a program it invoked", () => {
        const log = [
          `Program ${PROGRAM} invoke [1]`,
          "Program log: Instruction: Hello",
          "Program 11111111111111111111111111111111 invoke [2]",
          "Program log: from the system program",
          "Program 11111111111111111111111111111111 success",
          "Program log: Hello, Alex!",
          `Program ${PROGRAM} success`,
        ];
        expect(pickLine([log], PROGRAM, undefined)).toBe(
          "Program log: Hello, Alex!"
        );
      });

      it("finds the match in a later transaction, else shows the first line", () => {
        const other = [
          `Program ${PROGRAM} invoke [1]`,
          "Program log: Setting up",
          `Program ${PROGRAM} success`,
        ];
        expect(pickLine([other, HELLO_LOG], PROGRAM, "hello, world")).toBe(
          "Program log: Hello, World!"
        );
        expect(pickLine([other, HELLO_LOG], PROGRAM, "Goodbye")).toBe(
          "Program log: Setting up"
        );
      });

      it("answers null when the program logged nothing, and survives a broken pattern", () => {
        expect(pickLine([[]], PROGRAM, "x")).toBeNull();
        expect(pickLine([HELLO_LOG], PROGRAM, "(")).toBe(
          "Program log: Hello, World!"
        );
      });
    });

    describe("refusalOf", () => {
      it("reads Anchor's error and the decoded instruction", () => {
        expect(
          refusalOf(CHOP_LOG, PROGRAM, [
            { instruction: "chop_tree", args: {}, accounts: [] },
          ])
        ).toEqual({
          instruction: "chop_tree",
          error: { code: 6000, name: "NotEnoughEnergy" },
        });
      });

      it("falls back to the Instruction line and the runtime's custom code", () => {
        const log = [
          `Program ${PROGRAM} invoke [1]`,
          "Program log: Instruction: ChopTree",
          `Program ${PROGRAM} failed: custom program error: 0x1771`,
        ];
        expect(refusalOf(log, PROGRAM, [])).toEqual({
          instruction: "ChopTree",
          error: { code: 6001, name: null },
        });
      });

      it("names no error for a panic, and no refusal when the program never ran", () => {
        const panic = [
          `Program ${PROGRAM} invoke [1]`,
          "Program log: Instruction: Grow",
          `Program ${PROGRAM} failed: SBF program panicked`,
        ];
        expect(refusalOf(panic, PROGRAM, [])).toEqual({
          instruction: "Grow",
          error: null,
        });
        expect(refusalOf([], PROGRAM, [hello()])).toBeUndefined();
      });
    });

    describe("resultOf", () => {
      /** `resultOf` for Hello Anchor's step 3, over what was sent */
      const resultFor = (sent: SentTx[], act: "run" | "call" = "run") =>
        resultOf({
          act,
          sent,
          programId: PROGRAM,
          pattern: "Hello, World!",
          seconds: 3,
        });

      it("a landed run: signatures, the picked line, the calls and the last receipt", () => {
        expect(resultFor([landed(HELLO_LOG)])).toEqual({
          act: "run",
          ok: true,
          seconds: 3,
          signatures: ["sig5"],
          line: "Program log: Hello, World!",
          called: [{ instruction: "hello", args: {} }],
          receipt: {
            fee: 5000,
            signer: WALLET,
            computeUnits: 389,
            log: HELLO_LOG,
            accounts: [{ name: "program", address: PROGRAM }],
          },
        });
      });

      it("a refused preflight fails with Anchor's message, its log and the refusal", () => {
        const sent: SentTx[] = [
          {
            kind: "refused",
            log: CHOP_LOG,
            message: "Simulation failed.\nMessage: ...",
            calls: [{ instruction: "chop_tree", args: {}, accounts: [] }],
          },
        ];
        expect(resultFor(sent, "call")).toEqual({
          act: "call",
          ok: false,
          seconds: 3,
          message: "Not enough energy",
          log: CHOP_LOG.join("\n"),
          refused: {
            instruction: "chop_tree",
            error: { code: 6000, name: "NotEnoughEnergy" },
          },
        });
      });

      it("a landed transaction with an error fails, even after one that succeeded", () => {
        const result = resultFor([
          landed(HELLO_LOG),
          landed(CHOP_LOG, [], { InstructionError: [0, { Custom: 6000 }] }),
        ]);
        expect(result).toMatchObject({
          ok: false,
          message: "Not enough energy",
        });
      });

      it("a send that failed before the chain carries its first line and no refusal", () => {
        const result = resultFor([
          {
            kind: "refused",
            log: [],
            message: "failed to send transaction: blockhash not found\nmore",
            calls: [hello()],
          },
        ]);
        expect(result).toEqual({
          act: "run",
          ok: false,
          seconds: 3,
          message: "failed to send transaction: blockhash not found",
          log: "",
        });
      });
    });
  });
}
