import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { AsyncButton } from "./async-button";
import { CalloutAction } from "./callout";

describe("CalloutAction", () => {
  it("is a plain button by default, so it never submits a form", () => {
    render(<CalloutAction>Stop</CalloutAction>);
    expect(screen.getByRole("button", { name: "Stop" })).toHaveProperty(
      "type",
      "button"
    );
  });

  describe("lending its look to an AsyncButton", () => {
    const lent = ({
      onClick,
      disabled,
    }: {
      onClick: () => unknown;
      disabled?: boolean;
    }) =>
      render(
        <CalloutAction asChild>
          <AsyncButton disabled={disabled} onClick={onClick}>
            Try now
          </AsyncButton>
        </CalloutAction>
      );
    const button = () =>
      screen.getByRole("button", { name: "Try now" }) as HTMLButtonElement;

    it("keeps the button's own disabled and click", () => {
      const onClick = vi.fn();
      const { unmount } = lent({ onClick, disabled: true });
      expect(button().disabled).toBe(true);
      unmount();

      lent({ onClick });
      fireEvent.click(button());
      expect(onClick).toHaveBeenCalledOnce();
    });

    it("stays busy while the click waits", async () => {
      let settle = () => {};
      lent({
        onClick: () => new Promise<void>((resolve) => (settle = resolve)),
      });
      fireEvent.click(button());
      // The spinner joins the button's name while it waits
      const busy = screen.getByRole("button");
      await waitFor(() => expect(busy.getAttribute("aria-busy")).toBe("true"));
      expect(busy.getAttribute("data-slot")).toBe("callout-action");

      settle();
      await waitFor(() => expect(busy.getAttribute("aria-busy")).toBeNull());
    });

    it("leaves none of the button's default fill or text colour", () => {
      lent({ onClick: () => undefined });
      expect(button().className).not.toMatch(/bg-primary|primary-foreground/);
    });
  });
});
