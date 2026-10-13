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

  // jsdom has no implicit submission on Enter; a browser submits the input's
  // form when that form holds a submit button, which `requestSubmit` does here
  const input = screen.getByRole("textbox", { name: "Name" });
  const button = screen.getByRole("button", {
    name: "Rename",
  }) as HTMLButtonElement;
  expect(button.getAttribute("type")).toBe("submit");
  expect(button.form).toBe(input.closest("form"));
  input.closest("form")!.requestSubmit();

  expect(onSubmit).toHaveBeenCalledTimes(1);
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
