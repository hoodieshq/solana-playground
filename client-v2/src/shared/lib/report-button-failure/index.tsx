import { createLogger } from "@/shared/lib/logger";
import { PgView } from "@/utils/view";

const log = createLogger("ui:button");

/** The failed-click toast's telemetry name and id: one id, so a repeat replaces */
export const BUTTON_FAILED_TOAST = "button-failed";

/** How many shown strings are remembered; a thrown string is rare */
const SHOWN_STRINGS_CAP = 20;

const shownObjects = new WeakSet<object>();
const shownStrings: unknown[] = [];

/**
 * Mark a failure as already shown to the user, so `reportButtonFailure` logs
 * it without a toast. `PgTerminal.process` calls it for every failure its
 * terminal printed.
 *
 * Objects are matched by identity. A thrown primitive (`Send` throws the
 * transaction's error string) can only be matched by value; the newest
 * `SHOWN_STRINGS_CAP` are kept.
 */
export const markFailureShown = (error: unknown): void => {
  if (typeof error === "object" && error !== null) {
    shownObjects.add(error);
    return;
  }
  shownStrings.push(error);
  if (shownStrings.length > SHOWN_STRINGS_CAP) shownStrings.shift();
};

/** Whether `markFailureShown` was called with this failure */
export const wasFailureShown = (error: unknown): boolean =>
  typeof error === "object" && error !== null
    ? shownObjects.has(error)
    : shownStrings.includes(error);

/**
 * Where a failed click goes: the `onError` of `AsyncButton` and
 * `CopyButton`, and the catch of a click path that is not one of them (such
 * as `ImportButton` and Chat's send).
 *
 * The returned handler logs the failure under `ui:button`, not marked for
 * reporting (which failures reach error tracking is decided in HOO-1800),
 * and tells the user "Could not <action>." in a toast. The raw error never
 * reaches the screen. A failure already shown, such as one the terminal
 * printed, is only logged: the user hears of a failure once.
 *
 * @param action what did not happen, completing "Could not …", such as
 * "export the project"
 * @returns the handler for the failure
 */
export const reportButtonFailure =
  (action: string) =>
  (error: unknown): void => {
    log.error(error);
    if (wasFailureShown(error)) return;
    PgView.setToast(() => <span>Could not {action}.</span>, {
      options: { name: BUTTON_FAILED_TOAST, id: BUTTON_FAILED_TOAST },
    });
  };
