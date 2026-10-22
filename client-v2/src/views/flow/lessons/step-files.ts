import { currentStep } from "./progress";
import { PgLesson } from "./store";
import { PgExplorer } from "../../../utils";
import type { Disposable } from "../../../utils";

/**
 * Make the files a step is written in when the step opens.
 *
 * Upstream's tutorial made them in its page's `onMount`, which the lesson
 * surface does not mount: Hello Anchor's step 3 asked for a call in
 * `client/client.ts` that only the assistant's patch ever created. A file
 * already there is left as it is, so a reload or a step back keeps what the
 * learner wrote.
 */
export class PgStepFiles {
  static init(): Disposable {
    let last: string | null = null;
    return PgLesson.onDidChange((state) => {
      const step = state.path && currentStep(state.path, state.progress);
      const id = step ? `${state.path!.tutorial}/${step.id}` : null;
      if (id === last) return;
      last = id;
      if (!step?.files) return;
      // Only into the lesson's own workspace, never one switched to since
      if (PgExplorer.currentWorkspaceName !== state.path!.tutorial) return;

      void (async () => {
        for (const [path, content] of step.files!) {
          const fullPath = PgExplorer.convertToFullPath(path);
          if (PgExplorer.getFile(fullPath)) continue;
          try {
            // Opened, as upstream did: the step's text names this file
            await PgExplorer.createItem(fullPath, content());
          } catch {
            // Made in the meantime by a patch or by hand: nothing to do
          }
        }
      })();
    });
  }
}
