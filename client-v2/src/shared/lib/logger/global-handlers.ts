import { createLogger } from "./logger";

const log = createLogger("logger:global");

/** Sends uncaught errors and unhandled rejections to `panic`; returns the uninstaller */
export const installGlobalHandlers = () => {
  // A cross-origin script error carries only a message, no `error`
  const onError = (event: ErrorEvent) =>
    log.panic(event.error ?? event.message, { unhandled: true });
  const onRejection = (event: PromiseRejectionEvent) =>
    log.panic(event.reason, { unhandled: true });

  window.addEventListener("error", onError);
  window.addEventListener("unhandledrejection", onRejection);
  return () => {
    window.removeEventListener("error", onError);
    window.removeEventListener("unhandledrejection", onRejection);
  };
};
