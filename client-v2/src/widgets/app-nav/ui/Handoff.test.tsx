import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";

import {
  initLogger,
  memoryProvider as memoryLogs,
  resetLogger,
} from "@/shared/lib/logger";
import {
  initTelemetry,
  memoryProvider,
  resetTelemetry,
} from "@/shared/lib/telemetry";

// A session the test moves by hand: who is signed in, and its listeners
const session = vi.hoisted(() => {
  const listeners = new Set<() => void>();
  const state: { user: { login: string } | null } = { user: null };
  return {
    get user() {
      return state.user;
    },
    set user(user: { login: string } | null) {
      state.user = user;
    },
    listeners,
    get: vi.fn(() => state.user),
    signIn: vi.fn(() => Promise.resolve()),
    signInState: vi.fn(() => ({ status: "idle" })),
    onDidChange: vi.fn((cb: () => void) => {
      listeners.add(cb);
      return { dispose: () => listeners.delete(cb) };
    }),
  };
});
vi.mock("@/features/auth", () => ({
  PgSession: session,
  isSignInFailure: () => false,
}));

import Handoff from "./Handoff";

let sent: ReturnType<typeof memoryProvider>;
let logged: ReturnType<typeof memoryLogs>;
const writeText = vi.fn();
beforeEach(() => {
  session.user = null;
  sent = memoryProvider();
  initTelemetry({ providers: [sent] });
  logged = memoryLogs();
  initLogger({ providers: [logged] });
  writeText.mockReset().mockResolvedValue(undefined);
  vi.stubGlobal("navigator", {
    clipboard: { writeText },
    share: vi.fn(),
    userAgent: "test",
  });
  window.history.replaceState(null, "", "/tutorials/hello-solana");
});
afterEach(() => {
  resetTelemetry();
  resetLogger();
  vi.unstubAllGlobals();
  window.history.replaceState(null, "", "/");
});

const names = () => sent.events.map((event) => event.name);

const open = () => {
  render(<Handoff />);
  fireEvent.click(screen.getByTestId("handoff-open"));
};

it("gives the app's address and the current path", () => {
  open();
  expect(screen.getByTestId("handoff-link").textContent).toBe(
    `${window.location.origin}/tutorials/hello-solana`
  );
});

it("counts an opening, signed in or not", () => {
  open();
  expect(sent.events).toEqual([
    expect.objectContaining({
      name: "nav_handoff_opened",
      params: { signedIn: false },
    }),
  ]);
});

it("copies the link and counts it", async () => {
  open();
  await act(async () => {
    fireEvent.click(screen.getByRole("button", { name: "Copy link" }));
  });
  expect(writeText).toHaveBeenCalledWith(
    `${window.location.origin}/tutorials/hello-solana`
  );
  expect(names()).toContain("nav_handoff_link_copied");
});

it("counts a share, and a cancelled one is neither counted nor reported", async () => {
  const share = navigator.share as ReturnType<typeof vi.fn>;
  share.mockRejectedValueOnce(new DOMException("closed", "AbortError"));
  open();
  await act(async () => {
    fireEvent.click(screen.getByRole("button", { name: "Share" }));
  });
  expect(names()).not.toContain("nav_handoff_link_shared");
  expect(logged.entries).toEqual([]);

  share.mockResolvedValueOnce(undefined);
  await act(async () => {
    fireEvent.click(screen.getByRole("button", { name: "Share" }));
  });
  expect(share).toHaveBeenLastCalledWith({
    title: "Continue on a computer",
    url: `${window.location.origin}/tutorials/hello-solana`,
  });
  expect(names()).toContain("nav_handoff_link_shared");
});

it("turns to the signed-in words once the sign-in lands", () => {
  open();
  fireEvent.click(screen.getByRole("button", { name: "Sign in with GitHub" }));
  expect(session.signIn).toHaveBeenCalledTimes(1);
  act(() => {
    session.user = { login: "ada" };
    session.listeners.forEach((cb) => cb());
  });
  expect(screen.getByText(/@ada/)).toBeTruthy();
});
