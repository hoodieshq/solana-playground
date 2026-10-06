// The only module that imports the Sentry SDK: everything else reports through the logger
import * as Sentry from "@sentry/react";

import type { Level, LogEntry, LogProvider } from "../types";

const SEVERITY: Record<Level, Sentry.SeverityLevel> = {
  panic: "fatal",
  error: "error",
  warn: "warning",
  info: "info",
  debug: "debug",
};

const isReported = ({ level, report }: LogEntry) =>
  level === "panic" || ((level === "error" || level === "warn") && report);

const capture = (entry: LogEntry) =>
  Sentry.withScope((scope) => {
    scope.setLevel(SEVERITY[entry.level]);
    // Sentry titles an exception by its own message, so the tag is what tells slices apart
    scope.setTag("ns", entry.ns);
    if (entry.context) scope.setExtras(entry.context);

    if (entry.error) {
      Sentry.captureException(
        entry.error,
        entry.unhandled
          ? { mechanism: { handled: false, type: "auto.logger.global" } }
          : undefined
      );
    } else {
      Sentry.captureMessage(`[${entry.ns}] ${entry.message ?? ""}`);
    }
  });

/**
 * Initialises Sentry and sends `panic` entries, and `error` and `warn` entries
 * logged with `report: true`. Without a DSN it initialises nothing and sends nothing.
 */
export const sentryProvider = ({
  dsn,
  release,
  environment,
}: {
  dsn?: string;
  release?: string;
  environment?: string;
}): LogProvider => {
  if (!dsn) return { log: () => {} };

  Sentry.init({
    dsn,
    release,
    environment,
    // The logger installs its own global handlers, so every error takes one path
    integrations: (defaults) =>
      defaults.filter((integration) => integration.name !== "GlobalHandlers"),
  });

  return {
    log: (entry) => {
      if (isReported(entry)) capture(entry);
    },
  };
};
