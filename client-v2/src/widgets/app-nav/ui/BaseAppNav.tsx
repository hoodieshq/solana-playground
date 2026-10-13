import { Code, GraduationCap, House, PanelLeft, Plus } from "lucide-react";
import type { ComponentType, ReactNode } from "react";

import { Button } from "@/shared/ui/button";
import {
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/shared/ui/sidebar";

export type NavItem = "home" | "new-project" | "tutorials" | "programs";

const ITEMS: { item: NavItem; label: string; Icon: ComponentType }[] = [
  { item: "home", label: "Home", Icon: House },
  { item: "new-project", label: "New project", Icon: Plus },
  { item: "tutorials", label: "Tutorials", Icon: GraduationCap },
  { item: "programs", label: "Programs", Icon: Code },
];

export interface BaseAppNavProps {
  /** The rail: icons only, no logo, switcher or footer */
  collapsed: boolean;
  onToggle: () => void;
  logo: ReactNode;
  switcher: ReactNode;
  footer: ReactNode;
  onOpen: (item: NavItem) => void;
}

const BaseAppNav = ({
  collapsed,
  onToggle,
  logo,
  switcher,
  footer,
  onOpen,
}: BaseAppNavProps) => (
  <>
    <SidebarHeader>
      <div className="flex items-center justify-between gap-2">
        {!collapsed && logo}
        <Button
          variant="ghost"
          size="icon"
          aria-label={collapsed ? "Expand navigation" : "Collapse navigation"}
          onClick={onToggle}
        >
          <PanelLeft />
        </Button>
      </div>
      {!collapsed && switcher}
    </SidebarHeader>
    <SidebarContent>
      <SidebarMenu>
        {ITEMS.map(({ item, label, Icon }) => (
          <SidebarMenuItem key={item}>
            <SidebarMenuButton tooltip={label} onClick={() => onOpen(item)}>
              <Icon />
              <span>{label}</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        ))}
      </SidebarMenu>
    </SidebarContent>
    {!collapsed && (
      <SidebarFooter>
        <div className="flex flex-wrap gap-2">{footer}</div>
      </SidebarFooter>
    )}
  </>
);

export default BaseAppNav;
