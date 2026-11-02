import { Check, Copy, Monitor, Share } from "lucide-react";
import { Fragment, useEffect, useState } from "react";

import { BrandButton } from "@/shared/ui/brand-button";
import { Button } from "@/shared/ui/button";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/shared/ui/drawer";

export const HANDOFF_TITLE = "Continue on a computer";

/** How long "Copied" stays before the button reads "Copy link" again */
const COPIED_MS = 2000;

export interface BaseHandoffProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** The address to open on the computer, whole */
  link: string;
  /** The GitHub login signed in here; null when nobody is */
  login: string | null;
  /** A sign-in is under way: its button waits */
  signingIn: boolean;
  onSignIn: () => void;
  /** The browser has a share sheet (`navigator.share`) */
  canShare: boolean;
  /**
   * Puts the link on the clipboard: true once it is there, false when the
   * clipboard refused (and the caller has told the user)
   */
  onCopy: () => Promise<boolean>;
  onShare: () => Promise<void>;
}

/** The link whole, with a break offered after each slash and never a cut */
const Wrapped = ({ link }: { link: string }) => (
  <>
    {link.split("/").map((part, i) => (
      <Fragment key={i}>
        {i > 0 && (
          <>
            /<wbr />
          </>
        )}
        {part}
      </Fragment>
    ))}
  </>
);

/**
 * The phone's way out for work a phone does poorly, such as typing code: a
 * row on the menu page and the sheet it opens, in the shape of the lesson's
 * "Write it yourself on a computer" sheet (Almaz's prototype), so the phone
 * has one look for it. Signed in, account sync carries the project; signed
 * out, it says the project stays here and offers the sign-in.
 */
const BaseHandoff = ({
  open,
  onOpenChange,
  link,
  login,
  signingIn,
  onSignIn,
  canShare,
  onCopy,
  onShare,
}: BaseHandoffProps) => {
  const [copied, setCopied] = useState(false);
  useEffect(() => {
    if (!copied) return;
    const timer = window.setTimeout(() => setCopied(false), COPIED_MS);
    return () => window.clearTimeout(timer);
  }, [copied]);
  const copy = async () => setCopied(await onCopy());

  return (
    <>
      <Button
        variant="ghost"
        data-testid="handoff-open"
        onClick={() => onOpenChange(true)}
        className="h-12 w-full justify-start gap-2 rounded-xl px-2 text-control font-act text-muted-foreground hover:text-foreground"
      >
        <Monitor strokeWidth={1.75} className="size-5" aria-hidden />
        {HANDOFF_TITLE}
      </Button>
      <Drawer open={open} onOpenChange={onOpenChange}>
        <DrawerContent className="max-h-[82dvh]">
          <div className="min-h-0 flex-1 overflow-y-auto pb-2">
            <DrawerHeader className="items-start text-left">
              <span className="mb-2 flex size-12 items-center justify-center rounded-panel bg-surface-raised text-muted-foreground">
                <Monitor strokeWidth={1.75} className="size-6" aria-hidden />
              </span>
              <DrawerTitle className="font-heading text-title! font-normal!">
                {HANDOFF_TITLE}
              </DrawerTitle>
            </DrawerHeader>
            <div className="px-4">
              {/* text-body needs the ! here: cn drops it next to a colour
                  class and the stock 14 px comes back */}
              <DrawerDescription className="text-body! font-read text-muted-foreground">
                {login
                  ? `Your projects are saved to your account. Open this link on a computer and sign in with GitHub as @${login}: this project is in your list there.`
                  : "This project is saved on this phone only. Sign in with GitHub to keep it in your account, then open this link on a computer and sign in there too."}
              </DrawerDescription>
              {!login && (
                <BrandButton
                  className="mt-4 h-12 w-full"
                  disabled={signingIn}
                  onClick={onSignIn}
                >
                  Sign in with GitHub
                </BrandButton>
              )}
              <p
                data-testid="handoff-link"
                className="mt-4 rounded-control border border-border bg-surface-well px-3 py-3 font-mono text-code wrap-anywhere text-foreground select-all"
              >
                <Wrapped link={link} />
              </p>
              <div className="mt-2 flex gap-2">
                <Button
                  variant="secondary"
                  className="h-12 flex-1 gap-2"
                  onClick={copy}
                >
                  {copied ? (
                    <Check
                      strokeWidth={2}
                      className="size-4 text-success"
                      aria-hidden
                    />
                  ) : (
                    <Copy strokeWidth={1.75} className="size-4" aria-hidden />
                  )}
                  {/* Announced as it changes, so a screen reader hears it worked */}
                  <span aria-live="polite">
                    {copied ? "Copied" : "Copy link"}
                  </span>
                </Button>
                {canShare && (
                  <Button
                    variant="secondary"
                    className="h-12 flex-1 gap-2"
                    onClick={() => void onShare()}
                  >
                    <Share strokeWidth={1.75} className="size-4" aria-hidden />
                    Share
                  </Button>
                )}
              </div>
            </div>
          </div>
          <DrawerFooter className="shrink-0 pb-[calc(1rem+env(safe-area-inset-bottom,0px))]">
            <Button
              variant="secondary"
              className="h-14"
              onClick={() => onOpenChange(false)}
            >
              Stay on the phone
            </Button>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
    </>
  );
};

export default BaseHandoff;
