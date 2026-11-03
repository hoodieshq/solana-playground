import { createLogger } from "./logger";

const log = createLogger("logger:global");

const shown = new WeakSet<object>();

/**
 * Marks a failure the user was already shown, such as the terminal's "Process
 * error" line for an unknown command or a declined wallet question: an
 * expected outcome, so if nothing catches it the global handler leaves a
 * breadcrumb instead of a report. A thrown primitive cannot be marked.
 */
export const markShown = (error: unknown) => {
  if (typeof error === "object" && error !== null) shown.add(error);
};

const summary = (reason: object) =>
  reason instanceof Error
    ? `${reason.name}: ${reason.message}`
    : String(reason);

/**
 * Sends uncaught errors and unhandled rejections to `panic`, except a rejection
 * marked with `markShown`, which is logged at `warn`; returns the uninstaller
 */
export const installGlobalHandlers = () => {
  // A cross-origin script error carries only a message, no `error`
  const onError = (event: ErrorEvent) =>
    log.panic(event.error ?? event.message, { unhandled: true });
  const onRejection = (event: PromiseRejectionEvent) => {
    const { reason } = event;
    if (typeof reason === "object" && reason !== null && shown.has(reason)) {
      log.warn(`Shown to the user: ${summary(reason)}`);
    } else {
      log.panic(reason, { unhandled: true });
    }
  };

  globalThis.addEventListener("error", onError);
  globalThis.addEventListener("unhandledrejection", onRejection);
  return () => {
    globalThis.removeEventListener("error", onError);
    globalThis.removeEventListener("unhandledrejection", onRejection);
  };
};
