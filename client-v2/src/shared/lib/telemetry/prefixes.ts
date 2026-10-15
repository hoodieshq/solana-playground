/** Slice name to the prefix its event names start with; a prefix is never reused */
export const EVENT_PREFIXES = {
  auth: "auth",
  "app-nav": "nav",
  assistant: "assistant",
  feedback: "feedback",
  "layout-shell": "layout",
  observability: "obs",
  overlays: "overlay",
  persistence: "sync",
} as const;

export type EventPrefix = typeof EVENT_PREFIXES[keyof typeof EVENT_PREFIXES];
