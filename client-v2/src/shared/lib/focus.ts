const TEXT_INPUT_TYPES = new Set([
  "",
  "text",
  "search",
  "url",
  "email",
  "password",
  "number",
  "tel",
]);

/**
 * Whether the user is typing in a field outside `within`. Something that
 * would take focus on its own (the editor opening a file after a late
 * mount) leaves it where it is in that case.
 */
export const isTypingElsewhere = (active: Element | null, within: Element) => {
  if (!active || within.contains(active)) return false;
  if (active instanceof HTMLInputElement) {
    return TEXT_INPUT_TYPES.has(active.type);
  }
  if (
    active instanceof HTMLTextAreaElement ||
    active instanceof HTMLSelectElement
  ) {
    return true;
  }
  // `=== true`: jsdom leaves `isContentEditable` undefined.
  return active instanceof HTMLElement && active.isContentEditable === true;
};
