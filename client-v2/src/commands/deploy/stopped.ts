/**
 * What the terminal says after a stopped deploy (Spec 13's "Stopped. The
 * program was not deployed."), naming what the stop left behind.
 *
 * @param buffer the buffer account the deploy created, `null` before it
 * existed
 * @returns the line for `StoppedError`
 */
export const deployStoppedLine = (buffer: string | null) => {
  const line = "Stopped. The program was not deployed.";
  if (!buffer) return line;

  return [
    line,
    `The buffer account ${buffer} still holds its SOL;`,
    "run `solana program close --buffers` to reclaim it.",
  ].join(" ");
};
