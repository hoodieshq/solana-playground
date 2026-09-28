/**
 * The persistence feature's only door into Monaco.
 *
 * Monaco keeps one model per path and `Monaco.tsx` reuses it whenever that
 * path is opened again (`onDidOpenFile`), so text written to disk underneath
 * an open tab stays invisible -- and the next autosave writes the old text
 * back. Anything that replaces files under a live editor has to drop those
 * models; this is where that happens.
 *
 * Loaded lazily, as `playground-bridge.ts` does, so nothing here pulls the
 * editor into a bundle or a test that never needed it.
 */
const models = async () => (await import("monaco-editor")).editor.getModels();

export const PgEditorModels = {
  /** @returns the model's current text, or `null` when there is no model */
  async valueOf(path: string): Promise<string | null> {
    const model = (await models()).find((m) => m.uri.path === path);
    return model ? model.getValue() : null;
  },

  /**
   * Dispose the models for these paths, so the next open builds them from
   * the explorer's state. Disposing is not an edit: no content-change event
   * fires, so no autosave writes anything back.
   */
  async drop(paths: readonly string[]) {
    const wanted = new Set(paths);
    for (const model of await models()) {
      if (wanted.has(model.uri.path)) model.dispose();
    }
  },

  /** `drop` for every model under a directory, trailing slash included */
  async dropUnder(prefix: string) {
    for (const model of await models()) {
      if (model.uri.path.startsWith(prefix)) model.dispose();
    }
  },
};
