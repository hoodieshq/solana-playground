import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";

import BaseHandoff from "./BaseHandoff";
import type { BaseHandoffProps } from "./BaseHandoff";

const LINK = "https://beta.solpg.io/tutorials/hello-solana";

const props = (over: Partial<BaseHandoffProps> = {}): BaseHandoffProps => ({
  open: over.open ?? true,
  onOpenChange: over.onOpenChange ?? vi.fn(),
  link: over.link ?? LINK,
  login: over.login === undefined ? "ada" : over.login,
  signingIn: over.signingIn ?? false,
  onSignIn: over.onSignIn ?? vi.fn(),
  canShare: over.canShare ?? true,
  onCopy: over.onCopy ?? vi.fn().mockResolvedValue(true),
  onShare: over.onShare ?? vi.fn().mockResolvedValue(undefined),
});

afterEach(() => {
  vi.useRealTimers();
});

it("opens from the row named Continue on a computer", () => {
  const onOpenChange = vi.fn();
  render(<BaseHandoff {...props({ open: false, onOpenChange })} />);
  fireEvent.click(screen.getByTestId("handoff-open"));
  expect(onOpenChange).toHaveBeenCalledWith(true);
  expect(screen.getByTestId("handoff-open")).toBe(
    screen.getByRole("button", { name: "Continue on a computer" })
  );
});

it("signed in, says the project is in the account and names the login", () => {
  render(<BaseHandoff {...props()} />);
  expect(
    screen.getByRole("dialog", { name: "Continue on a computer" })
  ).toBeTruthy();
  expect(screen.getByText(/saved to your account/)).toBeTruthy();
  expect(screen.getByText(/@ada/)).toBeTruthy();
  expect(
    screen.queryByRole("button", { name: "Sign in with GitHub" })
  ).toBeNull();
});

it("signed out, says the project is on this phone only and offers sign-in", () => {
  const onSignIn = vi.fn();
  render(<BaseHandoff {...props({ login: null, onSignIn })} />);
  expect(screen.getByText(/on this phone only/)).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: "Sign in with GitHub" }));
  expect(onSignIn).toHaveBeenCalledTimes(1);
});

it("shows the whole link in its well", () => {
  render(<BaseHandoff {...props()} />);
  expect(screen.getByTestId("handoff-link").textContent).toBe(LINK);
});

it("reads Copied after a copy, and Copy link again 2 s later", async () => {
  vi.useFakeTimers();
  const onCopy = vi.fn().mockResolvedValue(true);
  render(<BaseHandoff {...props({ onCopy })} />);
  await act(async () => {
    fireEvent.click(screen.getByRole("button", { name: "Copy link" }));
  });
  expect(onCopy).toHaveBeenCalledTimes(1);
  expect(screen.getByRole("button", { name: "Copied" })).toBeTruthy();
  act(() => vi.advanceTimersByTime(2000));
  expect(screen.getByRole("button", { name: "Copy link" })).toBeTruthy();
});

it("never reads Copied when the copy is refused", async () => {
  const onCopy = vi.fn().mockResolvedValue(false);
  render(<BaseHandoff {...props({ onCopy })} />);
  await act(async () => {
    fireEvent.click(screen.getByRole("button", { name: "Copy link" }));
  });
  expect(screen.queryByRole("button", { name: "Copied" })).toBeNull();
});

it("draws Share only where the browser can share", () => {
  const onShare = vi.fn().mockResolvedValue(undefined);
  const { unmount } = render(<BaseHandoff {...props({ onShare })} />);
  fireEvent.click(screen.getByRole("button", { name: "Share" }));
  expect(onShare).toHaveBeenCalledTimes(1);
  unmount();
  render(<BaseHandoff {...props({ canShare: false })} />);
  expect(screen.queryByRole("button", { name: "Share" })).toBeNull();
});

it("closes on Stay on the phone", () => {
  const onOpenChange = vi.fn();
  render(<BaseHandoff {...props({ onOpenChange })} />);
  fireEvent.click(screen.getByRole("button", { name: "Stay on the phone" }));
  expect(onOpenChange).toHaveBeenCalledWith(false);
});
