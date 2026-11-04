// One item of the thread, drawn from the design system's message parts.
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import type { FC } from "react";
import { createElement } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import {
  initLogger,
  memoryProvider as memoryLog,
  resetLogger,
} from "@/shared/lib/logger";
import { BUTTON_FAILED_TOAST } from "@/shared/lib/report-button-failure";
import { requireFor } from "@/test-utils/require-for";

import type { ToastChildProps } from "../../../utils/view";
import { PgView } from "../../../utils/view";
import type { ChatItem } from "../../../views/sidebar/assistant/store";
import { BaseThreadItem } from "./BaseThreadItem";

// Replies render markdown; the text is enough here
vi.mock("../../../components/Markdown", () => ({
  default: ({ children }: { children: string }) => <p>{children}</p>,
}));

const CREATED = "2026-10-19T00:00:00.000Z";

const reply = (text: string): ChatItem => ({
  id: "reply-1",
  createdAt: CREATED,
  kind: "assistant",
  text,
});

const user = (text: string): ChatItem => ({
  id: "u-1",
  createdAt: CREATED,
  kind: "user",
  text,
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("BaseThreadItem", () => {
  it("the user's message is a bubble on the right", () => {
    const { container } = render(
      <BaseThreadItem item={user("Hi")} onAnswer={vi.fn()} />
    );
    const bubble = container.querySelector(
      "[data-slot=message][data-align=end] [data-slot=bubble][data-variant=default]"
    );
    expect(bubble?.textContent).toBe("You: Hi");
  });

  it("a reply is a ghost bubble at full width", () => {
    const { container } = render(
      <BaseThreadItem item={reply("Hello there")} onAnswer={vi.fn()} />
    );
    const bubble = container.querySelector(
      "[data-slot=bubble][data-variant=ghost]"
    );
    expect(bubble?.textContent).toBe("Assistant: Hello there");
  });

  it("who spoke is said to a screen reader, not only shown", () => {
    render(
      <>
        <BaseThreadItem item={user("Hi")} onAnswer={vi.fn()} />
        <BaseThreadItem item={reply("Hello")} onAnswer={vi.fn()} />
      </>
    );
    expect(screen.getByText("You:").className).toContain("sr-only");
    expect(screen.getByText("Assistant:").className).toContain("sr-only");
  });

  it("an empty reply renders nothing", () => {
    const { container } = render(
      <BaseThreadItem item={reply("")} onAnswer={vi.fn()} />
    );
    expect(container.innerHTML).toBe("");
  });

  it("a tool line is a marker", () => {
    const { container } = render(
      <BaseThreadItem
        item={{
          id: "t-1",
          createdAt: CREATED,
          kind: "tool",
          label: "Read lib.rs",
        }}
        onAnswer={vi.fn()}
      />
    );
    expect(container.querySelector("[data-slot=marker]")?.textContent).toBe(
      "Read lib.rs"
    );
  });

  it("make change offered on a finished reply", () => {
    const onClick = vi.fn();
    render(
      <BaseThreadItem
        item={reply("Add a counter")}
        actions={{ makeChange: { onClick } }}
        onAnswer={vi.fn()}
      />
    );
    fireEvent.click(screen.getByRole("button", { name: "Make this change" }));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("an error is an alert", () => {
    render(
      <BaseThreadItem
        item={{ id: "e-1", createdAt: CREATED, kind: "error", text: "Boom" }}
        onAnswer={vi.fn()}
      />
    );
    expect(screen.getByRole("alert").textContent).toBe("Boom");
  });

  it("a notice is a status, not an alert", () => {
    render(
      <BaseThreadItem
        item={{
          id: "n-1",
          createdAt: CREATED,
          kind: "notice",
          text: "Stopped.",
        }}
        onAnswer={vi.fn()}
      />
    );
    expect(screen.getByRole("status").textContent).toBe("Stopped.");
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("an approval answers with its own id", () => {
    const onAnswer = vi.fn();
    render(
      <BaseThreadItem
        item={{
          id: "card-1",
          createdAt: CREATED,
          kind: "approval",
          status: "pending",
          request: { type: "command", name: "build", effect: "Compiles" },
        }}
        onAnswer={onAnswer}
      />
    );
    fireEvent.click(screen.getByRole("button", { name: "Deny" }));
    expect(onAnswer).toHaveBeenCalledWith("card-1", "deny");
  });
});
