import type { Stage } from "./stage";

/** What the product calls each stage. Apart from `stage.ts`, which loads the playground */
export const STAGE_LABEL: Record<Stage, string> = {
  write: "Write",
  build: "Build",
  deploy: "Deploy",
  interact: "Interact",
};
