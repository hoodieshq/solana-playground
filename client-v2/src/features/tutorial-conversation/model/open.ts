import type { TutorialDefinition } from "@/entities/tutorial";

import { PgTutorial } from "../../../utils/tutorial/tutorial";

/**
 * Open a conversation tutorial on its intro card. The first open creates its
 * workspace from the intro's preview, the finished program, so the engine
 * has a workspace to load its save from, with the cursor on the intro. Start
 * over comes back to the same intro inside the same workspace, so the intro
 * never shows without one. A tutorial that already has its workspace is left
 * as it is: the engine's save says where the learner is.
 *
 * `PgTutorial.start` starts the current tutorial, which the route has set by
 * the time it calls this, and ends by navigating to `/tutorials/<slug>/1`.
 *
 * @param definition the definition of the tutorial the route opened
 */
export const openOnIntro = async (definition: TutorialDefinition) => {
  if (PgTutorial.isStarted(definition.name)) return;

  const { files } = definition.intro;
  // The file step 1 works in, as the preview's open tab; a preview that
  // lacks it opens the explorer's own default rather than a missing file
  const first = definition.steps[0].file;
  await PgTutorial.start({
    files: Object.entries(files),
    defaultOpenFile: first in files ? first : undefined,
  });
};
