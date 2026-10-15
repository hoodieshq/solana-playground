import { ReactNode } from "react";

import { EditorTabs } from "@/shared/ui/editor-tabs";

interface BaseEditorTabsProps {
  id?: string;
  children: ReactNode;
  /** Sits after the tabs, outside their scroll (the wallet button) */
  end?: ReactNode;
}

export const BaseEditorTabs = ({ id, children, end }: BaseEditorTabsProps) => (
  <EditorTabs id={id} className="overflow-hidden">
    <div className="flex min-w-0 flex-1 overflow-x-auto overflow-y-hidden [scrollbar-width:none]">
      {children}
    </div>
    {end}
  </EditorTabs>
);
