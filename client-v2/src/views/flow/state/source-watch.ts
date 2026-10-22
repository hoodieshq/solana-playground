import * as monaco from "monaco-editor";

import { PgFlow } from "./stage";
import type { Disposable } from "../../../utils";

/**
 * Tell the dev loop when the code changes after a build.
 *
 * Every edit goes through a Monaco model, the learner's typing and an
 * applied patch alike, so listening there catches both. Loading a model
 * fills it once before anyone types, which is not an edit and is skipped.
 */
export const watchSources = (): Disposable => {
  const listening = new Map<string, monaco.IDisposable>();
  const listen = (model: monaco.editor.ITextModel) => {
    const key = model.uri.toString();
    if (listening.has(key)) return;
    listening.set(
      key,
      model.onDidChangeContent((e) => {
        if (!e.isFlush) PgFlow.sourceChanged();
      })
    );
  };

  monaco.editor.getModels().forEach(listen);
  const created = monaco.editor.onDidCreateModel(listen);
  const removed = monaco.editor.onWillDisposeModel((model) => {
    const key = model.uri.toString();
    listening.get(key)?.dispose();
    listening.delete(key);
  });

  return {
    dispose: () => {
      created.dispose();
      removed.dispose();
      listening.forEach((d) => d.dispose());
      listening.clear();
    },
  };
};
