import type { ReactNode } from "react";

import { cn } from "cn";

interface BaseSettingRowProps {
  name: string;
  description?: string;
  control: ReactNode;
  /** Below `LAYOUT_BREAKPOINTS.phone`: the control goes under the text, full width */
  phone: boolean;
}

/** One setting: its name and description, and the control that sets it */
const BaseSettingRow = ({
  name,
  description,
  control,
  phone,
}: BaseSettingRowProps) => (
  <div
    data-layout={phone ? "stacked" : "inline"}
    className={cn(
      "flex gap-3 border-b border-border py-3",
      phone ? "flex-col" : "items-center justify-between"
    )}
  >
    <div className="flex min-w-0 flex-col gap-0.5">
      <span className="text-sm font-medium text-foreground">{name}</span>
      {description && (
        <span className="text-xs text-muted-foreground">{description}</span>
      )}
    </div>
    <div className={cn("shrink-0", phone ? "w-full" : "w-46")}>{control}</div>
  </div>
);

export default BaseSettingRow;
