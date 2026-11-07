/** The escape character that starts an ANSI style */
const ESC = "\u001b";

/** Matches the SGR styling (`ESC[…m`) solana-cli puts on the table's header */
const ANSI = new RegExp(`${ESC}\\[[0-9;]*m`, "g");

/** `text` without its SGR styling, so its length is the columns it takes */
export const stripAnsi = (text: string) => text.replace(ANSI, "");

/** The header solana-cli prints over `solana program show --buffers` */
const HEADER = /^Buffer Address\s+\|\s+Authority\s+\|\s+Balance\s*$/;

/**
 * Splits a row into its three cells. No cell holds " | ": two are base58
 * addresses and the third a balance, so a line that splits otherwise has
 * left the table.
 */
const SEPARATOR = " | ";

const LABELS = ["Buffer Address", "Authority", "Balance"] as const;

/** Width of the label column in the labelled layout, its gap included */
const LABEL_WIDTH = LABELS[0].length + 2;

/**
 * Bold, as solana-cli prints the table's header; not `PgTerminal.bold`, since
 * `terminal.ts` imports this module
 */
const bold = (text: string) => `${ESC}[1m${text}${ESC}[0m`;

/**
 * Fit the table `solana program show --buffers` prints to the terminal.
 *
 * solana-cli pads both addresses to 44 characters, so a row takes 94 columns
 * plus its balance, about 105, and wraps in a console narrower than that,
 * header and rows breaking apart. When a row would wrap, the header is
 * dropped and each buffer is printed as labelled lines; for the whole table
 * the label goes beside its value when the longest value fits beside it, and
 * above it when not. Addresses are never cut: a learner copies one into
 * `solana program close`. A table with no rows reads "No buffers." at any
 * width.
 *
 * solana-cli hands the whole table over as one message (`runSolana` logs its
 * output once), which is what lets the rows be found after the header.
 *
 * @param msg what solana-cli printed
 * @param cols the terminal's width in columns
 * @returns the table laid out for `cols`, or `msg` untouched when it is not
 * the buffers table or its rows already fit
 */
export const fitBuffersTable = <T>(msg: T, cols: number): T | string => {
  if (typeof msg !== "string") return msg;

  const lines = msg.split("\n");
  const headerIndex = lines.findIndex((line) => HEADER.test(stripAnsi(line)));
  if (headerIndex === -1) return msg;

  const rowsEnd = lines.findIndex(
    (line, i) => i > headerIndex && line.split(SEPARATOR).length !== 3
  );
  const end = rowsEnd === -1 ? lines.length : rowsEnd;
  const rows = lines
    .slice(headerIndex + 1, end)
    .map((line) => line.split(SEPARATOR).map((cell) => cell.trim()));
  const replaceTable = (body: string) =>
    [...lines.slice(0, headerIndex), body, ...lines.slice(end)].join("\n");

  if (!rows.length) return replaceTable("No buffers.");

  const widest = Math.max(
    ...lines.slice(headerIndex, end).map((line) => stripAnsi(line).length)
  );
  if (widest <= cols) return msg;

  const longest = Math.max(...rows.flat().map((cell) => cell.length));
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

  return replaceTable(blocks.join("\n\n"));
};
