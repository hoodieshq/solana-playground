import { afterEach, expect, it, vi } from "vitest";

import { applyReadOnly, READ_ONLY_MESSAGE } from "./read-only";
import { PgEditor } from "../../../utils/editor";

const fakeEditor = ({ hasMessageController = true } = {}) => {
  let attempt: () => void = () => {};
  const showMessage = vi.fn();
  const position = { lineNumber: 3, column: 7 };
  return {
    updateOptions: vi.fn(),
    onDidAttemptReadOnlyEdit: vi.fn((fn: () => void) => {
      attempt = fn;
      return { dispose: vi.fn() };
    }),
    getContribution: vi.fn(() =>
      hasMessageController ? { showMessage, dispose: vi.fn() } : null
    ),
    getPosition: vi.fn(() => position),
    attempt: () => attempt(),
    showMessage,
    position,
  };
};

const heard = vi.fn();
afterEach(() => {
  document.removeEventListener(PgEditor.events.READ_ONLY_EDIT, heard);
  heard.mockClear();
});

it("should make the editor read-only", () => {
  const editor = fakeEditor();
  applyReadOnly(editor, true);
  expect(editor.updateOptions).toHaveBeenCalledWith({ readOnly: true });
  expect(READ_ONLY_MESSAGE).toBe("Editing works on screens 600 px and wider");
});

it("should show the message and announce an attempted edit", () => {
  const editor = fakeEditor();
  document.addEventListener(PgEditor.events.READ_ONLY_EDIT, heard);
  applyReadOnly(editor, true);
  editor.attempt();
  expect(editor.showMessage).toHaveBeenCalledWith(
    READ_ONLY_MESSAGE,
    editor.position
  );
  expect(heard).toHaveBeenCalledOnce();
});

it("should still announce an attempted edit without a message controller", () => {
  const editor = fakeEditor({ hasMessageController: false });
  document.addEventListener(PgEditor.events.READ_ONLY_EDIT, heard);
  applyReadOnly(editor, true);
  editor.attempt();
  expect(heard).toHaveBeenCalledOnce();
});

it("should make the editor editable again", () => {
  const editor = fakeEditor();
  applyReadOnly(editor, false);
  expect(editor.updateOptions).toHaveBeenCalledWith({ readOnly: false });
});
