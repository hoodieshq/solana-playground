import type { Level } from "./severity";

export type { Level } from "./severity";

/** `<slice>:<module>`, such as `persistence:sync` */
export type Namespace = `${string}:${string}`;

export interface LogEntry {
  ns: Namespace;
  level: Level;
  message?: string;
  error?: Error;
  context?: Record<string, unknown>;
  /** Reaches error tracking, as decided by `isReported` */
  report: boolean;
  /** Came from a global handler, not from a `catch` */
  unhandled: boolean;
}

export interface LogProvider {
  log(entry: LogEntry): void;
  /**
   * `false` skips the reports `initLogger` delivers from before it: the
   * console printed them as they were made
   */
  replay?: boolean;
}

export interface LogOptions {
  /** Overrides the logger's namespace for this entry */
  ns?: Namespace;
  /** Send an `error` or `warn` entry to error tracking */
  report?: boolean;
  context?: Record<string, unknown>;
}
