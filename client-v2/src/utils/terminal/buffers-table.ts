/** Matches the ANSI styling solana-cli may put on the table's header */
const ANSI = /\x1b\[[0-9;]*m/g;

/** The header solana-cli prints over `solana program show --buffers` */
const HEADER = /^Buffer Address\s+\|\s+Authority\s+\|\s+Balance\s*$/;

const LABELS = ["Buffer Address", "Authority", "Balance"] as const;

/** Width of the label column in the labelled layout, its gap included */
const LABEL_WIDTH = LABELS[0].length + 2;

/** Bold, as solana-cli prints its labels; not `PgTerminal.bold`, which imports this */
const bold = (text: string) => `\x1b[1m${text}\x1b[0m`;

/**
 * Fit the table `solana program show --buffers` prints to the terminal.
 *
 * solana-cli pads both addresses to 44 characters, so a row needs about 105
 * columns and wraps in the console at any width it usually has, header and
 * rows breaking apart. When a row would wrap, each buffer is printed as
 * labelled lines instead, the label beside its value when both fit and above
 * it when they do not. Addresses are never cut: a learner copies one into
 * `solana program close`.
 *
 * @param msg what solana-cli printed
 * @param cols the terminal's width in columns
 * @returns the table laid out for `cols`, or `msg` untouched when it is not
 * the buffers table or its rows already fit
 */
export const fitBuffersTable = <T>(msg: T, cols: number): T | string => {
  if (typeof msg !== "string") return msg;

  const lines = msg.split("\n");
  const headerIndex = lines.findIndex((line) =>
    HEADER.test(line.replace(ANSI, ""))
  );
  if (headerIndex === -1) return msg;

  const rowsEnd = lines.findIndex(
    (line, i) => i > headerIndex && line.split(" | ").length !== 3
  );
  const end = rowsEnd === -1 ? lines.length : rowsEnd;
  const rows = lines
    .slice(headerIndex + 1, end)
    .map((line) => line.split(" | ").map((cell) => cell.trim()));

  const widest = Math.max(
    ...lines.slice(headerIndex, end).map((l) => l.replace(ANSI, "").length)
  );
  if (widest <= cols) return msg;

  const longest = Math.max(0, ...rows.flat().map((cell) => cell.length));
  const beside = LABEL_WIDTH + longest <= cols;
  const blocks = rows.map((row) =>
    row
      .map((value, i) =>
        beside
          ? bold(LABELS[i].padEnd(LABEL_WIDTH)) + value
          : `${bold(LABELS[i])}\n${value}`
      )
      .join("\n")
  );
  const body = blocks.length ? blocks.join("\n\n") : "No buffers.";

  return [...lines.slice(0, headerIndex), body, ...lines.slice(end)].join("\n");
};
