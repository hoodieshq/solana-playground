import { createLogger } from "@/shared/lib/logger";

const log = createLogger("ui:button");

/**
 * Where a failed click goes: the `onError` of `AsyncButton` and
 * `CopyButton`, and the catch of a click path that is not one of them (such
 * as `ImportButton` and Chat's send). The failure is logged under
 * `ui:button` and not marked for reporting: the deleted legacy Button only
 * wrote to the console, and many of these failures are caused by the user or already
 * printed by the terminal command, so they must not reach error tracking.
 */
export const reportButtonFailure = (error: unknown): void => log.error(error);
