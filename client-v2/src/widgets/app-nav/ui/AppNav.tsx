import { PgView } from "@/utils";
import NewWorkspaceModal from "@/views/flow/gallery/NewWorkspaceModal";
import type { GalleryTab } from "@/views/flow/gallery/NewWorkspaceModal";
import type { NavItem } from "../model/nav-item";
import { navTelemetry } from "../model/telemetry";
import BaseAppNav from "./BaseAppNav";
import type { BaseAppNavProps } from "./BaseAppNav";

export type AppNavProps = Omit<BaseAppNavProps, "onOpen"> & {
  /** Home is the page shown, so picking Home has nowhere further to go */
  homeShown?: boolean;
  /** Show Home in place of the work */
  onHome: () => void;
};

/** Which gallery tab each item opens on; New project takes the lead tab */
const TAB: Record<Exclude<NavItem, "home">, GalleryTab> = {
  "new-project": "tutorials",
  tutorials: "tutorials",
  programs: "programs",
};

/**
 * Home shows Home (`onHome`), from the work or before the start is decided,
 * and does nothing while Home shows (`homeShown`). New project, Tutorials and
 * Programs open the gallery on their tab until they get pages of their own.
 */
const AppNav = ({ homeShown, onHome, ...props }: AppNavProps) => {
  const open = (item: NavItem) => {
    navTelemetry.track("nav_item_opened", { item });
    if (item === "home") {
      if (!homeShown) onHome();
      return;
    }
    // Settles when the modal closes and never rejects: a gallery that fails
    // to render is reported and told by `ModalHost`'s boundary
    void PgView.setModal<unknown, { initialTab: GalleryTab }>(
      NewWorkspaceModal,
      { initialTab: TAB[item] }
    );
  };
  return <BaseAppNav {...props} onOpen={open} />;
};

export default AppNav;
