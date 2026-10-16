import { createTracker } from "../../../shared/lib/telemetry";
import type { NavItem } from "./nav-item";
import type { ProjectAction } from "./project-action";

type NavEvents = {
  /**
   * A user picked one of the navigation's items; `item` is the item picked,
   * not the page it opened (until they have pages, Home and New project open
   * the gallery, the same as Tutorials does).
   */
  nav_item_opened: { item: NavItem };
  /**
   * A project action ran from the navigation's project list, picked in a
   * row's menu (`via: click`) or by its letter while the menu was open
   * (`via: key`). `rename` is sent on commit, not when the field opens.
   */
  nav_project_action: { action: ProjectAction; via: "click" | "key" };
  /** A project action threw; the user was told and the error was logged */
  nav_project_action_failed: { action: ProjectAction };
};

export const navTelemetry = createTracker<NavEvents>();
