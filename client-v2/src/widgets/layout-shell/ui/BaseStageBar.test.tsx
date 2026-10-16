import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, it, vi } from "vitest";

import { TooltipProvider } from "@/shared/ui/tooltip";
import BaseStageBar, { DOCS_URL } from "./BaseStageBar";
import type { BaseStageBarProps } from "./BaseStageBar";

const draw = (props: BaseStageBarProps) =>
  render(
    <TooltipProvider>
      <BaseStageBar
        title={props.title}
        files={props.files}
        assistant={props.assistant}
      />
    </TooltipProvider>
  );

it("names the files toggle by what it does", async () => {
  const onToggle = vi.fn();
  const { rerender } = draw({
    title: null,
    files: { open: true, onToggle },
    assistant: null,
  });
  const collapse = screen.getByRole("button", {
    name: "Collapse project panel",
  });
  expect(collapse.getAttribute("aria-expanded")).toBe("true");
  await userEvent.click(collapse);
  expect(onToggle).toHaveBeenCalledTimes(1);

  rerender(
    <TooltipProvider>
      <BaseStageBar
        title={null}
        files={{ open: false, onToggle }}
        assistant={null}
      />
    </TooltipProvider>
  );
  expect(
    screen
      .getByRole("button", { name: "Expand project panel" })
      .getAttribute("aria-expanded")
  ).toBe("false");
});

it("names the assistant toggle by what it does", async () => {
  const onToggle = vi.fn();
  const { rerender } = draw({
    title: null,
    files: null,
    assistant: { open: true, onToggle },
  });
  await userEvent.click(
    screen.getByRole("button", { name: "Hide the assistant" })
  );
  expect(onToggle).toHaveBeenCalledTimes(1);

  rerender(
    <TooltipProvider>
      <BaseStageBar
        title={null}
        files={null}
        assistant={{ open: false, onToggle }}
      />
    </TooltipProvider>
  );
  expect(screen.getByRole("button", { name: "Expand assistant" })).toBeTruthy();
});

it("draws no toggle it is not handed, and always the documentation", () => {
  draw({ title: null, files: null, assistant: null });
  expect(screen.queryByRole("button", { name: /project panel/ })).toBeNull();
  expect(screen.queryByRole("button", { name: /assistant/ })).toBeNull();
  const docs = screen.getByRole("link", { name: "Documentation" });
  expect(docs.getAttribute("href")).toBe(DOCS_URL);
  expect(docs.getAttribute("target")).toBe("_blank");
  expect(docs.getAttribute("rel")).toContain("noreferrer");
});

it("shows the project's name only when given one", () => {
  const { rerender } = draw({ title: "Counter", files: null, assistant: null });
  expect(screen.getByText("Counter")).toBeTruthy();
  rerender(
    <TooltipProvider>
      <BaseStageBar title={null} files={null} assistant={null} />
    </TooltipProvider>
  );
  expect(screen.queryByText("Counter")).toBeNull();
});

it("is the 44 px column bar with a bottom line", () => {
  const { container } = draw({ title: null, files: null, assistant: null });
  const bar = container.querySelector('[data-slot="stage-bar"]')!;
  expect(bar.className).toMatch(/\bh-11\b/);
  expect(bar.className).toMatch(/\bborder-b\b/);
});
