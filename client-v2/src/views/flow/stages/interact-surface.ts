/** What the Interact stage shows: the form, or why the program cannot be called yet */
export type InteractSurface =
  | "no-project"
  | "not-built"
  | "no-idl"
  | "no-program-id"
  | "bad-idl"
  | "unreachable"
  | "not-deployed"
  | "ready";

/** What `interactSurface` reads from the explorer and `PgProgramInfo` */
export interface InteractFacts {
  /** A workspace is open, or the explorer is temporary */
  hasProject: boolean;
  /** `PgProgramInfo.idl`; only `instructions` is read */
  idl: { instructions?: unknown } | null;
  /** `importedProgram` or `uuid` is set: the program was not built here */
  imported: boolean;
  hasProgramId: boolean;
  /**
   * `PgProgramInfo.onChain`; null or undefined when the read failed. A read
   * still in flight is undefined too, and reads as unreachable, as it always
   * has.
   */
  onChain: { deployed: boolean } | null | undefined;
}

/** Picks the Interact stage's surface; the first missing piece wins */
export const interactSurface = (f: InteractFacts): InteractSurface => {
  if (!f.hasProject) return "no-project";
  if (!f.idl) return f.imported ? "no-idl" : "not-built";
  if (!f.hasProgramId) return "no-program-id";
  if (!f.idl.instructions) return "bad-idl";
  if (!f.onChain) return "unreachable";
  if (!f.onChain.deployed) return "not-deployed";
  return "ready";
};
