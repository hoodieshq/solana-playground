import { reportButtonFailure } from "@/shared/lib/report-button-failure";
import { AsyncButton } from "@/shared/ui/async-button";
import { Button } from "@/shared/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/shared/ui/dialog";

interface StartOverDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** The tutorial's name, in the question */
  name: string;
  /** Starts over; the dialog stays open, its button busy, until it settles */
  onConfirm: () => Promise<void>;
}

/** Starting over clears progress, so it asks first, as the prototype does */
const StartOverDialog = ({
  open,
  onOpenChange,
  name,
  onConfirm,
}: StartOverDialogProps) => (
  <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent className="sm:max-w-sm" showCloseButton={false}>
      <DialogHeader>
        <DialogTitle>Start {name} over?</DialogTitle>
        <DialogDescription>
          Your progress and the code written so far will be cleared.
        </DialogDescription>
      </DialogHeader>
      <DialogFooter>
        <DialogClose asChild>
          <Button variant="outline">Cancel</Button>
        </DialogClose>
        <AsyncButton
          variant="destructive"
          onClick={async () => {
            await onConfirm();
            onOpenChange(false);
          }}
          onError={reportButtonFailure("start over")}
        >
          Start over
        </AsyncButton>
      </DialogFooter>
    </DialogContent>
  </Dialog>
);

export default StartOverDialog;
