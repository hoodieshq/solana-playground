import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";

import { createLogger } from "@/shared/lib/logger";
import { PROJECT_NAME } from "@/constants";
import { PgView } from "@/utils/view";
import { overlayTelemetry } from "../model/telemetry";
import { BaseModalFrame } from "./BaseModalFrame";
import type { ModalSize } from "./BaseModalFrame";
import { useIsTopModal, useOpenReport } from "./modal-layer";

const log = createLogger("overlays:modal-frame");

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
  size?: ModalSize;
  children?: ReactNode;
};

/** The message to show for whatever a submit threw */
const messageOf = (error: unknown) => {
  if (error instanceof Error) return error.message;
  if (typeof error === "string" && error) return error;
  // `PgCommon.sendAndReceiveCustomEvent` rejects with a bare `{ message }`
  if (
    typeof error === "object" &&
    error !== null &&
    "message" in error &&
    typeof error.message === "string" &&
    error.message
  ) {
    return error.message;
  }
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
  // `busy` lags a render behind, so two Enters in one tick both saw it false
  const submitting = useRef(false);
  const isTop = useIsTopModal();
  const openReport = useOpenReport();

  // StrictMode runs an effect twice on mount and keeps refs across the pair,
  // so the name last reported here is what keeps the dev server's count at one
  const reportedName = useRef<string | null>(null);
  useEffect(() => {
    // Inside `ModalPages` the dialog is reported once for all its pages
    if (openReport) {
      openReport(name);
      return;
    }
    if (reportedName.current === name) return;
    reportedName.current = name;
    overlayTelemetry.track("overlay_modal_opened", { name });
  }, [name, openReport]);

  const submit = async () => {
    if (!buttonProps || buttonProps.disabled || submitting.current) return;
    submitting.current = true;
    setBusy(true);
    // A retry that succeeds must not keep the last attempt's message
    setError("");
    try {
      const data = await buttonProps.onSubmit?.();
      if (!buttonProps.noCloseOnSubmit) PgView.closeModal(data);
    } catch (e) {
      // The user reads the message in the dialog; the team hears of it so a
      // pattern of failing dialogs shows up. Logged before the event is sent,
      // so a tracker that throws cannot lose the report.
      setError(messageOf(e));
      log.error(e, { report: true, context: { name } });
      try {
        overlayTelemetry.track("overlay_modal_submit_failed", { name });
      } catch (trackError) {
        log.error(trackError, { report: true, context: { name } });
      }
    } finally {
      submitting.current = false;
      setBusy(false);
    }
  };

  // Under another dialog: draw no second dialog content. Only the state held
  // above this frame survives; the frame's subtree remounts when it is on
  // top again (see `ModalLayerContext`)
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
