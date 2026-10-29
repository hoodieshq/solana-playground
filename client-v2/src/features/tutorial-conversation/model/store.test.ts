import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../../utils/explorer/explorer", () => ({
  PgExplorer: {
    currentWorkspaceName: null as string | null,
    onDidSwitchWorkspace: vi.fn(() => ({ dispose: vi.fn() })),
    fs: { exists: vi.fn(async () => false) },
  },
}));
vi.mock("../../../utils/tutorial/tutorial", () => ({
  PgTutorial: { all: [] as unknown[], getStorage: vi.fn() },
  storageDataPath: () => ".workspace/tutorial-storage.json",
}));
vi.mock("../../../utils/view", () => ({ PgView: { setToast: vi.fn() } }));
// The entity's barrel loads UI that reads the build's globals on import;
// the store needs only these two from it
vi.mock("@/entities/tutorial", async () => ({
  slugOf: (await import("@/entities/tutorial/model/definition/check")).slugOf,
  tutorialTelemetry: (await import("@/entities/tutorial/model/telemetry"))
    .tutorialTelemetry,
}));

import hello from "../../../tutorials/hello-anchor/tutorial.json";
import { memoryWorkspace, stubRunner } from "./ports";
import type { Runner, Workspace } from "./ports";
import { freshProgress } from "./progress";
import type { RunResult } from "./progress";
import {
  INITIAL_CONVERSATION_STATE,
  PgConversation,
  STORAGE_KEY,
} from "./store";
import { TICK_MS } from "./clock";
import { PgExplorer } from "../../../utils/explorer/explorer";
import { PgTutorial } from "../../../utils/tutorial/tutorial";
import { PgView } from "../../../utils/view";
import { initLogger, memoryProvider, resetLogger } from "@/shared/lib/logger";
import {
  initTelemetry,
  memoryProvider as memoryEvents,
  resetTelemetry,
} from "@/shared/lib/telemetry";
import type { Disposable } from "../../../utils/types";

const NAME = "Hello Anchor";
/** A clock past every turn the tests post */
const LATER = Date.now() + 1e9;

const setWorkspace = (name: string | null) => {
  (PgExplorer as { currentWorkspaceName: string | null }).currentWorkspaceName =
    name;
};

/** The storage file as `getStorage` reads and writes it, one object per test */
let file: Record<string, unknown>;
let exists: boolean;

const settle = async () => {
  for (let i = 0; i < 8; i++) await new Promise((r) => setImmediate(r));
};

let logged: ReturnType<typeof memoryProvider>;
let events: ReturnType<typeof memoryEvents>;
let sub: Disposable | null = null;

const OK_BUILD: RunResult = {
  act: "build",
  ok: true,
  seconds: 1.6,
  instructions: ["hello"],
};

const open = (
  name: string | null,
  ports: {
    workspace?: Workspace;
    runner?: Runner;
  } = {}
) => {
  setWorkspace(name);
  sub = PgConversation.init({
    workspace: ports.workspace ?? memoryWorkspace(),
    runner: ports.runner ?? stubRunner([]),
  });
};

beforeEach(() => {
  file = {};
  exists = false;
  vi.mocked(PgExplorer.fs.exists).mockImplementation(async () => exists);
  vi.mocked(PgTutorial).all = [{ name: NAME, definition: hello }] as never;
  vi.mocked(PgTutorial.getStorage).mockImplementation(
    (def: Record<string, unknown>) =>
      ({
        getItem: async (key: string) => (key in file ? file[key] : def[key]),
        setItem: async (key: string, value: unknown) => {
          file[key] = JSON.parse(JSON.stringify(value));
        },
      } as never)
  );
  logged = memoryProvider();
  initLogger({ providers: [logged] });
  events = memoryEvents();
  initTelemetry({ providers: [events] });
});

const close = () => {
  sub?.dispose();
  sub = null;
};

afterEach(async () => {
  close();
  open(null);
  await settle();
  close();
  resetLogger();
  resetTelemetry();
});

