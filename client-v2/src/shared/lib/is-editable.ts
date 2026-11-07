/**
 * Whether a key pressed on `target` is typed into something: a field, or
 * an element the user edits in place. A global key that would act on the key
 * there instead of the text leaves it to the field.
 */
export const isEditable = (target: EventTarget | null) =>
  target instanceof Element &&
  target.closest(
    'input, textarea, select, [contenteditable]:not([contenteditable="false"])'
  ) !== null;
