import { describe, expect, it } from "vitest";

import { fitBuffersTable, stripAnsi } from "./buffers-table";

const ADDRESS = "7Kp4X1bQmS9yWn3VhJd2RcLzT8uFgE5aNqB6oYiP4sMx";
const AUTHORITY = "9fHcE2tWq7LmZx4KvR1sNbD8yPjU3gAoT6iQ5eYwC2nB";

/** What solana-cli prints for `solana program show --buffers`, header bold */
const table = (rows: string[][]) => {
  const header = `${"Buffer Address".padEnd(44)} | ${"Authority".padEnd(
    44
  )} | Balance`;
  const lines = rows.map(
    ([address, authority, balance]) =>
      `${address.padEnd(44)} | ${authority.padEnd(44)} | ${balance}`
  );
  return ["", `\u001b[1m${header}\u001b[0m`].concat(lines, "").join("\n");
};

describe("fitBuffersTable", () => {
  it("keeps the table when its rows fit the terminal", () => {
    const output = table([[ADDRESS, AUTHORITY, "1.2345 SOL"]]);

    expect(fitBuffersTable(output, 200)).toBe(output);
  });

  it("lays each buffer out as labelled lines when the rows would wrap", () => {
    const output = table([
      [ADDRESS, AUTHORITY, "1.2345 SOL"],
      [AUTHORITY, ADDRESS, "0.5 SOL"],
    ]);

    const fitted = stripAnsi(fitBuffersTable(output, 100));

    expect(fitted).toBe(
      [
        "",
        `Buffer Address  ${ADDRESS}`,
        `Authority       ${AUTHORITY}`,
        "Balance         1.2345 SOL",
        "",
        `Buffer Address  ${AUTHORITY}`,
        `Authority       ${ADDRESS}`,
        "Balance         0.5 SOL",
        "",
      ].join("\n")
    );
    for (const line of fitted.split("\n")) {
      expect(line.length).toBeLessThanOrEqual(100);
    }
  });

  it("puts each value under its label at a phone's width", () => {
    // Unstyled, as solana-cli prints it where it sees no colour terminal
    const output = stripAnsi(table([[ADDRESS, AUTHORITY, "1.2345 SOL"]]));

    expect(stripAnsi(fitBuffersTable(output, 48))).toBe(
      [
        "",
        "Buffer Address",
        ADDRESS,
        "Authority",
        AUTHORITY,
        "Balance",
        "1.2345 SOL",
        "",
      ].join("\n")
    );
  });

  it("says there are no buffers instead of a header that would wrap", () => {
    expect(stripAnsi(fitBuffersTable(table([]), 100))).toBe("\nNo buffers.\n");
  });

  it("leaves any other output alone", () => {
    const other = `Program Id: ${ADDRESS} | not a buffer table`;

    expect(fitBuffersTable(other, 20)).toBe(other);
    expect(fitBuffersTable(42, 20)).toBe(42);
  });
});
