// The design system's leaf elements mount and respond in client-v2 as
// installed: React 19, our aliases and jsdom, with no edit by hand.
import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { Avatar } from "@/shared/ui/avatar";
import { Badge } from "@/shared/ui/badge";
import { Callout } from "@/shared/ui/callout";
import { Checkbox } from "@/shared/ui/checkbox";
import {
  Collapsible,
  CollapsibleChevron,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/shared/ui/collapsible";
import { Empty, EmptyDescription, EmptyTitle } from "@/shared/ui/empty";
import { Kbd } from "@/shared/ui/kbd";
import { Label } from "@/shared/ui/label";
import { Logo } from "@/shared/ui/logo";
import { StatusDot } from "@/shared/ui/status-dot";
import { Switch } from "@/shared/ui/switch";
import { Tag, levelVariant } from "@/shared/ui/tag";

let consoleError: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  // A React warning during render is a failure here, not noise.
  consoleError = vi.spyOn(console, "error");
});

afterEach(() => {
  expect(consoleError).not.toHaveBeenCalled();
  consoleError.mockRestore();
});

function slot(container: HTMLElement, name: string) {
  return container.querySelector(`[data-slot="${name}"]`);
}

describe("shared/ui leaf elements", () => {
  it("flips a checkbox from its label", () => {
    render(
      <Label>
        <Checkbox />
        Accept
      </Label>
    );
    const box = screen.getByRole("checkbox");
    expect(box.getAttribute("aria-checked")).toBe("false");

    fireEvent.click(screen.getByText("Accept"));

    expect(box.getAttribute("aria-checked")).toBe("true");
  });

  it("opens a collapsible from its trigger", () => {
    render(
      <Collapsible>
        <CollapsibleTrigger>
          Details
          <CollapsibleChevron />
        </CollapsibleTrigger>
        <CollapsibleContent>Hidden text</CollapsibleContent>
      </Collapsible>
    );
    const trigger = screen.getByRole("button", { name: "Details" });
    expect(trigger.getAttribute("aria-expanded")).toBe("false");
    expect(screen.queryByText("Hidden text")).toBeNull();

    fireEvent.click(trigger);

    expect(trigger.getAttribute("aria-expanded")).toBe("true");
    expect(screen.getByText("Hidden text")).toBeTruthy();
  });

  it("gives a callout the role its variant needs", () => {
    render(
      <>
        <Callout variant="error">Broke</Callout>
        <Callout variant="info">FYI</Callout>
      </>
    );

    expect(screen.getByRole("alert").textContent).toBe("Broke");
    expect(screen.getByRole("note").textContent).toBe("FYI");
  });

  it("colours a tag by level and falls back to error", () => {
    const { container } = render(
      <Tag variant={levelVariant("Beginner")}>Beginner</Tag>
    );

    expect(slot(container, "tag")?.getAttribute("data-variant")).toBe(
      "success"
    );
    expect(levelVariant("Unknown")).toBe("error");
  });

  it("mounts the remaining leaves with their data-slot", () => {
    const { container } = render(
      <div>
        <Kbd>K</Kbd>
        <Badge>New</Badge>
        <Empty>
          <EmptyTitle>Nothing</EmptyTitle>
          <EmptyDescription>Add one</EmptyDescription>
        </Empty>
        <StatusDot />
        <Avatar />
        <Logo />
        <Switch />
      </div>
    );

    for (const name of [
      "kbd",
      "badge",
      "empty",
      "status-dot",
      "avatar",
      "logo",
      "switch",
    ]) {
      expect(slot(container, name), name).not.toBeNull();
    }
  });
});
