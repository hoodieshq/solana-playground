import { useEffect, useState } from "react";
import type { ReactNode } from "react";

import { createLogger } from "@/shared/lib/logger";
import { PROJECT_NAME } from "@/constants";
import { PgView } from "@/utils/view";
import { overlayTelemetry } from "../model/telemetry";
import { BaseModalFrame } from "./BaseModalFrame";
import { useIsTopModal } from "./modal-layer";

const log = createLogger("overlays:modal-host");

export type ModalSubmit = {
  /** Button label */
  text: string;
  /** What the button does; without it the button only closes the dialog */
  onSubmit?: () => unknown | Promise<unknown>;
  /** Keep the dialog open after a successful submit */
  noCloseOnSubmit?: boolean;
  disabled?: boolean;
  variant?: "default" | "destructive";
};

export type ModalFrameProps = {
  /** Telemetry name, kebab-case, never user content */
  name: string;
  /** The heading; `true` is the product's name */
  title?: string | true;
  buttonProps?: ModalSubmit;
  size?: "default" | "wide";
  children?: ReactNode;
};

/** The message to show for whatever a submit threw */
const messageOf = (error: unknown) => {
  if (error instanceof Error) return error.message;
  if (typeof error === "string" && error) return error;
  return "Unknown error";
};

/**
 * The frame of a dialog opened with `PgView.setModal`. A submit closes the
 * dialog with what it returned; a submit that throws keeps it open and shows
 * the message.
 */
export const ModalFrame = ({
  name,
  title,
  buttonProps,
  size = "default",
  children,
}: ModalFrameProps) => {
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const isTop = useIsTopModal();

  useEffect(() => {
    overlayTelemetry.track("overlay_modal_opened", { name });
  }, [name]);

  const submit = async () => {
    if (!buttonProps || buttonProps.disabled || busy) return;
    setBusy(true);
    try {
      const data = await buttonProps.onSubmit?.();
      if (!buttonProps.noCloseOnSubmit) PgView.closeModal(data);
    } catch (e) {
      // The user reads the message in the dialog; the team hears of it so a
      // pattern of failing dialogs shows up
      setError(messageOf(e));
      overlayTelemetry.track("overlay_modal_submit_failed", { name });
      log.error(e, { report: true, context: { name } });
    } finally {
      setBusy(false);
    }
  };

  // Under another dialog: keep the body mounted, so it keeps its state, but
  // draw no second dialog content
  if (!isTop) return <div hidden>{children}</div>;

  return (
    <BaseModalFrame
      title={title === true || !title ? PROJECT_NAME : title}
      hideTitle={!title}
      error={error}
      submit={
        buttonProps && {
          text: buttonProps.text,
          disabled: buttonProps.disabled ?? false,
          busy,
          variant: buttonProps.variant ?? "default",
        }
      }
      onCancel={
        buttonProps?.onSubmit ? () => PgView.closeModal(null) : undefined
      }
      onSubmit={submit}
      size={size}
    >
      {children}
    </BaseModalFrame>
  );
};
