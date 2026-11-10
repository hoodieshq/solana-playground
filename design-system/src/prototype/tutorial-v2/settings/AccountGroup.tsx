import { useState } from "react"

import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

import { soon } from "../desktop/Catalog"
import type { Account } from "../navStates"
import { Row, usePhone } from "./Row"

/** Account, at the foot of Settings and only while signed in: the one thing about the account that has
 * no other home. Name, picture and sign in belong to GitHub, so there's no profile or password here;
 * Sign out is in the account menu. Projects and assistant chats are kept on Playground's servers under
 * the account, and this is the way to remove them all at once. It can't be undone, so it asks first in
 * a dialog, not inline as Your key does */
export function AccountGroup({ account, confirm: seeded }: { account: Account; confirm: boolean }) {
  const phone = usePhone()
  const [confirm, setConfirm] = useState(seeded)
  return (
    <>
      <Row label="Delete account and data">
        <Button variant="ghost" size="sm" onClick={() => setConfirm(true)} className={cn("text-muted-foreground hover:text-foreground", phone && "h-9")}>
          Delete
        </Button>
      </Row>
      <AlertDialog open={confirm} onOpenChange={setConfirm}>
        <AlertDialogContent size="sm" className="sm:max-w-sm">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete your account?</AlertDialogTitle>
            <AlertDialogDescription>{`The projects and assistant chats saved to ${account.line} are removed from Playground for good. Your GitHub account stays as it is.`}</AlertDialogDescription>
          </AlertDialogHeader>
          {/* The buttons share the dialog's surface, as Start over has them */}
          <AlertDialogFooter className="mx-0! mb-0! border-t-0! bg-transparent! p-0! pt-2!">
            <AlertDialogCancel className="[html.touch_&]:h-11">Cancel</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={soon} className="[html.touch_&]:h-11">
              Delete account
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
