import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import type { HostedModel } from "./BaseAssistantStatus";
import BaseAssistantStatus from "./BaseAssistantStatus";

const draw = (hosted: HostedModel, online: boolean) => {
  const onRetry = vi.fn(() => Promise.resolve());
  render(
    <BaseAssistantStatus
      hosted={hosted}
      online={online}
      onRetry={onRetry}
      phone={false}
    />
  );
  return onRetry;
};

const dot = () =>
  document
    .querySelector('[data-slot="status-dot"]')
    ?.getAttribute("data-variant");

describe("BaseAssistantStatus", () => {
  it.each([
    [
      "checking",
      "Checking",
      "Asking whether the hosted model answers.",
      "running",
    ],
    ["present", "Ready", "Hosted model. No key needed.", "success"],
    [
      "absent",
      "Not offered",
      "This build has no hosted model. The assistant asks for a key.",
      "idle",
    ],
    [
      "unreachable",
      "Not answering",
      "The hosted model is not answering. The assistant asks for a key.",
      "warning",
    ],
  ] as const)(
    "reads %s online as %s, with its help line",
    (hosted, word, help, variant) => {
      draw(hosted, true);
      expect(screen.getByText(word)).toBeTruthy();
      expect(screen.getByText(help)).toBeTruthy();
      expect(dot()).toBe(variant);
    }
  );

  it("reads Off while the browser is offline, as the status bar does, and blames no model", () => {
    draw("unreachable", false);
    expect(screen.getByText("Off")).toBeTruthy();
    expect(screen.queryByText("Not answering")).toBeNull();
    expect(screen.queryByText(/not answering/)).toBeNull();
    expect(dot()).toBe("idle");
    expect(screen.queryByRole("button", { name: "Try again" })).toBeNull();
  });

  it("asks the hosted model again on Try again, when it is not answering", async () => {
    const onRetry = draw("unreachable", true);
    await userEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it.each(["checking", "present", "absent"] as const)(
    "offers no Try again when the model is %s",
    (hosted) => {
      draw(hosted, true);
      expect(screen.queryByRole("button", { name: "Try again" })).toBeNull();
    }
  );
});
