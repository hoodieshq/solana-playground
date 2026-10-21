import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

import { useStore } from "../store"

/** Starting over clears progress, so it asks first */
export function StartOverDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const { s, dispatch } = useStore()
  const done = s.passed.filter(Boolean).length
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent size="sm">
        <AlertDialogHeader>
          <AlertDialogTitle>Start Hello Anchor over?</AlertDialogTitle>
          <AlertDialogDescription>
            {done === 1 ? "Your passed step" : `Your ${done} passed steps`} and the code you applied will be cleared.
          </AlertDialogDescription>
        </AlertDialogHeader>
        {/* The stock footer sits on its own muted band with a border. Here the buttons share the dialog's
            surface, the way they do in the sheets */}
        <AlertDialogFooter className="mx-0! mb-0! border-t-0! bg-transparent! p-0! pt-2!">
          <AlertDialogCancel className="h-12!">Cancel</AlertDialogCancel>
          <AlertDialogAction variant="destructive" className="h-12!" onClick={() => dispatch({ type: "restart" })}>
            Start over
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
