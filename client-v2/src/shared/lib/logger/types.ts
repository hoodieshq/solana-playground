/** Most severe first; a threshold lets through its own level and those before it */
export const LEVELS = ["panic", "error", "warn", "info", "debug"] as const;

export type Level = typeof LEVELS[number];

export const isLevel = (value: unknown): value is Level =>
  LEVELS.includes(value as Level);

/** `<slice>:<module>`, such as `persistence:sync` */
export type Namespace = `${string}:${string}`;

export interface LogEntry {
  ns: Namespace;
  level: Level;
  message?: string;
  error?: Error;
  context?: Record<string, unknown>;
  /** Asked to reach error tracking; always true for `panic` */
  report: boolean;
  /** Came from a global handler, not from a `catch` */
  unhandled: boolean;
}

export interface LogProvider {
  log(entry: LogEntry): void;
}

export interface LogOptions {
  /** Overrides the logger's namespace for this entry */
  ns?: Namespace;
  /** Send an `error` or `warn` entry to error tracking */
  report?: boolean;
  context?: Record<string, unknown>;
}
