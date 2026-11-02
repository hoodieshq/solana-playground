/** What one Interact call came to, for the result and the history */
export interface CallOutcome {
  instruction: string;
  ok: boolean;
  /** Null when the transaction never reached the network */
  signature: string | null;
  logs: string[];
  /** The line that explains a failure, never empty then; null on success */
  failingLine: string | null;
}

/** Log lines a program writes when it fails, as Spec 03 picks them */
const FAILURE = /Error Code:|custom program error|failed:/;

/**
 * The one log line that explains a failed call: the program's own error if a
 * line names one, else the last line, else the error message.
 */
export const failingLine = (logs: string[], message?: string): string | null =>
  logs.find((l) => FAILURE.test(l)) ?? logs.at(-1) ?? message ?? null;

/** The line Anchor writes for every call, which says nothing new */
const ANNOUNCE = /^Program log: Instruction: /;

/**
 * What the program said, under the result's title: the line that explains a
 * failure, or on success the first line the program logged itself
 */
export const programMessage = (o: CallOutcome): string | null =>
  o.ok
    ? o.logs.find((l) => l.startsWith("Program log: ") && !ANNOUNCE.test(l)) ??
      null
    : o.failingLine;

if (import.meta.vitest) {
  const { describe, it, expect } = import.meta.vitest;

  describe("views/flow/stages/call-outcome", () => {
    describe("programMessage", () => {
      const called = (logs: string[]): CallOutcome => ({
        instruction: "increment",
        ok: true,
        signature: "s",
        logs,
        failingLine: null,
      });

      it("skips the instruction's announcement for the program's own line", () => {
        expect(
          programMessage(
            called([
              "Program X invoke [1]",
              "Program log: Instruction: Increment",
              "Program log: Counter is 1",
              "Program X success",
            ])
          )
        ).toBe("Program log: Counter is 1");
      });

      it("has nothing to say when the program logged nothing", () => {
        expect(programMessage(called(["Program X success"]))).toBeNull();
      });

      it("reads a failure's line", () => {
        expect(
          programMessage({
            ...called([]),
            ok: false,
            failingLine: "custom program error: 0x1",
          })
        ).toBe("custom program error: 0x1");
      });
    });

    describe("failingLine", () => {
      it("picks the line with the program's error code", () => {
        expect(
          failingLine([
            "Program X invoke [1]",
            "Program log: Instruction: Increment",
            "Program log: AnchorError caused by account: counter. Error Code: AccountNotInitialized.",
            "Program X failed: custom program error: 0xbc4",
          ])
        ).toBe(
          "Program log: AnchorError caused by account: counter. Error Code: AccountNotInitialized."
        );
      });

      it("picks a custom program error", () => {
        expect(
          failingLine(["Program X invoke [1]", "custom program error: 0x1"])
        ).toBe("custom program error: 0x1");
      });

      it("falls back to the last line", () => {
        expect(failingLine(["a", "b"], "message")).toBe("b");
      });

      it("uses the message when there are no logs", () => {
        expect(failingLine([], "Wallet not connected")).toBe(
          "Wallet not connected"
        );
      });

      it("has nothing to say with neither", () => {
        expect(failingLine([])).toBeNull();
      });
    });
  });
}
