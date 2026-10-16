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

interface BaseSignOutDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
}

/** Asked in a dialog, not in the menu: the menu closes on the click that would confirm */
const BaseSignOutDialog = ({
  open,
  onOpenChange,
  onConfirm,
}: BaseSignOutDialogProps) => (
  <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent className="sm:max-w-sm">
      <DialogHeader>
        <DialogTitle>Sign out of GitHub?</DialogTitle>
        <DialogDescription>
          Your projects and chats stay in this browser and stop syncing until
          you sign in again.
        </DialogDescription>
      </DialogHeader>
      <DialogFooter>
        <DialogClose asChild>
          <Button variant="outline">Cancel</Button>
        </DialogClose>
        <Button variant="destructive" onClick={onConfirm}>
          Sign out
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
);

export default BaseSignOutDialog;