describe("PgConversation", () => {
  it("is empty for a workspace without a definition", async () => {
    vi.mocked(PgTutorial).all = [] as never;
    open(NAME);
    await settle();
    expect(PgConversation.state).toBe(INITIAL_CONVERSATION_STATE);
    expect(PgConversation.view()).toBeNull();
  });

  it("loads the open workspace's save and marks a started run interrupted", async () => {
    exists = true;
    const saved = freshProgress();
    saved.startedAt = 1000;
    saved.passed = ["write-program"];
    saved.cursor = { kind: "step", stepId: "deploy", beat: 2, fail: false };
    saved.beats = {
      "s2.why": { kind: "said", at: 2000 },
      "s2.q2": { kind: "open", at: 2700, wrong: [] },
    };
    saved.runs = { "s1.build": [{ status: "started", at: 1500 }] };
    saved.times = {
      "write-program": { from: 1000, to: 1900, via: "chat" },
      deploy: { from: 2000, to: null },
    };
    file = { lesson: { v: 2, events: [] }, [STORAGE_KEY]: saved };
    open(NAME);
    await settle();

    const { context, engine, loadFailed } = PgConversation.state;
    expect(context?.slug).toBe("hello-anchor");
    expect(loadFailed).toBe(false);
    expect(engine.progress.runs["s1.build"]).toEqual([
      { status: "interrupted", at: 1500 },
    ]);
    expect(engine.progress.cursor).toEqual(saved.cursor);
    const v = PgConversation.view(LATER);
    expect(v?.live?.id).toBe("s2.q2");
    expect(v?.turns.every((t) => t.whole)).toBe(true);
  });

  it("persists a pick under conversation and leaves the file's other keys alone", async () => {
    const lesson = { v: 2, events: [{ seq: 1 }] };
    file = { lesson };
    open(NAME);
    await settle();
    PgConversation.start();
    await settle();
    expect(events.events.map((e) => e.name)).toEqual(["tutorial_started"]);
    const q1 = PgConversation.view(LATER)?.live;
    expect(q1?.id).toBe("s1.q1");
    PgConversation.pick("s1.q1", 1);
    await settle();

    const saved = file[STORAGE_KEY] as { beats: Record<string, unknown> };
    expect(saved.beats["s1.q1"]).toMatchObject({ kind: "picked", attempts: 1 });
    expect(file.lesson).toEqual(lesson);
  });

  it("drains a write through the workspace port and records the lines it took", async () => {
    const workspace = memoryWorkspace({ "src/lib.rs": "" });
    open(NAME, { workspace });
    await settle();
    PgConversation.start();
    await settle();
    expect(workspace.files["src/lib.rs"]).toBe(
      'use anchor_lang::prelude::*;\n\ndeclare_id!("11111111111111111111111111111111");'
    );
    expect(PgConversation.state.engine.progress.beats["s1.boil"]).toMatchObject(
      { kind: "written", wrote: { file: "src/lib.rs", lines: [1, 2, 3] } }
    );

    PgConversation.pick("s1.q1", 1);
    await settle();
    expect(workspace.files["src/lib.rs"]).toBe(
      hello.steps[0].target["src/lib.rs"]
        .replace(/\n+$/, "")
        .replace("\n\n#[derive(Accounts)]\npub struct Hello {}", "")
    );
    expect(PgConversation.state.engine.progress.beats["s1.q1"]).toMatchObject({
      kind: "picked",
      wrote: { file: "src/lib.rs", lines: [5, 6, 7, 8, 9, 10, 11, 12, 13] },
    });
    const saved = file[STORAGE_KEY] as { beats: Record<string, unknown> };
    expect(saved.beats["s1.q1"]).toMatchObject({
      wrote: { lines: [5, 6, 7, 8, 9, 10, 11, 12, 13] },
    });
  });

  it("fills around a typed key line, keeping the learner's words", async () => {
    const workspace = memoryWorkspace({ "src/lib.rs": "" });
    open(NAME, { workspace });
    await settle();
    PgConversation.start();
    await settle();
    const typed = `${workspace.files["src/lib.rs"]}\n\n    msg!("Hi there");\n`;
    await workspace.write("src/lib.rs", typed, NAME);
    PgConversation.edit("src/lib.rs", typed);
    await settle();
    expect(PgConversation.state.engine.progress.beats["s1.q1"]).toMatchObject({
      kind: "typed",
      wrote: { file: "src/lib.rs" },
    });
    expect(workspace.files["src/lib.rs"]).toContain('msg!("Hi there");');
    expect(workspace.files["src/lib.rs"]).toContain("#[program]");
  });

  it("creates a file for a create beat, once", async () => {
    const workspace = memoryWorkspace({ "src/lib.rs": "" });
    const runner = stubRunner([
      { stages: ["Building"], result: OK_BUILD },
      {
        result: {
          act: "deploy",
          ok: true,
          seconds: 1,
          programId: "p",
          signature: "s",
          upgraded: false,
          lamports: 1,
          instructions: ["hello"],
        },
      },
    ]);
    open(NAME, { workspace, runner });
    await settle();
    PgConversation.start();
    await settle();
    PgConversation.pick("s1.q1", 1);
    await settle();
    PgConversation.act("s1.build");
    await settle();
    expect(PgConversation.state.engine.progress.passed).toEqual([
      "write-program",
    ]);
    PgConversation.next();
    await settle();
    PgConversation.skip("s2.q2");
    await settle();
    PgConversation.act("s2.deploy");
    await settle();
    PgConversation.next();
    await settle();
    expect(workspace.files["client/client.ts"]).toBe("");
    expect(PgConversation.state.engine.progress.beats["s3.file"]).toMatchObject(
      {
        kind: "written",
        wrote: { file: "client/client.ts", lines: [], created: true },
      }
    );
  });

  it("runs an act through the runner, showing its stages, and passes the step", async () => {
    const runner = stubRunner([{ stages: ["Building"], result: OK_BUILD }]);
    open(NAME, { runner });
    await settle();
    PgConversation.start();
    await settle();
    PgConversation.pick("s1.q1", 1);
    await settle();
    const stages: unknown[] = [];
    const watch = PgConversation.onDidChange((s) =>
      stages.push(s.engine.stage)
    );
    PgConversation.act("s1.build");
    await settle();
    watch.dispose();
    expect(runner.runs).toEqual([
      { act: "build", input: { beatId: "s1.build" } },
    ]);
    expect(stages).toContainEqual({
      beatId: "s1.build",
      label: "Building",
      index: 1,
      count: 1,
    });
    expect(PgConversation.state.engine.stage).toBeNull();
    expect(PgConversation.state.engine.progress.passed).toEqual([
      "write-program",
    ]);
    expect(PgConversation.view(LATER)?.live?.id).toBe("win:write-program");
  });

  it("a runner that throws ends the run as a failed result", async () => {
    const runner = {
      runs: [],
      run: async () => {
        throw new Error("server down");
      },
    };
    open(NAME, { runner });
    await settle();
    PgConversation.start();
    await settle();
    PgConversation.pick("s1.q1", 1);
    await settle();
    PgConversation.act("s1.build");
    await settle();
    expect(PgConversation.state.engine.progress.runs["s1.build"]).toMatchObject(
      [
        {
          status: "failed",
          result: { act: "build", ok: false, log: "server down" },
        },
      ]
    );
    expect(logged.entries.filter((e) => e.level === "error")).toHaveLength(1);
  });

  it("a failing write logs once and records nothing", async () => {
    const workspace: Workspace = {
      read: async () => "",
      write: async () => {
        throw new Error("disk full");
      },
    };
    open(NAME, { workspace });
    await settle();
    PgConversation.start();
    await settle();
    expect(PgConversation.state.engine.progress.beats["s1.boil"]).toEqual({
      kind: "said",
      at: expect.any(Number),
      writeFailed: true,
    });
    expect(
      PgConversation.view(LATER)?.turns.find((t) => t.id === "wrote:s1.boil")
    ).toMatchObject({ failed: true });
    // One for the start files' restore, one for the block
    expect(logged.entries.filter((e) => e.level === "error")).toHaveLength(2);
  });

  it("start over clears a failed load and writes a fresh save", async () => {
    exists = true;
    file = { [STORAGE_KEY]: { version: 7 } };
    open(NAME);
    await settle();
    expect(PgConversation.state.loadFailed).toBe(true);
    await vi.waitFor(() =>
      expect(vi.mocked(PgView.setToast)).toHaveBeenCalledTimes(1)
    );
    PgConversation.startOver();
    await settle();
    expect(PgConversation.state.loadFailed).toBe(false);
    expect(file[STORAGE_KEY]).toMatchObject({ version: 1, passed: [] });
    PgConversation.start();
    await settle();
    const saved = file[STORAGE_KEY] as { startedAt: number | null };
    expect(saved.startedAt).not.toBeNull();
  });

  it("treats a save naming a step the definition lacks as a failed load", async () => {
    exists = true;
    const saved = freshProgress();
    saved.startedAt = 1000;
    saved.cursor = { kind: "step", stepId: "renamed", beat: 0, fail: false };
    saved.times = { renamed: { from: 1000, to: null } };
    file = { [STORAGE_KEY]: saved };
    open(NAME);
    await settle();
    expect(PgConversation.state.loadFailed).toBe(true);
    expect(PgConversation.view(LATER)?.live?.kind).toBe("intro");
    expect(
      logged.entries.some((e) =>
        `${e.message ?? ""}${e.error?.message ?? ""}`.includes("renamed")
      )
    ).toBe(true);
  });

  it("acts again on an interrupted run and keeps the first as a record", async () => {
    exists = true;
    const saved = freshProgress();
    saved.startedAt = 1000;
    saved.passed = ["write-program"];
    saved.cursor = { kind: "step", stepId: "deploy", beat: 3, fail: false };
    saved.beats = {
      "s2.why": { kind: "said", at: 2000 },
      "s2.q2": {
        kind: "skipped",
        at: 2800,
        openedAt: 2700,
        via: "button",
        wrong: [],
      },
      "s2.deploy": { kind: "said", at: 3500 },
    };
    saved.runs = { "s2.deploy": [{ status: "started", at: 4000 }] };
    saved.times = {
      "write-program": { from: 1000, to: 1900, via: "chat" },
      deploy: { from: 2000, to: null },
    };
    file = { [STORAGE_KEY]: saved };
    const runner = stubRunner([
      {
        result: {
          act: "deploy",
          ok: true,
          seconds: 3,
          programId: "p",
          signature: "s",
          upgraded: false,
          lamports: 1,
          instructions: ["hello"],
        },
      },
    ]);
    open(NAME, { runner });
    await settle();
    expect(PgConversation.view(LATER)?.live).toMatchObject({
      id: "s2.deploy",
      state: "interrupted",
    });
    PgConversation.act("s2.deploy");
    await settle();
    expect(
      PgConversation.state.engine.progress.runs["s2.deploy"]
    ).toMatchObject([{ status: "interrupted", at: 4000 }, { status: "ok" }]);
    expect(PgConversation.state.engine.progress.passed).toEqual([
      "write-program",
      "deploy",
    ]);
    const ids = PgConversation.view(LATER)?.turns.map((t) => t.id) ?? [];
    expect(ids).toEqual(
      expect.arrayContaining([
        "s2.deploy",
        "s2.deploy:1",
        "result:s2.deploy:1",
        "win:deploy",
      ])
    );
  });

  it("a load that lands after a workspace switch is dropped", async () => {
    let release: (value: unknown) => void = () => {};
    vi.mocked(PgTutorial.getStorage).mockImplementation(
      () =>
        ({
          getItem: () =>
            new Promise((r) => {
              release = r;
            }),
          setItem: async () => {},
        } as never)
    );
    open(NAME);
    await settle();
    setWorkspace("Other");
    release(undefined);
    await settle();
    expect(PgConversation.state).toBe(INITIAL_CONVERSATION_STATE);
  });

  it("a reload inside the finish window still finishes", async () => {
    exists = true;
    const saved = freshProgress();
    saved.startedAt = 1000;
    saved.passed = ["write-program", "deploy", "call-client", "greet-by-name"];
    saved.cursor = {
      kind: "step",
      stepId: "greet-by-name",
      beat: 4,
      fail: false,
    };
    saved.times = {
      "write-program": { from: 1000, to: 1900, via: "chat" },
      deploy: { from: 2000, to: 2900, via: "chat" },
      "call-client": { from: 3000, to: 3900, via: "client" },
      "greet-by-name": { from: 4000, to: 4900, via: "chat" },
    };
    file = { [STORAGE_KEY]: saved };
    open(NAME);
    await settle();
    await vi.waitFor(() =>
      expect(PgConversation.state.engine.progress.finishedAt).not.toBeNull()
    );
    expect(events.events.map((e) => e.name)).toEqual(["tutorial_finished"]);
    expect(PgConversation.view(LATER)?.live).toBeNull();
  });

  it("a stale run's result cannot answer a new run of the same act", async () => {
    let releaseFirst: (r: RunResult) => void = () => {};
    let calls = 0;
    const runner: Runner = {
      run: () =>
        new Promise<RunResult>((r) => {
          calls++;
          if (calls === 1) releaseFirst = r;
          else r(OK_BUILD);
        }),
    };
    open(NAME, { runner });
    await settle();
    PgConversation.start();
    await settle();
    PgConversation.pick("s1.q1", 1);
    await settle();
    PgConversation.act("s1.build");
    await settle();
    PgConversation.startOver();
    await settle();
    // A later start: the new run's start time must differ from the first's
    await new Promise((r) => setTimeout(r, 5));
    PgConversation.start();
    await settle();
    PgConversation.pick("s1.q1", 1);
    await settle();
    // The second run answers at once and passes the step
    PgConversation.act("s1.build");
    await settle();
    expect(PgConversation.state.engine.progress.passed).toEqual([
      "write-program",
    ]);
    const before = PgConversation.state;
    releaseFirst({
      act: "build",
      ok: false,
      seconds: 1,
      error: null,
      log: "stale",
    });
    await settle();
    expect(PgConversation.state).toBe(before);
  });

  it("refuses to write while the load failed, and still shows the intro", async () => {
    exists = true;
    file = {};
    open(NAME);
    await settle();
    expect(PgConversation.state.loadFailed).toBe(true);
    expect(PgConversation.view(LATER)?.live?.kind).toBe("intro");
    PgConversation.start();
    await settle();
    expect(file[STORAGE_KEY]).toBeUndefined();
    expect(PgConversation.state.engine.progress.startedAt).not.toBeNull();
  });

  it("treats a save this engine never wrote as a failed load", async () => {
    exists = true;
    file = { [STORAGE_KEY]: { version: 7 } };
    open(NAME);
    await settle();
    expect(PgConversation.state.loadFailed).toBe(true);
    expect(logged.entries.some((e) => e.level === "error")).toBe(true);
  });

  it("a workspace switch mid-write does not write into the new workspace", async () => {
    let release: () => void = () => {};
    const written: string[] = [];
    const workspace: Workspace = {
      read: async () => "",
      write: async (path) => {
        await new Promise<void>((r) => {
          release = r;
        });
        written.push(path);
      },
    };
    open(NAME, { workspace });
    await settle();
    PgConversation.start();
    await settle();
    setWorkspace("Other");
    release();
    await settle();
    expect(written).toEqual(["src/lib.rs"]);
    expect(PgConversation.state.engine.progress.beats["s1.boil"]).toMatchObject(
      { kind: "said" }
    );
  });

  it("start over writes a fresh save", async () => {
    open(NAME);
    await settle();
    PgConversation.start();
    await settle();
    PgConversation.startOver();
    await settle();
    expect(file[STORAGE_KEY]).toMatchObject({
      version: 1,
      passed: [],
      finishedAt: null,
      startedAt: null,
      restartedAt: expect.any(Number),
      cursor: { kind: "intro" },
    });
    expect(PgConversation.view(LATER)?.live?.kind).toBe("intro");
  });

  it("re-renders when the next turn arrives", async () => {
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout", "Date"] });
    try {
      vi.setSystemTime(10_000);
      open(NAME);
      await settle();
      let notified = 0;
      const watch = PgConversation.onDidChange(() => notified++);
      PgConversation.start();
      await settle();
      const before = notified;
      expect(PgConversation.view()?.nextAt).toBe(10_000 + TICK_MS);
      vi.advanceTimersByTime(TICK_MS);
      expect(notified).toBe(before + 1);
      watch.dispose();
    } finally {
      vi.useRealTimers();
    }
  });

  it("tells the learner once when a save fails", async () => {
    vi.mocked(PgTutorial.getStorage).mockImplementation(
      () =>
        ({
          getItem: async () => undefined,
          setItem: async () => {
            throw new Error("quota");
          },
        } as never)
    );
    open(NAME);
    await settle();
    PgConversation.start();
    await settle();
    PgConversation.pick("s1.q1", 1);
    await settle();
    await vi.waitFor(() =>
      expect(vi.mocked(PgView.setToast)).toHaveBeenCalledTimes(1)
    );
    expect(
      logged.entries.filter((e) => e.level === "error").length
    ).toBeGreaterThanOrEqual(2);
  });
});
