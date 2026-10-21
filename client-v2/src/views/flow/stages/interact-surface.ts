/** What the Interact stage shows: the form, or why the program cannot be called yet */
export type InteractSurface =
  | "no-project"
  | "not-built"
  | "no-idl"
  | "no-program-id"
  | "bad-idl"
  | "checking"
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
   * `PgProgramInfo.onChain`: `undefined` until its first read settles, `null`
   * when a read failed (the derivable catches the error and stores `null`)
   */
  onChain: { deployed: boolean } | null | undefined;
}

/**
 * Picks the Interact stage's surface; the first missing piece wins, in the
 * order the embedded form checked before 5.12. No build is required: an IDL
 * can arrive without one, through "Load IDL file".
 */
export const interactSurface = (f: InteractFacts): InteractSurface => {
  if (!f.hasProject) return "no-project";
  if (!f.idl) return f.imported ? "no-idl" : "not-built";
  if (!f.hasProgramId) return "no-program-id";
  if (!Array.isArray(f.idl.instructions)) return "bad-idl";
  if (f.onChain === undefined) return "checking";
  if (!f.onChain) return "unreachable";
  if (!f.onChain.deployed) return "not-deployed";
  return "ready";
};

/** The facts, from what `useExplorer` and `useProgramInfo` return */
export const interactFacts = (
  explorer: { isTemporary: boolean; currentWorkspaceName?: string | null },
  programInfo: {
    idl: InteractFacts["idl"];
    importedProgram: unknown;
    uuid: string | null | undefined;
    pk: unknown;
    onChain: InteractFacts["onChain"];
  }
): InteractFacts => ({
  hasProject: explorer.isTemporary || !!explorer.currentWorkspaceName,
  idl: programInfo.idl,
  imported: !!(programInfo.importedProgram || programInfo.uuid),
  hasProgramId: !!programInfo.pk,
  onChain: programInfo.onChain,
});
