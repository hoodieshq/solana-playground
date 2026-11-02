import { renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  initLogger,
  memoryProvider as memoryLog,
  resetLogger,
} from "@/shared/lib/logger";
import {
  initTelemetry,
  memoryProvider as memoryTelemetry,
  resetTelemetry,
} from "@/shared/lib/telemetry";
import {
  probeDefaultBackend,
  resetDefaultBackendProbe,
  retryDefaultBackend,
  useDefaultBackend,
} from "./default-backend";
import { assistantTelemetry } from "./telemetry";

let events: ReturnType<typeof memoryTelemetry>;
let logs: ReturnType<typeof memoryLog>;

beforeEach(() => {
  events = memoryTelemetry();
  logs = memoryLog();
  initTelemetry({ providers: [events] });
  initLogger({ providers: [logs] });
  resetDefaultBackendProbe();
});

afterEach(() => {
  resetTelemetry();
  resetLogger();
  vi.restoreAllMocks();
});

/** `GET /api/ai/status`'s answer for a deployment that offers a hosted key */
const hosted = (model: unknown, reason: string | null = "signed-out") => ({
  available: reason === null,
  key: "hosted",
  reason,
  model,
});

/** `GET /api/ai/status`'s answer for a deployment with no hosted key */
const own = { available: false, key: "own", reason: null, model: null };

/** The probe's answer: this body, with this status */
const answer = (body: unknown, status = 200) =>
  vi.spyOn(globalThis, "fetch").mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  } as Response);

const expectFailure = (reason: string) => {
  expect(logs.entries.map((e) => [e.ns, e.report])).toEqual([
    ["assistant:connect", true],
  ]);
  expect(events.events.map((e) => [e.name, e.params])).toEqual([
    ["assistant_default_probe_failed", { reason }],
  ]);
};

