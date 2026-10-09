import type { LogProvider } from "../types";

/**
 * Stands in for `./sentry` in a build without `REACT_APP_SENTRY_DSN`, so the
 * Sentry SDK stays out of the bundle; craco.config.js makes the swap.
 */
export const sentryProvider = (): LogProvider => ({ log: () => {} });
