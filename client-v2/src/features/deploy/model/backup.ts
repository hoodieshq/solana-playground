import { createLogger } from "@/shared/lib/logger";

const log = createLogger("deploy:backup");

const KEY = "flow.backupDismissed";
// `localStorage` is near its origin budget; a few addresses are all a
// browser ever holds, and the oldest answer is the one to forget
const MAX_ADDRESSES = 20;

const read = (): string[] => {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(KEY) ?? "[]");
    return Array.isArray(parsed)
      ? parsed.filter((a): a is string => typeof a === "string")
      : [];
  } catch (e) {
    log.info("unreadable backup choices, starting empty", {
      context: { error: String(e) },
    });
    return [];
  }
};

/** Whether the backup line was answered for the wallet at `address` */
export const isBackupAnswered = (address: string): boolean =>
  read().includes(address);

/** Hide the backup line for the wallet at `address` in this browser */
export const answerBackup = (address: string): void => {
  const kept = [address, ...read().filter((a) => a !== address)].slice(
    0,
    MAX_ADDRESSES
  );
  localStorage.setItem(KEY, JSON.stringify(kept));
};

if (import.meta.vitest) {
  const { describe, it, expect, beforeEach } = import.meta.vitest;

  describe("features/deploy/model/backup", () => {
    beforeEach(() => localStorage.clear());

    it("remembers an answer per wallet address", () => {
      answerBackup("A");
      expect(isBackupAnswered("A")).toBe(true);
      expect(isBackupAnswered("B")).toBe(false);
    });

    it("forgets the oldest address past the cap", () => {
      for (let i = 0; i <= MAX_ADDRESSES; i++) answerBackup(`W${i}`);
      expect(isBackupAnswered("W0")).toBe(false);
      expect(isBackupAnswered(`W${MAX_ADDRESSES}`)).toBe(true);
    });

    it("reads corrupted storage as no answers", () => {
      localStorage.setItem(KEY, "{not json");
      expect(isBackupAnswered("A")).toBe(false);
    });
  });
}
