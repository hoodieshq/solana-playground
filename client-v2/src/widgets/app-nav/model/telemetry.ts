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
   * An action started from the navigation's project list: a click on the row
   * (open) or on a menu item (`via: click`), or the item's letter while the
   * menu is open (`via: key`). `rename` is sent on commit; `export` and
   * `delete` when their dialog opens, since the dialog owns what follows.
   */
  nav_project_action: { action: ProjectAction; via: "click" | "key" };
  /** A project action threw; the user was told and the error was logged */
  nav_project_action_failed: { action: ProjectAction };
};

export const navTelemetry = createTracker<NavEvents>();
