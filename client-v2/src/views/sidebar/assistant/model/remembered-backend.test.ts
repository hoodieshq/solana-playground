// `@types/mocha` also declares a global `it`, without `each`
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { initLogger, memoryProvider, resetLogger } from "@/shared/lib/logger";
import type { Connection } from "../store";
import {
  forgetBackend,
  isDefaultBackendRemembered,
  rememberBackend,
  rememberedConnection,
} from "./remembered-backend";

const KEY = "sk-test-0123456789";

const openai: Connection = {
  id: "openai",
  apiKey: KEY,
  endpoint: { baseUrl: "https://api.example.test/v1", model: "gpt-x" },
};
const anthropic: Connection = {
  id: "anthropic",
  apiKey: KEY,
  settings: { model: "claude-opus-5", effort: "high" },
};
const defaultBackend: Connection = { id: "default", apiKey: "" };

describe("remembered backend", () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
  });
  afterEach(() => {
    vi.restoreAllMocks();
    resetLogger();
  });

  it("remembers nothing until a backend has been chosen", () => {
    expect(isDefaultBackendRemembered()).toBe(false);
    expect(rememberedConnection()).toBeNull();
  });

  it("remembers the default backend in localStorage only", () => {
    rememberBackend(defaultBackend);
    expect(isDefaultBackendRemembered()).toBe(true);
    expect(rememberedConnection()).toBeNull();
  });

  it("keeps a key-based connection for this tab", () => {
    rememberBackend(openai);
    expect(rememberedConnection()).toEqual(openai);
    expect(isDefaultBackendRemembered()).toBe(false);
  });

  it("keeps model settings for a backend without a base URL", () => {
    rememberBackend(anthropic);
    expect(rememberedConnection()).toEqual(anthropic);
  });

  it("never writes the key to localStorage", () => {
    rememberBackend(openai);
    expect(JSON.stringify({ ...localStorage })).not.toContain(KEY);
  });

  it("drops the key once the default backend is chosen", () => {
    rememberBackend(openai);
    rememberBackend(defaultBackend);
    expect(rememberedConnection()).toBeNull();
    expect(sessionStorage.length).toBe(0);
  });

  it("forgets both on request", () => {
    rememberBackend(defaultBackend);
    rememberBackend(openai);
    forgetBackend();
    expect(isDefaultBackendRemembered()).toBe(false);
    expect(rememberedConnection()).toBeNull();
    expect(sessionStorage.length).toBe(0);
  });

  it.each([
    ["not JSON", "{"],
    ["an unknown provider", JSON.stringify({ id: "nope", apiKey: KEY })],
    ["the default backend", JSON.stringify({ id: "default", apiKey: "" })],
    ["no key", JSON.stringify({ id: "openai" })],
    [
      "an OpenAI-compatible provider with no endpoint",
      JSON.stringify({ id: "openai", apiKey: KEY }),
    ],
    [
      "a half endpoint",
      JSON.stringify({ id: "openai", apiKey: KEY, endpoint: { baseUrl: "x" } }),
    ],
    [
      "an effort the provider does not offer",
      JSON.stringify({
        id: "anthropic",
        apiKey: KEY,
        settings: { model: "m", effort: "turbo" },
      }),
    ],
  ])("drops a stored value with %s", (_, raw) => {
    sessionStorage.setItem("assistant.connection", raw);
    expect(rememberedConnection()).toBeNull();
    expect(sessionStorage.getItem("assistant.connection")).toBeNull();
  });

  it("carries no field it does not know", () => {
    sessionStorage.setItem(
      "assistant.connection",
      JSON.stringify({
        id: "openai",
        apiKey: KEY,
        endpoint: openai.endpoint,
        extra: 1,
      })
    );
    expect(rememberedConnection()).toEqual(openai);
  });

  it("answers no when storage refuses to say", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("SecurityError");
    });
    expect(isDefaultBackendRemembered()).toBe(false);
    expect(rememberedConnection()).toBeNull();
  });

  it("logs a refused write without the key", () => {
    const logged = memoryProvider();
    initLogger({ providers: [logged] });
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("QuotaExceededError");
    });

    expect(() => rememberBackend(openai)).not.toThrow();

    expect(logged.entries).toEqual([
      expect.objectContaining({
        ns: "assistant:remembered-backend",
        report: false,
      }),
      expect.objectContaining({
        ns: "assistant:remembered-backend",
        report: false,
      }),
    ]);
    expect(JSON.stringify(logged.entries)).not.toContain(KEY);
  });
});
