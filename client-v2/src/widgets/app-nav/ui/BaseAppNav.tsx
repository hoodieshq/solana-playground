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
import type { NavItem } from "../model/nav-item";

const ITEMS: { item: NavItem; label: string; Icon: ComponentType }[] = [
  { item: "home", label: "Home", Icon: House },
  { item: "new-project", label: "New project", Icon: Plus },
  { item: "tutorials", label: "Tutorials", Icon: GraduationCap },
  { item: "programs", label: "Programs", Icon: Code },
];

export interface BaseAppNavProps {
  /** The rail: icons only, no logo or switcher, the footer hidden */
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
    {/* Hidden on the rail. What it holds keeps its state above it
        (`FeedbackHost`, `PgSession`), because below
        `LAYOUT_BREAKPOINTS.left` the stock Sidebar's Sheet unmounts it on
        close. Inline, because the footer's own `flex` beats `hidden` */}
    <SidebarFooter style={collapsed ? { display: "none" } : undefined}>
      <div className="flex flex-wrap items-center gap-2">{footer}</div>
    </SidebarFooter>
  </>
);

export default BaseAppNav;
