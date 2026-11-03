import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { TutorialDefinition } from "@/entities/tutorial";
import type {
  ConversationState,
  ConversationView,
} from "@/features/tutorial-conversation";
import hello from "../../../tutorials/hello-anchor/tutorial.json";

const definition = hello as unknown as TutorialDefinition;

vi.mock("@/features/tutorial-conversation", () => ({
  PgConversation: {
    state: null,
    view: vi.fn(),
    say: vi.fn(),
    asked: vi.fn(),
    chip: vi.fn(),
  },
}));
// The connected feed pulls in the explorer and the editor; the composer needs
// only the state it re-renders on
vi.mock("./TutorialConversation", async () => {
  const { PgConversation } = await import("@/features/tutorial-conversation");
  return { useConversationState: () => PgConversation.state };
});

import { PgConversation } from "@/features/tutorial-conversation";
import BaseTutorialComposer from "./BaseTutorialComposer";
import { TutorialComposer } from "./TutorialComposer";
import type { ComposerTurn } from "./TutorialComposer";

const store = PgConversation as unknown as {
  state: ConversationState | null;
  view: ReturnType<typeof vi.fn>;
  say: ReturnType<typeof vi.fn>;
  asked: ReturnType<typeof vi.fn>;
  chip: ReturnType<typeof vi.fn>;
};

const box = () => screen.getByRole("textbox", { name: "Message" });

/** The Base with its value held, as the turn holds it in the app */
const Held = (props: {
  onSend: (text: string) => void;
  chips?: readonly string[] | null;
  onChip?: (i: number) => void;
}) => {
  const [value, setValue] = useState("");
  return (
    <BaseTutorialComposer
      value={value}
      onChange={setValue}
      placeholder="Ask about this step"
      busy={false}
      onSend={props.onSend}
      onStop={vi.fn()}
      chips={props.chips ?? null}
      onChip={props.onChip ?? vi.fn()}
    />
  );
};

describe("BaseTutorialComposer", () => {
  it("sends on Enter, and breaks the line on Shift+Enter", async () => {
    const onSend = vi.fn();
    render(<Held onSend={onSend} />);
    await userEvent.type(box(), "what is a PDA?{Shift>}{Enter}{/Shift}why");
    expect(onSend).not.toHaveBeenCalled();
    expect((box() as HTMLTextAreaElement).value).toBe("what is a PDA?\nwhy");
    await userEvent.type(box(), "{Enter}");
    expect(onSend).toHaveBeenCalledWith("what is a PDA?\nwhy");
  });

  it("does nothing on ⌘↵, which presses the live act elsewhere in the column", async () => {
    const onSend = vi.fn();
    render(<Held onSend={onSend} />);
    await userEvent.type(box(), "build");
    fireEvent.keyDown(box(), { key: "Enter", metaKey: true });
    fireEvent.keyDown(box(), { key: "Enter", ctrlKey: true });
    expect(onSend).not.toHaveBeenCalled();
  });

  it("shows the moment's placeholder and is never disabled", () => {
    render(
      <BaseTutorialComposer
        value=""
        onChange={vi.fn()}
        placeholder="Ask while it builds"
        busy={true}
        onSend={vi.fn()}
        onStop={vi.fn()}
        chips={null}
        onChip={vi.fn()}
      />
    );
    expect(box().getAttribute("placeholder")).toBe("Ask while it builds");
    expect((box() as HTMLTextAreaElement).disabled).toBe(false);
    expect(screen.getByRole("button", { name: "Stop" })).toBeTruthy();
  });

  it("routes Enter while the assistant answers, so a word still runs", async () => {
    const onSend = vi.fn();
    render(
      <BaseTutorialComposer
        value="build"
        onChange={vi.fn()}
        placeholder="Ask about this step"
        busy={true}
        onSend={onSend}
        onStop={vi.fn()}
        chips={null}
        onChip={vi.fn()}
      />
    );
    fireEvent.keyDown(box(), { key: "Enter" });
    expect(onSend).toHaveBeenCalledWith("build");
    fireEvent.keyDown(box(), { key: "Enter", shiftKey: true });
    expect(onSend).toHaveBeenCalledTimes(1);
  });

  it("has no chips during the lesson, and presses one after the finish", async () => {
    const onChip = vi.fn();
    const { rerender } = render(<Held onSend={vi.fn()} onChip={onChip} />);
    expect(screen.queryByRole("group", { name: "Ask next" })).toBeNull();

    const labels = definition.finish.chips.map((c) => c.label);
    rerender(<Held onSend={vi.fn()} chips={labels} onChip={onChip} />);
    await userEvent.click(
      screen.getByRole("button", { name: "What should I build next?" })
    );
    expect(onChip).toHaveBeenCalledWith(1);
  });
});

describe("TutorialComposer", () => {
  const view = (placeholder: ConversationView["placeholder"]) =>
    ({
      turns: [],
      live: null,
      steps: [],
      placeholder,
      nextAt: null,
      finishAt: null,
    } as ConversationView);
  const stateAt = (cursor: "step" | "finished") =>
    ({
      context: { definition, slug: "hello-anchor" },
      engine: {
        progress: {
          cursor:
            cursor === "finished"
              ? { kind: "finished" }
              : { kind: "step", stepId: definition.steps[0].id },
        },
      },
    } as unknown as ConversationState);

  /** A turn whose input is held like `useTurn`'s */
  const Connected = ({
    turn,
  }: {
    turn: Omit<ComposerTurn, "input" | "setInput">;
  }) => {
    const [input, setInput] = useState("");
    return (
      <TutorialComposer
        turn={{
          send: turn.send,
          stop: turn.stop,
          busy: turn.busy,
          input,
          setInput,
        }}
      />
    );
  };
  const turn = () => ({
    send: vi.fn(async () => {}),
    stop: vi.fn(),
    busy: false,
  });

  beforeEach(() => {
    vi.clearAllMocks();
    store.state = stateAt("step");
    store.view.mockReturnValue(view("Ask about this step"));
  });

  it("runs a live action's word in the lesson, and never asks the assistant", async () => {
    store.say.mockReturnValue("lesson");
    const t = turn();
    render(<Connected turn={t} />);
    await userEvent.type(box(), "build{Enter}");
    expect(store.say).toHaveBeenCalledWith("build");
    expect(store.asked).not.toHaveBeenCalled();
    expect(t.send).not.toHaveBeenCalled();
    expect((box() as HTMLTextAreaElement).value).toBe("");
  });

  it("sends anything else to the live assistant, counted as asked", async () => {
    store.say.mockReturnValue("assistant");
    const t = turn();
    render(<Connected turn={t} />);
    await userEvent.type(box(), "I'm stuck{Enter}");
    expect(store.asked).toHaveBeenCalledTimes(1);
    expect(t.send).toHaveBeenCalledWith("I'm stuck");
  });

  it("shows the finish chips only after the finish, and posts a chip's answer with no model call", async () => {
    const t = turn();
    const { unmount } = render(<Connected turn={t} />);
    expect(
      screen.queryByRole("button", { name: "Change what hello says" })
    ).toBeNull();
    unmount();

    store.state = stateAt("finished");
    store.view.mockReturnValue(view("Ask anything"));
    render(<Connected turn={t} />);
    expect(box().getAttribute("placeholder")).toBe("Ask anything");
    await userEvent.click(
      screen.getByRole("button", { name: "Change what hello says" })
    );
    expect(store.chip).toHaveBeenCalledWith(0);
    expect(t.send).not.toHaveBeenCalled();
  });
});