describe("probeDefaultBackend", () => {
  it("asks the status route, and nothing else", async () => {
    const spy = answer(hosted(null));
    await probeDefaultBackend();
    expect(spy.mock.calls.map(([url]) => url)).toEqual(["/api/ai/status"]);
  });

  it("is present with the deployment's model, signed out", async () => {
    answer(hosted("z-ai/glm-5.3-flash:US"));
    expect(await probeDefaultBackend()).toEqual({
      state: "present",
      model: "z-ai/glm-5.3-flash:US",
    });
    expect(logs.entries).toEqual([]);
  });

  it("is present with the deployment's model, signed in", async () => {
    answer(hosted("z-ai/glm-5.3-flash:US", null));
    expect(await probeDefaultBackend()).toEqual({
      state: "present",
      model: "z-ai/glm-5.3-flash:US",
    });
  });

  it("is absent when the server has no hosted key", async () => {
    answer(own);
    expect(await probeDefaultBackend()).toEqual({ state: "absent" });
    expect(logs.entries).toEqual([]);
  });

  it("is unreachable, warned of and counted when the server could not read the session", async () => {
    answer(hosted("m", "unavailable"));
    expect(await probeDefaultBackend()).toEqual({ state: "unreachable" });
    // The route has logged its own failure; this is the client's view of it
    expect(logs.entries.map((e) => [e.ns, e.level, e.report])).toEqual([
      ["assistant:connect", "warn", false],
    ]);
    expect(events.events.map((e) => [e.name, e.params])).toEqual([
      ["assistant_default_probe_failed", { reason: "session" }],
    ]);
  });

  it("asks again after the server could not read the session", async () => {
    const spy = answer(hosted("m", "unavailable"));
    await probeDefaultBackend();
    spy.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => hosted("m", null),
    } as Response);
    expect(await probeDefaultBackend()).toEqual({
      state: "present",
      model: "m",
    });
    expect(spy).toHaveBeenCalledTimes(2);
  });

  it("is unreachable and reported when the request fails", async () => {
    vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("offline"));
    expect(await probeDefaultBackend()).toEqual({ state: "unreachable" });
    expectFailure("network");
  });

  it("is unreachable and reported when the route answers a 5xx", async () => {
    answer({}, 503);
    expect(await probeDefaultBackend()).toEqual({ state: "unreachable" });
    expectFailure("status");
  });

  it("is absent, warned of and not reported on a deployment without the route", async () => {
    answer({}, 404);
    expect(await probeDefaultBackend()).toEqual({ state: "absent" });
    expect(logs.entries.map((e) => [e.ns, e.level, e.report])).toEqual([
      ["assistant:connect", "warn", false],
    ]);
    expect(events.events).toEqual([]);
  });

  it("is unreachable and reported on a null body", async () => {
    answer(null);
    expect(await probeDefaultBackend()).toEqual({ state: "unreachable" });
    expectFailure("body");
  });

  it("is unreachable and reported on a body without a known key", async () => {
    answer({ model: "x" });
    expect(await probeDefaultBackend()).toEqual({ state: "unreachable" });
    expectFailure("body");
  });

  it("is unreachable and reported on a hosted key with an unknown reason", async () => {
    answer(hosted("m", "sleeping"));
    expect(await probeDefaultBackend()).toEqual({ state: "unreachable" });
    expectFailure("body");
  });

  it("is unreachable and reported when the body is not JSON", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.reject(new SyntaxError("Unexpected token <")),
    } as Response);
    expect(await probeDefaultBackend()).toEqual({ state: "unreachable" });
    expectFailure("body");
  });

  it("is present with no model, and warned of, when the model is not a string", async () => {
    answer(hosted(42));
    expect(await probeDefaultBackend()).toEqual({
      state: "present",
      model: null,
    });
    expect(logs.entries.map((e) => [e.ns, e.level, e.report])).toEqual([
      ["assistant:connect", "warn", false],
    ]);
  });

  it("asks again after a failed probe", async () => {
    const spy = vi
      .spyOn(globalThis, "fetch")
      .mockRejectedValueOnce(new Error("offline"))
      .mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => hosted(null),
      } as Response);
    expect(await probeDefaultBackend()).toEqual({ state: "unreachable" });
    expect(await probeDefaultBackend()).toEqual({
      state: "present",
      model: null,
    });
    expect(spy).toHaveBeenCalledTimes(2);
  });

  it("keeps a deployment without the route for the page", async () => {
    const spy = answer({}, 404);
    await probeDefaultBackend();
    await probeDefaultBackend();
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it("asks once per page", async () => {
    const spy = answer(hosted(null));
    await probeDefaultBackend();
    await probeDefaultBackend();
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it("asks again on a retry, and counts it", async () => {
    const spy = answer(own);
    await probeDefaultBackend();
    expect(await retryDefaultBackend()).toEqual({ state: "absent" });
    expect(spy).toHaveBeenCalledTimes(2);
    expect(events.events.map((e) => e.name)).toEqual([
      "assistant_default_probe_retried",
    ]);
  });
});

describe("useDefaultBackend", () => {
  it("starts checking, then settles", async () => {
    answer(hosted(null));
    const { result } = renderHook(() => useDefaultBackend());
    expect(result.current).toEqual({ state: "checking" });
    await waitFor(() =>
      expect(result.current).toEqual({ state: "present", model: null })
    );
  });

  it("follows a retry's answer", async () => {
    const spy = vi.spyOn(globalThis, "fetch").mockRejectedValueOnce(
      new Error("offline")
    );
    const { result } = renderHook(() => useDefaultBackend());
    await waitFor(() =>
      expect(result.current).toEqual({ state: "unreachable" })
    );
    spy.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => hosted("m"),
    } as Response);
    void retryDefaultBackend();
    await waitFor(() =>
      expect(result.current).toEqual({ state: "present", model: "m" })
    );
  });

  it("settles unreachable and logs when the probe rejects", async () => {
    // The probe answers its own failures; this is a throw past them, such as
    // a log provider that fails while reporting one
    vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("offline"));
    vi.spyOn(assistantTelemetry, "track").mockImplementation(() => {
      throw new Error("telemetry is broken");
    });
    const { result } = renderHook(() => useDefaultBackend());
    await waitFor(() =>
      expect(result.current).toEqual({ state: "unreachable" })
    );
    expect(logs.entries.map((e) => [e.ns, e.level, e.report])).toEqual([
      // The probe's own report, then the hook's
      ["assistant:connect", "error", true],
      ["assistant:connect", "error", true],
    ]);
  });
});
