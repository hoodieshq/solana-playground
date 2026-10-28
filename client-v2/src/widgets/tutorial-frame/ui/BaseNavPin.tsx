import { Pin, PinOff } from "lucide-react";

import { Button } from "@/shared/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/shared/ui/tooltip";

interface BaseNavPinProps {
  pinned: boolean;
  onPinnedChange: (pinned: boolean) => void;
}

/** What the pin does next, as its name and its tooltip */
export const pinLabel = (pinned: boolean) =>
  pinned ? "Fold while I learn" : "Keep open";

/**
 * The pin in the navigation's open head in a tutorial: docks the overlay
 * open beside the chat until the learner leaves, and folds it back. The
 * shell reads its click as a pick that closes the overlay first, so pinning
 * goes from the rail (`foldNav`), and lands pinned all the same.
 */
const BaseNavPin = ({ pinned, onPinnedChange }: BaseNavPinProps) => (
  <Tooltip>
    <TooltipTrigger asChild>
      <Button
        variant="ghost"
        size="icon"
        aria-pressed={pinned}
        aria-label={pinLabel(pinned)}
        onClick={() => onPinnedChange(!pinned)}
      >
        {pinned ? <PinOff /> : <Pin />}
      </Button>
    </TooltipTrigger>
    <TooltipContent side="bottom" sideOffset={8}>
      {pinLabel(pinned)}
    </TooltipContent>
  </Tooltip>
);

export default BaseNavPin;
