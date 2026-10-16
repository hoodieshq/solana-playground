/**
 * The name a duplicate takes: "<name> (copy)", then "(copy 2)", "(copy 3)"
 * and on, the first one no workspace has.
 */
export const copyName = (name: string, taken: readonly string[]) => {
  const first = `${name} (copy)`;
  if (!taken.includes(first)) return first;

  for (let n = 2; ; n++) {
    const next = `${name} (copy ${n})`;
    if (!taken.includes(next)) return next;
  }
};
