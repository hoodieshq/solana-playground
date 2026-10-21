import type { ReactNode } from "react";
import { ChevronLeft } from "lucide-react";

import { LoggerErrorBoundary } from "@/shared/lib/logger";
import { Button } from "@/shared/ui/button";
import { Callout, CalloutDescription } from "@/shared/ui/callout";

/**
 * Keeps a setting that throws as it renders (a malformed `values` entry, a
 * Custom value with no `custom`) from unmounting the app hidden under the
 * page: the page gives way to a notice with "Back to app", and the error is
 * reported through the logger's `panic`.
 */
const SettingsBoundary = ({
  onBack,
  children,
}: {
  onBack: () => void;
  children: ReactNode;
}) => (
  <LoggerErrorBoundary
    fallback={
      <div
        role="region"
        aria-label="Settings"
        className="fixed inset-0 z-40 flex flex-col items-center justify-center gap-4 bg-background p-6 text-foreground"
      >
        <Callout variant="error" className="max-w-md">
          <CalloutDescription>
            The settings could not be shown.
          </CalloutDescription>
        </Callout>
        <Button variant="outline" onClick={onBack} autoFocus>
          <ChevronLeft data-icon="inline-start" />
          Back to app
        </Button>
      </div>
    }
  >
    {children}
  </LoggerErrorBoundary>
);

export default SettingsBoundary;
