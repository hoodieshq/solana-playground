import { useRef } from "react";
import type { KeyboardEvent, ReactNode, SyntheticEvent } from "react";
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
 * Render it inside a `Modal`. Enter in an input of the body submits, and so
 * does the footer's `type="submit"` button.
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
}: BaseModalFrameProps) => {
  const submitRef = useRef<HTMLButtonElement>(null);
  const canSubmit = !!submit && !submit.disabled && !submit.busy;

  const handleSubmit = (ev: SyntheticEvent<HTMLFormElement, SubmitEvent>) => {
    ev.preventDefault();
    // Legacy buttons in a body render a bare `<button>`, which submits the
    // form too; only the footer's button is the dialog's submit
    if (ev.nativeEvent.submitter === submitRef.current && canSubmit) {
      onSubmit();
    }
  };

  const handleKeyDown = (ev: KeyboardEvent<HTMLFormElement>) => {
    if (ev.key !== "Enter" || ev.defaultPrevented) return;
    if (ev.nativeEvent.isComposing) return;
    if (!(ev.target instanceof HTMLInputElement)) return;
    // The browser's own Enter would press the form's first submit button,
    // which can be a bare `<button>` in the body rather than the footer's
    ev.preventDefault();
    if (canSubmit) onSubmit();
  };

  return (
    <ModalContent size={size} aria-describedby={undefined}>
      <form
        className="flex min-h-0 flex-1 flex-col"
        onSubmit={handleSubmit}
        onKeyDown={handleKeyDown}
      >
        <ModalHeader>
          <ModalTitle className={cn(hideTitle && "sr-only")}>
            {title}
          </ModalTitle>
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
              ref={submitRef}
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
};
