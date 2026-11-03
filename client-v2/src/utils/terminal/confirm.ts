/**
 * The end of a yes or no question: the default in capitals, so Enter alone
 * says what it takes (Spec 13, "Wallet and sign-in").
 *
 * @param defaultValue the question's default, `"yes"` or `"no"`, if any
 * @returns `[Y/n]`, `[y/N]` or `[y/n]`
 */
export const confirmSuffix = (defaultValue?: string) => {
  if (defaultValue === "yes") return "[Y/n]";
  if (defaultValue === "no") return "[y/N]";
  return "[y/n]";
};

const ANSWERS: Record<string, "yes" | "no"> = {
  y: "yes",
  yes: "yes",
  n: "no",
  no: "no",
};

/**
 * Read an answer to a yes or no question in any case and either length.
 *
 * @param input what the person typed
 * @returns `"yes"` or `"no"`, or the input in lower case when it is neither
 */
export const confirmAnswer = (input: string) => {
  const lower = input.trim().toLowerCase();
  return ANSWERS[lower] ?? lower;
};

if (import.meta.vitest) {
  const { describe, it, expect } = import.meta.vitest;

  describe("utils/terminal/confirm", () => {
    it("shows a yes default in capitals", () => {
      expect(confirmSuffix("yes")).toBe("[Y/n]");
    });

    it("shows a no default in capitals", () => {
      expect(confirmSuffix("no")).toBe("[y/N]");
    });

    it("shows no capital without a default", () => {
      expect(confirmSuffix()).toBe("[y/n]");
    });

    it.each([
      ["y", "yes"],
      ["Y", "yes"],
      ["YES", "yes"],
      ["n", "no"],
      ["No", "no"],
    ])("reads %s as %s", (input, answer) => {
      expect(confirmAnswer(input)).toBe(answer);
    });

    it("leaves any other answer for the validator to refuse", () => {
      expect(confirmAnswer("Maybe")).toBe("maybe");
    });
  });
}
