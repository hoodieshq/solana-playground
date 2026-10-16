// The legacy Markdown and Loading components reach the utils barrel, which
// reads globals that exist only in the built app; markers stand in for them
vi.mock("../../../components/Markdown", () => ({
  __esModule: true,
  default: ({ children }: { children: string }) => <div>{children}</div>,
}));
vi.mock("../../../components/Loading", () => ({
  SpinnerWithBg: () => <div data-testid="spinner" />,
}));

import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";

import { BaseReader } from "./BaseReader";
import type { BaseReaderProps } from "./BaseReader";

const noop = () => {};

const props = (overrides: Partial<BaseReaderProps>): BaseReaderProps => ({
  title: "Say hello on chain",
  position: "Step 1 of 4",
  criterion: "Verified when the build passes.",
  body: { kind: "none" },
  footer: { label: "Back to the code", onClick: noop },
  onClose: noop,
  ...overrides,
});

describe("BaseReader", () => {
  it("is a non-modal dialog named by the title, rendered in place", () => {
    const { container } = render(<BaseReader {...props({})} />);
    const dialog = screen.getByRole("dialog", { name: "Say hello on chain" });
    expect(dialog.getAttribute("aria-modal")).toBeNull();
    expect(dialog.getAttribute("data-slot")).toBe("dialog-content");
    expect(container.contains(dialog)).toBe(true);
    expect(screen.getByRole("button", { name: "Close the page" })).toBeTruthy();
    expect(dialog.textContent).toContain("Step 1 of 4");
    expect(dialog.textContent).toContain("Verified when the build passes.");
  });

  it("closes on Escape", () => {
    const onClose = vi.fn();
    render(<BaseReader {...props({ onClose })} />);
    fireEvent.keyDown(document.activeElement ?? document.body, {
      key: "Escape",
    });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("takes focus on mount and gives it back on unmount", async () => {
    const outside = document.createElement("button");
    document.body.appendChild(outside);
    outside.focus();
    const { unmount } = render(<BaseReader {...props({})} />);
    const dialog = screen.getByRole("dialog");
    expect(dialog.contains(document.activeElement)).toBe(true);
    unmount();
    // Radix hands focus back on a timer, after the unmount
    await waitFor(() => expect(document.activeElement).toBe(outside));
    outside.remove();
  });

  it("stays open when the pointer goes down outside", () => {
    const onClose = vi.fn();
    const outside = document.createElement("button");
    document.body.appendChild(outside);
    render(<BaseReader {...props({ onClose })} />);
    act(() => {
      fireEvent.pointerDown(outside);
    });
    expect(onClose).not.toHaveBeenCalled();
    outside.remove();
  });

  it("says so when the page failed or there is none", () => {
    const { rerender } = render(
      <BaseReader {...props({ body: { kind: "failed" } })} />
    );
    expect(screen.getByText(/This page could not be loaded\./)).toBeTruthy();
    rerender(<BaseReader {...props({ body: { kind: "none" } })} />);
    expect(screen.getByText("This step has no page to read.")).toBeTruthy();
  });

  it("fires the footer action", () => {
    const onClick = vi.fn();
    render(
      <BaseReader {...props({ footer: { label: "Mark as read", onClick } })} />
    );
    fireEvent.click(screen.getByRole("button", { name: "Mark as read" }));
    expect(onClick).toHaveBeenCalledTimes(1);
  });
});
