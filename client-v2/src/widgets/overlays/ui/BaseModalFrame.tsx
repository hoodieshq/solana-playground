import type { ReactNode } from "react";
import { cn } from "cn";

import { Button } from "@/shared/ui/button";
import {
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalTitle,
} from "@/shared/ui/modal";
import { Spinner } from "@/shared/ui/spinner";

export type BaseModalFrameProps = {
  title: string;
  /** Visually hidden when the dialog shows no heading */
  hideTitle: boolean;
  /** Why the last submit failed; empty when it did not */
  error: string;
  submit?: {
    text: string;
    disabled: boolean;
    busy: boolean;
    variant: "default" | "destructive";
  };
  /** Shown as a Cancel button beside the submit when the submit does something */
  onCancel?: () => void;
  onSubmit: () => void;
  size: "default" | "wide";
  children?: ReactNode;
};

/**
 * A dialog's content: its heading, the last error, the body and the buttons.
 * Render it inside a `Modal`. The footer sits in a `<form>` with a
 * `type="submit"` button, so Enter in any input of the body submits.
 */
export const BaseModalFrame = ({
  title,
  hideTitle,
  error,
  submit,
  onCancel,
  onSubmit,
  size,
  children,
}: BaseModalFrameProps) => (
  <ModalContent size={size} aria-describedby={undefined}>
    <form
      className="flex min-h-0 flex-1 flex-col"
      onSubmit={(ev) => {
        ev.preventDefault();
        onSubmit();
      }}
    >
      <ModalHeader>
        <ModalTitle className={cn(hideTitle && "sr-only")}>{title}</ModalTitle>
      </ModalHeader>
      <ModalBody>
        {error && (
          <p role="alert" className="mb-4 text-caption text-destructive">
            {error}
          </p>
        )}
        {children}
      </ModalBody>
      {submit && (
        <ModalFooter>
          {onCancel && (
            <Button type="button" variant="ghost" onClick={onCancel}>
              Cancel
            </Button>
          )}
          <Button
            type="submit"
            variant={submit.variant}
            disabled={submit.disabled || submit.busy}
          >
            {submit.busy && <Spinner />}
            {submit.text}
          </Button>
        </ModalFooter>
      )}
    </form>
  </ModalContent>
);
