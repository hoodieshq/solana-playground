/**
 * A tutorial opened by a press that already said "start": the gallery's
 * Start here banner. Its About page would ask for a second Start, so it
 * starts on its own once, and only for that one tutorial.
 */
let pending: string | null = null;

export const startOnOpen = (name: string) => {
  pending = name;
};

/** Whether the About page for `name` should start at once; asks only once */
export const takeStartOnOpen = (name: string) => {
  const yes = pending === name;
  pending = null;
  return yes;
};
