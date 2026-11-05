import type { ComponentProps } from "react";

import { SETTINGS_TRIGGER_ATTR } from "@/shared/lib/settings-request";
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/shared/ui/sidebar";

import type { StatusIndicator } from "../model/indicators";
import { IndicatorDot, StatusPanel } from "./parts";

export interface BaseStatusRowProps {
  /** Network, AI, Rust analyzer, in that order */
  indicators: readonly StatusIndicator[];
  /** An indicator was clicked: one without a panel acts on it at once, one
   * with a panel has just opened it */
  onPick: (indicator: StatusIndicator) => void;
  /** A panel's action */
  onAction: (indicator: StatusIndicator) => void;
  /** A panel's Try again; busy until it settles */
  onRetry: (indicator: StatusIndicator) => Promise<unknown>;
  /** Whether the settings are open: the network indicator opens them */
  settingsOpen: boolean;
}

/** The settings' trigger mark, on the indicator that opens them */
const settingsTrigger = { [SETTINGS_TRIGGER_ATTR]: "" };

/**
 * The navigation foot's status row: the three indicators where the
 * prototype draws "● Devnet", wrapping onto a second line when a state is
 * long rather than cutting its words. An indicator with something to add
 * (`panel`: the analyzer, a cluster that does not answer, the AI's limit or
 * failure) opens a panel; the rest go straight to where they are fixed.
 */
const BaseStatusRow = ({
  indicators,
  onPick,
  onAction,
  onRetry,
  settingsOpen,
}: BaseStatusRowProps) => (
  <SidebarMenu className="w-full">
    <SidebarMenuItem
      data-testid="status-row"
      className="flex flex-wrap items-center"
    >
      {indicators.map((indicator) => {
        const button = (props: ComponentProps<typeof SidebarMenuButton>) => (
          <SidebarMenuButton
            key={indicator.id}
            aria-label={indicator.label}
            title={indicator.label}
            data-status={indicator.id}
            data-state-kind={indicator.state}
            // Tight, so a row of ready states fits the navigation on one line
            className="w-auto max-w-full min-w-0 gap-1.5 px-1"
            {...props}
          >
            <IndicatorDot state={indicator.state} />
            <span className="truncate">{indicator.words}</span>
          </SidebarMenuButton>
        );

        if (!indicator.panel) {
          if (indicator.id === "network") {
            return button({
              "aria-expanded": settingsOpen,
              ...settingsTrigger,
              onClick: () => onPick(indicator),
            });
          }
          return button({ onClick: () => onPick(indicator) });
        }
        return (
          <StatusPanel
            key={indicator.id}
            indicator={indicator}
            // The settings' focus return still finds the network's trigger
            // when Change network opens them from the panel
            trigger={button({
              type: "button",
              ...(indicator.id === "network" && settingsTrigger),
            })}
            side="top"
            align="start"
            onPick={onPick}
            onAction={onAction}
            onRetry={onRetry}
          />
        );
      })}
    </SidebarMenuItem>
  </SidebarMenu>
);

export default BaseStatusRow;
