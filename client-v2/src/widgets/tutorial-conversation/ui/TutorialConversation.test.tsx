import { act, render, renderHook, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { ActBeat, TutorialDefinition } from "@/entities/tutorial";
import type {
  ConversationState,
  ConversationView,
  Turn,
} from "@/features/tutorial-conversation";
import hello from "../../../tutorials/hello-anchor/tutorial.json";

const definition = hello as unknown as TutorialDefinition;

vi.mock("@/features/tutorial-conversation", () => ({
  PgConversation: {
    state: null,
    view: vi.fn(),
    onDidChange: vi.fn(),
    init: vi.fn(),
    start: vi.fn(),
    pick: vi.fn(),
    hint: vi.fn(),
    skip: vi.fn(),
    act: vi.fn(),
    explain: vi.fn(),
    fixMyself: vi.fn(),
    next: vi.fn(),
    startOver: vi.fn(),
  },
  judgeGoal: "judgeGoal",
  realWorkspace: "realWorkspace",
  unwiredRunner: "unwiredRunner",
}));
vi.mock("@/utils/explorer", () => ({
  PgExplorer: {
    convertToFullPath: (p: string) => `/hello/${p}`,
    getFileContent: () => "a\nb\nc\nd\ne\nf\ng",
    saveEditorPosition: vi.fn(),
    openFile: vi.fn(),
  },
}));
vi.mock("@/entities/tutorial", async () => ({
  tutorialTelemetry: (await import("@/entities/tutorial/model/telemetry"))
    .tutorialTelemetry,
}));

import { PgConversation } from "@/features/tutorial-conversation";
import { tutorialTelemetry } from "@/entities/tutorial/model/telemetry";
import { PgExplorer } from "@/utils/explorer";
import {
  TutorialConversation,
  useConversationStartOver,
} from "./TutorialConversation";

const store = PgConversation as unknown as {
  state: ConversationState | null;
  view: ReturnType<typeof vi.fn>;
  onDidChange: ReturnType<typeof vi.fn>;
  init: ReturnType<typeof vi.fn>;
  startOver: ReturnType<typeof vi.fn>;
};

const step1 = definition.steps[0];
const divider: Turn = {
  id: `divider:${step1.id}`,
  kind: "divider",
  step: step1.id,
  at: 1,
  whole: true,
  index: 1,
  title: step1.title,
  objective: step1.objective,
  done: true,
  took: 41_000,
};
const wrote: Turn = {
  id: "wrote:s1.q1",
  kind: "wrote",
  step: step1.id,
  at: 2,
  whole: true,
  beatId: "s1.q1",
  wrote: { file: "src/lib.rs", lines: [5, 6] },
  failed: false,
};
const live: Turn = {
  id: "s2.deploy",
  kind: "act",
  step: definition.steps[1].id,
  at: 3,
  whole: true,
  beatId: "s2.deploy",
  act: definition.steps[1].beats.find((b): b is ActBeat => b.kind === "act")!,
  state: "live",
  note: null,
  stage: null,
  took: null,
};

const onStep2: ConversationView = {
  turns: [divider, wrote, live],
  live,
  steps: definition.steps.map((s, i) => ({
    id: s.id,
    short: s.short,
    title: s.title,
    state: ["done", "current", "not_reached", "not_reached"][i] as
      | "done"
      | "current"
      | "not_reached",
    took: null,
  })),
  placeholder: "Ask about this step",
  nextAt: null,
  finishAt: null,
};

const loaded = (): ConversationState => ({
  context: { definition, slug: "hello-anchor", judge: () => true },
  engine: {
    progress: {
      version: 1,
      passed: [step1.id],
      finishedAt: null,
      startedAt: 1,
      restartedAt: null,
      cursor: {
        kind: "step",
        stepId: definition.steps[1].id,
        beat: 0,
        fail: false,
      },
      beats: {},
      runs: {},
      times: {},
    },
    stage: null,
  },
  loadFailed: false,
  loadedAt: 0,
});

const dispose = vi.fn();

beforeEach(() => {
  vi.clearAllMocks();
  Element.prototype.scrollTo = vi.fn();
  Element.prototype.scrollIntoView = vi.fn();
  store.state = loaded();
  store.view.mockReturnValue(onStep2);
  store.init.mockReturnValue({ dispose });
  store.onDidChange.mockReturnValue({ dispose: vi.fn() });
});

describe("TutorialConversation", () => {
  it("starts the engine once with the real workspace, the unwired runner and 3.2's judge, and stops it on leaving", () => {
    const { rerender, unmount } = render(<TutorialConversation />);
    rerender(<TutorialConversation />);
    expect(store.init).toHaveBeenCalledTimes(1);
    expect(store.init).toHaveBeenCalledWith({
      workspace: "realWorkspace",
      runner: "unwiredRunner",
      judge: "judgeGoal",
    });
    unmount();
    expect(dispose).toHaveBeenCalledTimes(1);
  });

  it("shows one spinner while the engine has no view", () => {
    store.state = {
      context: null,
      engine: loaded().engine,
      loadFailed: false,
      loadedAt: 0,
    };
    store.view.mockReturnValue(null);
    render(<TutorialConversation />);
    expect(screen.getAllByRole("status")).toHaveLength(1);
    expect(screen.queryByRole("log")).toBeNull();
  });

  it("opens a wrote card's file with its first line in view", async () => {
    render(<TutorialConversation />);
    await userEvent.click(
      screen.getByRole("button", { name: "Show lines 5 to 6 in src/lib.rs" })
    );
    expect(PgExplorer.saveEditorPosition).toHaveBeenCalledWith(
      "/hello/src/lib.rs",
      { cursor: { from: 0, to: 0 }, topLineNumber: 1 }
    );
    expect(PgExplorer.openFile).toHaveBeenCalledWith("/hello/src/lib.rs");
  });

  it("opens a step's file at the top from its segment, and counts the jump", async () => {
    const track = vi.spyOn(tutorialTelemetry, "track");
    render(<TutorialConversation />);
    await userEvent.click(
      screen.getByRole("button", { name: `Step 1 of 4, ${step1.title}, done` })
    );
    expect(PgExplorer.openFile).toHaveBeenCalledWith(`/hello/${step1.file}`);
    expect(track).toHaveBeenCalledWith("tutorial_step_jumped", {
      tutorial: "hello-anchor",
      step: 1,
      from: 2,
      via: "bar",
    });
  });

  it("presses the live act on ⌘↵", () => {
    render(<TutorialConversation />);
    act(() => {
      document.dispatchEvent(
        new KeyboardEvent("keydown", { key: "Enter", metaKey: true })
      );
    });
    expect(PgConversation.act).toHaveBeenCalledWith("s2.deploy");
  });
});

describe("useConversationStartOver", () => {
  it("hands the frame Start over and the steps passed", async () => {
    const { result } = renderHook(() => useConversationStartOver());
    expect(result.current.passed).toBe(1);
    await result.current.onStartOver?.();
    expect(store.startOver).toHaveBeenCalledTimes(1);
  });

  it("offers nothing outside a conversation tutorial", () => {
    store.state = {
      context: null,
      engine: loaded().engine,
      loadFailed: false,
      loadedAt: 0,
    };
    const { result } = renderHook(() => useConversationStartOver());
    expect(result.current.onStartOver).toBeUndefined();
  });
});
