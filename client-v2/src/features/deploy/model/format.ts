/** Lamports in one SOL */
const LAMPORTS_PER_SOL = 1_000_000_000;

/**
 * SOL with two decimals, or more when two would read as zero, so a cost
 * of 0.002 SOL never shows as "0.00".
 */
export const formatSol = (lamports: number): string => {
  const sol = lamports / LAMPORTS_PER_SOL;
  if (sol === 0 || sol >= 0.01) return sol.toFixed(2);
  return Number(sol.toPrecision(2)).toString();
};

/** An address or program id shortened in the middle: `7xKX…4fQa` */
export const shortKey = (key: string): string =>
  key.length <= 12 ? key : `${key.slice(0, 4)}…${key.slice(-4)}`;

/** The network's name in prose: "mainnet" for mainnet-beta */
export const networkName = (cluster: string | null): string =>
  cluster === "mainnet-beta" ? "mainnet" : cluster ?? "the network";

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;

/** The calendar day of `at`, for telling today and yesterday apart */
const dayOf = (at: number) => new Date(at).toDateString();

/**
 * When a build or a call happened, in a sentence or a button: "9:10 AM"
 * today, "yesterday, 9:10 AM", "Oct 29, 9:10 AM" before that
 */
export const clockTime = (at: number, now: number = Date.now()): string => {
  const date = new Date(at);
  const time = date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
  if (dayOf(at) === dayOf(now)) return time;
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  if (dayOf(at) === yesterday.toDateString()) return `yesterday, ${time}`;
  const day = date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
  return `${day}, ${time}`;
};

/**
 * How long ago, for a meta line: "just now", "12 min ago", "3 h ago";
 * `null` from a day on, where the clock time says enough
 */
export const timeAgo = (
  at: number,
  now: number = Date.now()
): string | null => {
  const ms = Math.max(0, now - at);
  if (ms < MINUTE) return "just now";
  if (ms < HOUR) return `${Math.floor(ms / MINUTE)} min ago`;
  if (ms < 24 * HOUR) return `${Math.floor(ms / HOUR)} h ago`;
  return null;
};

if (import.meta.vitest) {
  const { describe, it, expect } = import.meta.vitest;

  describe("features/deploy/model/format", () => {
    it("formatSol keeps two decimals and never rounds a small cost to zero", () => {
      expect(formatSol(1_420_000_000)).toBe("1.42");
      expect(formatSol(0)).toBe("0.00");
      expect(formatSol(2_345_000)).toBe("0.0023");
    });

    it("shortKey keeps four characters at each end", () => {
      expect(shortKey("7xKXabcdefghijklmnop4fQa")).toBe("7xKX…4fQa");
      expect(shortKey("short")).toBe("short");
    });

    it("networkName says mainnet for mainnet-beta", () => {
      expect(networkName("mainnet-beta")).toBe("mainnet");
      expect(networkName("devnet")).toBe("devnet");
      expect(networkName(null)).toBe("the network");
    });
    it("clockTime drops the leading zero and names an older day", () => {
      const now = new Date(2026, 10, 2, 15, 0).getTime();
      expect(clockTime(new Date(2026, 10, 2, 9, 10).getTime(), now)).toBe(
        "9:10 AM"
      );
      expect(clockTime(new Date(2026, 10, 1, 21, 5).getTime(), now)).toBe(
        "yesterday, 9:05 PM"
      );
      expect(clockTime(new Date(2026, 9, 29, 9, 10).getTime(), now)).toBe(
        "Oct 29, 9:10 AM"
      );
    });

    it("timeAgo counts minutes and hours, and stops at a day", () => {
      const now = 10 * 24 * 3_600_000;
      expect(timeAgo(now - 20_000, now)).toBe("just now");
      expect(timeAgo(now - 12 * 60_000, now)).toBe("12 min ago");
      expect(timeAgo(now - 3 * 3_600_000, now)).toBe("3 h ago");
      expect(timeAgo(now - 25 * 3_600_000, now)).toBeNull();
    });
  });
}
