import { LESSON_PATHS } from "./paths";
import { registerPaths } from "./registry";
import { TUTORIALS } from "../../../tutorials";

registerPaths(
  LESSON_PATHS,
  TUTORIALS.map((t) => t.name)
);

export { getLessonPath } from "./registry";
export { INITIAL_LESSON_STATE, PgLesson } from "./store";
export type { LessonState } from "./store";
