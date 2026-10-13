import type { ReactNode } from "react";

import { PgView } from "@/utils";
import NewWorkspaceModal from "@/views/flow/gallery/NewWorkspaceModal";
import type { NavItem } from "../model/nav-item";
import { navTelemetry } from "../model/telemetry";
import BaseAppNav from "./BaseAppNav";

type GalleryTab = "tutorials" | "programs";

export interface AppNavProps {
  collapsed: boolean;
  onToggle: () => void;
  logo: ReactNode;
  switcher: ReactNode;
  footer: ReactNode;
}

/** Until Home, Tutorials and Programs have pages, each item opens the gallery */
const AppNav = ({
  collapsed,
  onToggle,
  logo,
  switcher,
  footer,
}: AppNavProps) => {
  const open = (item: NavItem) => {
    navTelemetry.track("nav_item_opened", { item });
    const initialTab: GalleryTab =
      item === "programs" ? "programs" : "tutorials";
    PgView.setModal<unknown, { initialTab: GalleryTab }>(NewWorkspaceModal, {
      initialTab,
    });
  };

  return (
    <BaseAppNav
      collapsed={collapsed}
      onToggle={onToggle}
      logo={logo}
      switcher={switcher}
      footer={footer}
      onOpen={open}
    />
  );
};

export default AppNav;
