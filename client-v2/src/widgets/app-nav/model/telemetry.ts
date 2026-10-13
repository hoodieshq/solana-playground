import { createTracker } from "../../../shared/lib/telemetry";
import type { NavItem } from "../ui/BaseAppNav";

type NavEvents = {
  /** A user picked one of the navigation's items; `item` says which. */
  nav_item_opened: { item: NavItem };
};

export const navTelemetry = createTracker<NavEvents>();
