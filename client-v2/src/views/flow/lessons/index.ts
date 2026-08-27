import { LESSON_PATHS } from "./paths";
import { registerPaths } from "./registry";
import { TUTORIALS } from "../../../tutorials";

registerPaths(
  LESSON_PATHS,
  TUTORIALS.map((t) => t.name)
);

export { getLessonPath } from "./registry";
