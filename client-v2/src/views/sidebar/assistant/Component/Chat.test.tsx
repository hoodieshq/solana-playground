import { act, fireEvent, render, screen } from "@testing-library/react";
import { ThemeProvider, type DefaultTheme } from "styled-components";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import Chat from "./Chat";
import { PgAssistant } from "../store";
import { initLogger, memoryProvider, resetLogger } from "@/shared/lib/logger";

// The panel's neighbours are not under test: the utils barrel needs the
// generated globals of a booted app, and the lesson, bridge and provider
// modules reach into it or into the network.
vi.mock("./ChatItem", () => ({ default: () => null }));
vi.mock("./Connect", () => ({ default: () => null }));
vi.mock("../../../../components/Loading/ThreeDots", () => ({
  ThreeDots: () => null,
}));
vi.mock("../model", () => ({
  createProvider: () => ({ label: "Test", send: vi.fn() }),
}));
vi.mock("../bridge/build-output", () => ({
  PgBuildOutput: { latest: null },
}));
vi.mock("../bridge/lesson-context", () => ({ describeLesson: () => null }));
vi.mock("../bridge/playground-bridge", () => ({
  realBridge: { listFiles: () => [], listOpenFiles: () => [] },
}));
vi.mock("../../../../effects/chat-thread/push-thread", () => ({
  pushThread: vi.fn().mockResolvedValue(undefined),
}));
vi.mock("../../../../features/persistence/model/replay", () => ({
  toReplayMessages: () => [],
}));
vi.mock("../../../../utils", () => ({
  PgCommand: {},
  PgExplorer: { currentFilePath: null, getItemNameFromPath: () => "" },
  PgProgramInfo: { idl: null },
}));
vi.mock("../../../../hooks", () => ({ useRenderOnChange: () => undefined }));
vi.mock("../../../flow/lessons", () => ({
  INITIAL_LESSON_STATE: { path: null, record: null },
  PgLesson: { onDidChange: () => ({ dispose: () => undefined }) },
  attempted: () => false,
  cursorStep: () => null,
  foldRecord: () => null,
  verifyingStage: () => null,
}));

const theme = new Proxy(
  {},
  {
    get: (_, key) =>
      key === Symbol.toPrimitive || key === "toString"
        ? () => "inherit"
        : theme,
  }
) as unknown as DefaultTheme;

beforeEach(() => {
  Element.prototype.scrollIntoView = vi.fn();
  vi.spyOn(PgAssistant, "connection", "get").mockReturnValue({
    id: "test",
    apiKey: "k",
  } as never);
  vi.spyOn(PgAssistant, "isPickingBackend", "get").mockReturnValue(false);
});

afterEach(() => {
  vi.restoreAllMocks();
  resetLogger();
});

describe("Chat Send", () => {
  it("reports a failure that happens before the turn starts", async () => {
    const memory = memoryProvider();
    initLogger({ providers: [memory] });
    const failure = new Error("store is broken");
    vi.spyOn(PgAssistant, "addUserMessage").mockImplementation(() => {
      throw failure;
    });
    render(
      <ThemeProvider theme={theme}>
        <Chat />
      </ThemeProvider>
    );

    fireEvent.change(screen.getByRole("textbox"), {
      target: { value: "hello" },
    });
    await act(async () =>
      fireEvent.click(screen.getByRole("button", { name: "Send" }))
    );

    expect(memory.entries).toEqual([
      expect.objectContaining({
        ns: "ui:button",
        error: failure,
        report: true,
      }),
    ]);
  });
});
