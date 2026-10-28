import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { useSyncMarkers } from "./use-sync-markers";

type Marker = "this-browser" | "not-synced" | null;

/** A subscription the hook takes, which a test fires by hand */
const channel = vi.hoisted(() => () => {
  const listeners = new Set<() => void>();
  return {
    on: (cb: () => void) => {
      listeners.add(cb);
      return { dispose: () => listeners.delete(cb) };
    },
    fire: () => listeners.forEach((cb) => cb()),
  };
});

const state = vi.hoisted(() => ({
  names: [] as string[],
  markerOf: (async () => null) as (id: string, name: string) => Promise<Marker>,
}));
const sync = vi.hoisted(() => ({ fire: () => {} }));

vi.mock("@/features/persistence", () => {
  const changes = channel();
  sync.fire = changes.fire;
  return {
    syncMarkerOf: (id: string, name: string) => state.markerOf(id, name),
    onDidChangeSyncMarkers: changes.on,
  };
});
vi.mock("@/features/auth", () => ({
  PgSession: { onDidChange: channel().on },
}));
vi.mock("@/utils", () => {
  const on = channel().on;
  return {
    PgExplorer: {
      get allWorkspaceNames() {
        return state.names;
      },
      workspaceIdOf: (name: string) => `id-${name}`,
      onDidCreateWorkspace: on,
      onDidRenameWorkspace: on,
      onDidDeleteWorkspace: on,
      onDidSwitchWorkspace: on,
      onDidChangeWorkspaceList: on,
    },
  };
});

afterEach(() => {
  state.names = [];
  state.markerOf = async () => null;
});

describe("useSyncMarkers", () => {
  it("reads every workspace's marker, by name, leaving clean ones out", async () => {
    state.names = ["counter", "voting"];
    state.markerOf = async (_, name) =>
      name === "voting" ? "this-browser" : null;
    const { result } = renderHook(() => useSyncMarkers());
    await waitFor(() =>
      expect(result.current).toEqual({ voting: "this-browser" })
    );
  });

  it("reads again when sync says a marker may have moved", async () => {
    state.names = ["counter"];
    const { result } = renderHook(() => useSyncMarkers());
    await waitFor(() => expect(result.current).toEqual({}));

    state.markerOf = async () => "not-synced";
    act(() => sync.fire());
    await waitFor(() =>
      expect(result.current).toEqual({ counter: "not-synced" })
    );
  });

  it("queues one read behind a running one, never a second alongside", async () => {
    state.names = ["counter"];
    let release = () => {};
    let reads = 0;
    let running = 0;
    let overlapped = false;
    state.markerOf = async () => {
      reads += 1;
      running += 1;
      overlapped ||= running > 1;
      await new Promise<void>((resolve) => (release = resolve));
      running -= 1;
      return null;
    };
    renderHook(() => useSyncMarkers());
    await waitFor(() => expect(reads).toBe(1));

    // Three changes during the read: one more read, after it
    act(() => {
      sync.fire();
      sync.fire();
      sync.fire();
    });
    release();
    await waitFor(() => expect(reads).toBe(2));
    release();
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(reads).toBe(2);
    expect(overlapped).toBe(false);
  });

  it("keeps a row's marker when its read fails, rather than show it as saved", async () => {
    state.names = ["counter"];
    state.markerOf = async () => "not-synced";
    const { result } = renderHook(() => useSyncMarkers());
    await waitFor(() =>
      expect(result.current).toEqual({ counter: "not-synced" })
    );

    state.markerOf = async () => {
      throw new Error("store busy");
    };
    act(() => sync.fire());
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(result.current).toEqual({ counter: "not-synced" });
  });

  it("keeps the same object when nothing moved, so rows do not re-render", async () => {
    state.names = ["counter"];
    state.markerOf = async () => "this-browser";
    const { result } = renderHook(() => useSyncMarkers());
    await waitFor(() =>
      expect(result.current).toEqual({ counter: "this-browser" })
    );
    const first = result.current;
    act(() => sync.fire());
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(result.current).toBe(first);
  });

  it("stops reading once unmounted", async () => {
    state.names = ["counter"];
    const read = vi.fn(async () => null);
    state.markerOf = read;
    const { unmount } = renderHook(() => useSyncMarkers());
    await waitFor(() => expect(read).toHaveBeenCalledOnce());
    unmount();
    sync.fire();
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(read).toHaveBeenCalledOnce();
  });
});
