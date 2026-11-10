import { emit } from "../ui/events"

/** Opens New project from anywhere: the nav's row asks through the event bus */
export const openNewProject = () => emit("new-project:open")
