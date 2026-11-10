// `@types/mocha` also declares a global `it`, without `each`
import { describe, expect, it } from "vitest";

import { ConversionError, GithubImportError } from "@/utils/import-error";

import { importReasonOf } from "./reason";

describe("importReasonOf", () => {
  it.each([
    ["not-found", new GithubImportError("not found", "not-found")],
    ["rate-limited", new GithubImportError("limit", "rate-limited")],
    ["too-large", new GithubImportError("truncated", "too-large")],
    ["no-source", new GithubImportError("no code", "no-source")],
    ["other", new GithubImportError("status 500", "other")],
    ["unsupported", new ConversionError("not a program", "unsupported")],
    ["no-source", new ConversionError("no code", "no-source")],
    ["unsupported", new Error("Could not identify framework")],
    ["network", new TypeError("Failed to fetch")],
    ["other", new Error("Invalid program url")],
    ["other", "a string"],
  ] as const)("reads %s from the error's type", (reason, error) => {
    expect(importReasonOf(error)).toBe(reason);
  });

  it("never reads the message", () => {
    expect(importReasonOf(new Error("rate limit reached (404)"))).toBe("other");
  });
});
