// The legacy button pulls in the utils barrel, whose generated globals exist
// only once the app has booted; what the banner does on a press is all
// that is under test, so a plain button stands in.
vi.mock("../../../components/Button", () => ({
  default: (props: {
    children: React.ReactNode;
    disabled?: boolean;
    onClick?: () => void;
  }) => (
    <button disabled={props.disabled} onClick={props.onClick}>
      {props.children}
    </button>
  ),
}));
// The resolve view loads Monaco, which jsdom cannot run; it is not opened
vi.mock("../ui/ConflictResolver", () => ({ ConflictResolver: () => null }));

import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { ThemeProvider, type DefaultTheme } from "styled-components";
// `@types/mocha` also declares a global `it`, without `each`
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import SyncBanner from "./SyncBanner";
import {
  initTelemetry,
  memoryProvider,
  resetTelemetry,
} from "../../../shared/lib/telemetry";
import { PgProjectSync } from "../model/project-sync";
import { PgExplorer } from "../../../utils/explorer/explorer";

(
  globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

/**
 * A theme that answers every key: the banner and the legacy button read
 * deep theme keys for their styles, none of which matters here, and the
 * real theme's module needs the utils barrel.
 */
const anyTheme: DefaultTheme = new Proxy(
  {},
  {
    get: (_, key) =>
      key === Symbol.toPrimitive || key === "toString"
        ? () => "inherit"
        : anyTheme,
  }
) as unknown as DefaultTheme;

describe("SyncBanner telemetry", () => {
  let container: HTMLDivElement;
  let root: Root;
  let sent: ReturnType<typeof memoryProvider>;

  beforeEach(async () => {
    sent = memoryProvider();
    initTelemetry({ providers: [sent] });
    vi.spyOn(PgExplorer, "currentWorkspaceId", "get").mockReturnValue("p1");
    vi.spyOn(PgExplorer, "onDidSwitchWorkspace").mockReturnValue({
      dispose: () => undefined,
    });
    vi.spyOn(PgProjectSync, "onDidChangeConflicts").mockReturnValue({
      dispose: () => undefined,
    });
    vi.spyOn(PgProjectSync, "conflictFor").mockReturnValue({
      projectId: "p1",
      kind: "divergent",
      paths: ["src/lib.rs"],
    });
    vi.spyOn(PgProjectSync, "resolve").mockResolvedValue(true);
    container = document.body.appendChild(document.createElement("div"));
    root = createRoot(container);
    await act(async () =>
      root.render(
        <ThemeProvider theme={anyTheme}>
          <SyncBanner />
        </ThemeProvider>
      )
    );
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
    vi.restoreAllMocks();
    resetTelemetry();
  });

  it.each([
    ["Keep this version", "keep-local"],
    ["Take the other version", "take-server"],
  ])("tracks %s from the banner", async (label, answer) => {
    const found = Array.from(container.querySelectorAll("button")).find(
      (b) => b.textContent?.trim() === label
    );
    await act(async () => found!.click());

    expect(sent.events).toEqual([
      { name: "sync_whole_file_answered", params: { answer, from: "banner" } },
    ]);
    expect(PgProjectSync.resolve).toHaveBeenCalledWith("p1", answer);
  });
});
