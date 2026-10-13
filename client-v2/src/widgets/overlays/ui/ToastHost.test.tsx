import { act, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { toast } from "sonner";

import {
  initLogger,
  memoryProvider as logMemory,
  resetLogger,
} from "@/shared/lib/logger";
import {
  initTelemetry,
  memoryProvider,
  resetTelemetry,
} from "@/shared/lib/telemetry";
import { PgCommon } from "@/utils/common";
import { PgView } from "@/utils/view";
import type { ToastChildProps } from "@/utils/view";
import { ToastHost } from "./ToastHost";

let sent: ReturnType<typeof memoryProvider>;
let logs: ReturnType<typeof logMemory>;
beforeEach(() => {
  vi.useFakeTimers();
  // jsdom has no matchMedia, which the host's width check listens on
  Object.defineProperty(window, "matchMedia", {
    configurable: true,
    value: () => ({
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }),
  });
  sent = memoryProvider();
  initTelemetry({ providers: [sent] });
  logs = logMemory();
  initLogger({ providers: [logs] });
});
afterEach(() => {
  act(() => {
    toast.dismiss();
    vi.advanceTimersByTime(1000);
  });
  vi.useRealTimers();
  vi.restoreAllMocks();
  resetTelemetry();
  resetLogger();
});

const Message = ({ id }: ToastChildProps) => <span>message {String(id)}</span>;

const show = (options: Parameters<typeof PgView.setToast>[1]["options"]) => {
  act(() => {
    PgView.setToast(Message, { options });
  });
  // Sonner mounts a toast on the next tick
  act(() => {
    vi.advanceTimersByTime(50);
  });
};

it("should show the component with the toast's id in its props", () => {
  render(<ToastHost />);

  show({ name: "demo", id: "demo-id" });

  expect(screen.getByText("message demo-id")).toBeTruthy();
});

it("should keep a persistent toast past any timeout", () => {
  render(<ToastHost />);
  show({ name: "demo", id: "p", duration: "persistent" });

  act(() => {
    vi.advanceTimersByTime(10_000);
  });

  expect(screen.getByText("message p")).toBeTruthy();
});

it("should remove the toast after 5000 ms by default", () => {
  render(<ToastHost />);
  show({ name: "demo", id: "d" });

  act(() => {
    vi.advanceTimersByTime(4000);
  });
  expect(screen.getByText("message d")).toBeTruthy();

  act(() => {
    vi.advanceTimersByTime(2000);
  });
  expect(screen.queryByText("message d")).toBeNull();
});

it("should remove the toast when it is closed by id", () => {
  render(<ToastHost />);
  show({ name: "demo", id: "c", duration: "persistent" });

  act(() => {
    PgView.closeToast("c");
  });
  // Sonner dismisses on a frame, then removes after the exit animation; each
  // step needs a render of its own
  act(() => {
    vi.advanceTimersByTime(50);
  });
  act(() => {
    vi.advanceTimersByTime(1000);
  });

  expect(screen.queryByText("message c")).toBeNull();
});

it("should send overlay_toast_shown with the toast's name", () => {
  render(<ToastHost />);

  show({ name: "cluster-unreachable", id: "t" });

  expect(
    sent.events
      .filter((event) => event.name === "overlay_toast_shown")
      .map((event) => event.params)
  ).toEqual([{ name: "cluster-unreachable" }]);
});

it("should still show a raw event with no options, and warn", () => {
  render(<ToastHost />);

  act(() => {
    document.dispatchEvent(
      new CustomEvent(PgView.events.TOAST_SET, {
        detail: {
          elementable: "div",
          props: { componentProps: { children: "raw" } },
        },
      })
    );
  });
  act(() => {
    vi.advanceTimersByTime(50);
  });

  expect(screen.getByText("raw")).toBeTruthy();
  expect(
    logs.entries.map((entry) => ({ ns: entry.ns, level: entry.level }))
  ).toEqual([{ ns: "overlays:toast-host", level: "warn" }]);
  expect(
    sent.events.filter((event) => event.name === "overlay_toast_shown")
  ).toHaveLength(1);
});

const offsetLeft = () =>
  document
    .querySelector<HTMLElement>("[data-sonner-toaster]")!
    .style.getPropertyValue("--offset-left");

it("should keep clear of the rail on a wide window", () => {
  vi.spyOn(window, "innerWidth", "get").mockReturnValue(1280);
  render(<ToastHost />);
  // Sonner draws its list once there is a toast
  show({ name: "demo", id: "o", duration: "persistent" });

  expect(offsetLeft()).toBe("calc(3.25rem + 1rem)");
});

it("should not reserve the rail below 768 px, where the panel is a Sheet", () => {
  vi.spyOn(window, "innerWidth", "get").mockReturnValue(700);
  render(<ToastHost />);
  // Sonner draws its list once there is a toast
  show({ name: "demo", id: "o", duration: "persistent" });

  expect(offsetLeft()).toBe("1rem");
});

it("should keep two toasts with no id apart, whatever the random draw", () => {
  // A random int in 0..4096 as the id could draw the same number twice and
  // silently replace a live toast
  vi.spyOn(PgCommon, "generateRandomInt").mockReturnValue(7);
  vi.spyOn(Math, "random").mockReturnValue(0.5);
  render(<ToastHost />);

  show({ name: "first", duration: "persistent" });
  show({ name: "second", duration: "persistent" });

  expect(screen.getAllByText(/^message /)).toHaveLength(2);
});

it("should report a toast that cannot be built, and not throw from the event", () => {
  render(<ToastHost />);
  vi.spyOn(PgView, "normalizeElement").mockImplementation(() => {
    throw new Error("cannot build");
  });

  act(() => {
    PgView.setToast(Message, { options: { name: "cluster-unreachable" } });
  });
  act(() => {
    vi.advanceTimersByTime(50);
  });

  expect(
    logs.entries.map((entry) => ({
      ns: entry.ns,
      level: entry.level,
      report: entry.report,
      context: entry.context,
    }))
  ).toEqual([
    {
      ns: "overlays:toast-host",
      level: "error",
      report: true,
      context: { name: "cluster-unreachable" },
    },
  ]);
  expect(
    sent.events.filter((event) => event.name === "overlay_toast_shown")
  ).toHaveLength(0);
});

const toasterTheme = () =>
  document
    .querySelector("[data-sonner-toaster]")!
    .getAttribute("data-sonner-theme");

describe("the toaster's theme", () => {
  afterEach(() => document.documentElement.classList.remove("dark"));

  it("should be dark when the app is in a dark theme", () => {
    document.documentElement.classList.add("dark");
    render(<ToastHost />);
    show({ name: "demo", id: "t", duration: "persistent" });

    expect(toasterTheme()).toBe("dark");
  });

  it("should be light when the app is in a light theme", () => {
    render(<ToastHost />);
    show({ name: "demo", id: "t", duration: "persistent" });

    expect(toasterTheme()).toBe("light");
  });

  it("should follow the app when the theme changes", async () => {
    render(<ToastHost />);
    show({ name: "demo", id: "t", duration: "persistent" });

    await act(async () => {
      document.documentElement.classList.add("dark");
      // A MutationObserver reports in a microtask
      await Promise.resolve();
    });

    expect(toasterTheme()).toBe("dark");
  });
});
