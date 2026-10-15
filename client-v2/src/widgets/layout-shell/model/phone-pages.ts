import type { Stage } from "@/views/flow/state/stage";

export type PhonePage = "menu" | "work" | "preview";
export const PHONE_PAGES: readonly PhonePage[] = ["menu", "work", "preview"];
export type WorkView = "chat" | "code";
export type PageSource = "swipe" | "button" | "auto";
export type PreviewStage = Exclude<Stage, "write">;

/**
 * The stage is one: Code shows it at `write`, the preview at any other. A
 * stage set from elsewhere (a key, a deploy, the stepper's Write tab) moves
 * the pager to the page that shows it, so no page is left without its stage.
 * The menu shows no stage, so `write` leaves it where it is.
 */
export const pageForStage = (
  stage: Stage,
  page: PhonePage
): PhonePage | null => {
  if (stage === "write") return page === "preview" ? "work" : null;
  return page === "preview" ? null : "preview";
};

/** The stage a page sets when it comes into view */
export const stageForPage = (
  page: PhonePage,
  stage: Stage,
  lastPreview: PreviewStage
): Stage | null => {
  if (page === "work") return stage === "write" ? null : "write";
  if (page === "preview") return stage === "write" ? lastPreview : null;
  return null;
};
