import { fireEvent, render, screen } from "@testing-library/react";
import { expect, it, vi } from "vitest";

import { Modal } from "@/shared/ui/modal";
import { BaseModalFrame } from "./BaseModalFrame";
import type { BaseModalFrameProps } from "./BaseModalFrame";

const submit = {
  text: "Rename",
  disabled: false,
  busy: false,
  variant: "default" as const,
};

const renderFrame = (props: Partial<BaseModalFrameProps> = {}) =>
  render(
    <Modal open>
      <BaseModalFrame
        title={props.title ?? "Rename"}
        hideTitle={props.hideTitle ?? false}
        error={props.error ?? ""}
        submit={props.submit}
        onCancel={props.onCancel}
        onSubmit={props.onSubmit ?? vi.fn()}
        size={props.size ?? "default"}
      >
        {props.children}
      </BaseModalFrame>
    </Modal>
  );

it("should show the title as the dialog's heading and name", () => {
  renderFrame({ title: "Rename file" });

  expect(screen.getByRole("heading", { name: "Rename file" })).toBeTruthy();
  expect(screen.getByRole("dialog", { name: "Rename file" })).toBeTruthy();
});

it("should show the error", () => {
  renderFrame({ error: "File already exists" });

  expect(screen.getByText("File already exists")).toBeTruthy();
});

it("should submit once when Enter is pressed in an input", () => {
  const onSubmit = vi.fn();
  renderFrame({ submit, onSubmit, children: <input aria-label="Name" /> });

  const button = screen.getByRole("button", {
    name: "Rename",
  }) as HTMLButtonElement;
  expect(button.getAttribute("type")).toBe("submit");
  fireEvent.keyDown(screen.getByRole("textbox", { name: "Name" }), {
    key: "Enter",
  });

  expect(onSubmit).toHaveBeenCalledTimes(1);
});

it("should not submit on Enter while the submit is disabled", () => {
  const onSubmit = vi.fn();
  renderFrame({
    submit: {
      text: submit.text,
      disabled: true,
      busy: false,
      variant: submit.variant,
    },
    onSubmit,
    children: <input aria-label="Name" />,
  });

  fireEvent.keyDown(screen.getByRole("textbox", { name: "Name" }), {
    key: "Enter",
  });

  expect(onSubmit).not.toHaveBeenCalled();
});

it("should leave an Enter its input handled alone", () => {
  const onSubmit = vi.fn();
  renderFrame({
    submit,
    onSubmit,
    children: (
      <input aria-label="Name" onKeyDown={(ev) => ev.preventDefault()} />
    ),
  });

  fireEvent.keyDown(screen.getByRole("textbox", { name: "Name" }), {
    key: "Enter",
  });

  expect(onSubmit).not.toHaveBeenCalled();
});

it("should not submit when a button in the body without a type is clicked", () => {
  const onSubmit = vi.fn();
  const onClick = vi.fn();
  renderFrame({
    submit,
    onSubmit,
    // Legacy buttons render a bare `<button>`, which submits its form
    children: <button onClick={onClick}>Copy</button>,
  });

  fireEvent.click(screen.getByRole("button", { name: "Copy" }));

  expect(onClick).toHaveBeenCalledTimes(1);
  expect(onSubmit).not.toHaveBeenCalled();
});

it("should submit once when the button is clicked", () => {
  const onSubmit = vi.fn();
  renderFrame({ submit, onSubmit });

  fireEvent.click(screen.getByRole("button", { name: "Rename" }));

  expect(onSubmit).toHaveBeenCalledTimes(1);
});

it("should show a Cancel button that calls onCancel", () => {
  const onCancel = vi.fn();
  renderFrame({ submit, onCancel });

  fireEvent.click(screen.getByRole("button", { name: "Cancel" }));

  expect(onCancel).toHaveBeenCalledTimes(1);
});

it("should show no Cancel button without onCancel", () => {
  renderFrame({ submit });

  expect(screen.queryByRole("button", { name: "Cancel" })).toBeNull();
});

it("should disable the submit while busy", () => {
  renderFrame({
    submit: {
      text: submit.text,
      disabled: false,
      busy: true,
      variant: submit.variant,
    },
  });

  expect(
    (screen.getByRole("button", { name: /Rename/ }) as HTMLButtonElement)
      .disabled
  ).toBe(true);
});

it("should keep an accessible name and show no heading when the title is hidden", () => {
  renderFrame({ title: "Solana Playground", hideTitle: true });

  expect(
    screen.getByRole("dialog", { name: "Solana Playground" })
  ).toBeTruthy();
  expect(
    screen
      .getByRole("heading", { name: "Solana Playground" })
      .classList.contains("sr-only")
  ).toBe(true);
});

it("should focus the submit on open when the body has no input, so Enter presses it", () => {
  renderFrame({ submit, children: <p>Delete the file?</p> });

  expect(document.activeElement).toBe(
    screen.getByRole("button", { name: "Rename" })
  );
});

it("should focus the body's first input on open", () => {
  renderFrame({
    submit,
    children: (
      <>
        <input type="hidden" />
        <input aria-label="Name" />
      </>
    ),
  });

  expect(document.activeElement).toBe(
    screen.getByRole("textbox", { name: "Name" })
  );
});

/** A press: Radix settles an outside press on the click that follows it */
const pressOutside = (el: HTMLElement) => {
  fireEvent.pointerDown(el);
  fireEvent.click(el);
};

const renderOpen = (onOpenChange: (open: boolean) => void) =>
  render(
    <>
      <div data-sonner-toaster="true">
        <button type="button">toast close</button>
      </div>
      <button type="button">page</button>
      <Modal open onOpenChange={onOpenChange}>
        <BaseModalFrame
          title="Rename"
          hideTitle={false}
          error=""
          onSubmit={vi.fn()}
          size="default"
        />
      </Modal>
    </>
  );

it("should stay open when a toast is clicked", async () => {
  const onOpenChange = vi.fn();
  renderOpen(onOpenChange);
  // Radix listens for outside clicks from the next tick
  await new Promise((resolve) => setTimeout(resolve, 0));

  pressOutside(screen.getByText("toast close"));

  expect(onOpenChange).not.toHaveBeenCalled();
});

it("should close when the page outside is clicked", async () => {
  const onOpenChange = vi.fn();
  renderOpen(onOpenChange);
  // Radix listens for outside clicks from the next tick
  await new Promise((resolve) => setTimeout(resolve, 0));

  pressOutside(screen.getByText("page"));

  expect(onOpenChange).toHaveBeenCalledWith(false);
});
