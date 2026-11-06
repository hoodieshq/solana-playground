import {
  act,
  cleanup,
  fireEvent,
  render,
  waitFor,
} from "@testing-library/react";
import * as React from "react";
import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";

import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "./context-menu";
import { Dialog, DialogContent, DialogTitle } from "./dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "./dropdown-menu";
import { Modal, ModalContent, ModalTitle } from "./modal";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./select";
import { Sheet, SheetContent, SheetTitle } from "./sheet";

/* Radix hides the rest of the page (`aria-hidden`) in its first effect and
   moves focus into the overlay only a render later. Focus left behind in the
   editor then sits inside the hidden part, and Chrome refuses the attribute
   ("Blocked aria-hidden on an element because its descendant retained
   focus"). jsdom does not refuse it, so the test records where focus was at
   the moment each `aria-hidden` was set. */
describe("overlays release focus before hiding the page", () => {
  let focusedInsideHidden: Element[] = [];

  beforeEach(() => {
    focusedInsideHidden = [];
    const setAttribute = Element.prototype.setAttribute;
    vi.spyOn(Element.prototype, "setAttribute").mockImplementation(function (
      this: Element,
      name: string,
      value: string
    ) {
      const active = document.activeElement;
      if (
        name === "aria-hidden" &&
        active &&
        active !== document.body &&
        this.contains(active)
      ) {
        focusedInsideHidden.push(active);
      }
      return setAttribute.call(this, name, value);
    });
  });

  // Radix Select scrolls its selected item into view, which jsdom lacks
  beforeAll(() => {
    Element.prototype.scrollIntoView = () => {};
  });

  afterAll(() => {
    // @ts-expect-error -- jsdom has no scrollIntoView; the stub is removed
    delete Element.prototype.scrollIntoView;
  });

  afterEach(() => {
    vi.restoreAllMocks();
    cleanup();
  });

  /** Whether the page behind the overlay, editor included, is hidden. */
  const isEditorHidden = () =>
    document
      .querySelector("#center textarea")
      ?.closest('[aria-hidden="true"]') !== null;

  /** The editor stand-in: a focused textarea in its own column. */
  const Page = ({ children }: { children: React.ReactNode }) => (
    <>
      <div id="center">
        <textarea aria-label="editor" />
      </div>
      {children}
    </>
  );

  const openWithEditorFocused = (
    overlay: (open: boolean) => React.ReactNode
  ) => {
    const { rerender, getByLabelText } = render(<Page>{overlay(false)}</Page>);
    const editor = getByLabelText("editor");
    editor.focus();
    expect(document.activeElement).toBe(editor);
    act(() => {
      rerender(<Page>{overlay(true)}</Page>);
    });
  };

  it("Modal (Settings)", () => {
    openWithEditorFocused((open) => (
      <Modal open={open}>
        <ModalContent aria-describedby={undefined}>
          <ModalTitle>Settings</ModalTitle>
        </ModalContent>
      </Modal>
    ));
    expect(isEditorHidden()).toBe(true);
    expect(focusedInsideHidden).toEqual([]);
  });

  it("Dialog", () => {
    openWithEditorFocused((open) => (
      <Dialog open={open}>
        <DialogContent aria-describedby={undefined}>
          <DialogTitle>Title</DialogTitle>
        </DialogContent>
      </Dialog>
    ));
    expect(isEditorHidden()).toBe(true);
    expect(focusedInsideHidden).toEqual([]);
  });

  it("Sheet", () => {
    openWithEditorFocused((open) => (
      <Sheet open={open}>
        <SheetContent aria-describedby={undefined}>
          <SheetTitle>Title</SheetTitle>
        </SheetContent>
      </Sheet>
    ));
    expect(isEditorHidden()).toBe(true);
    expect(focusedInsideHidden).toEqual([]);
  });

  it("DropdownMenu (the account menu)", () => {
    openWithEditorFocused((open) => (
      <DropdownMenu open={open}>
        <DropdownMenuTrigger>Account</DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuItem>Sign out</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    ));
    expect(isEditorHidden()).toBe(true);
    expect(focusedInsideHidden).toEqual([]);
  });

  it("Select", () => {
    openWithEditorFocused((open) => (
      <Select open={open} value="a">
        <SelectTrigger aria-label="pick">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="a">A</SelectItem>
        </SelectContent>
      </Select>
    ));
    expect(isEditorHidden()).toBe(true);
    expect(focusedInsideHidden).toEqual([]);
  });

  it("ContextMenu", () => {
    const { getByLabelText, getByText } = render(
      <Page>
        <ContextMenu>
          <ContextMenuTrigger>Explorer row</ContextMenuTrigger>
          <ContextMenuContent>
            <ContextMenuItem>Rename</ContextMenuItem>
          </ContextMenuContent>
        </ContextMenu>
      </Page>
    );
    getByLabelText("editor").focus();
    act(() => {
      fireEvent.contextMenu(getByText("Explorer row"));
    });
    expect(isEditorHidden()).toBe(true);
    expect(focusedInsideHidden).toEqual([]);
  });

  it("ContextMenu gives focus back to the editor on close", async () => {
    const { getByLabelText, getByText, getByRole } = render(
      <Page>
        <ContextMenu>
          <ContextMenuTrigger>Explorer row</ContextMenuTrigger>
          <ContextMenuContent>
            <ContextMenuItem>Rename</ContextMenuItem>
          </ContextMenuContent>
        </ContextMenu>
      </Page>
    );
    const editor = getByLabelText("editor");
    editor.focus();
    act(() => {
      fireEvent.contextMenu(getByText("Explorer row"));
    });
    act(() => {
      fireEvent.keyDown(getByRole("menu"), { key: "Escape" });
    });
    await waitFor(() => expect(document.activeElement).toBe(editor));
  });
});
