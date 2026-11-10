// `@types/mocha` also declares a global `it`, without `each`
import { beforeEach, describe, expect, it } from "vitest";

import {
  initTelemetry,
  memoryProvider,
  resetTelemetry,
} from "@/shared/lib/telemetry";
import {
  ConversionError,
  GithubImportError,
  ImportCancelledError,
} from "@/utils/import-error";

import { trackImport, trackImportFailure } from "./import";

let sent: ReturnType<typeof memoryProvider>;

beforeEach(() => {
  resetTelemetry();
  sent = memoryProvider();
  initTelemetry({ providers: [sent] });
});

describe("trackImport", () => {
  it("counts an import once it resolves", async () => {
    await expect(trackImport(async () => "done", "github")).resolves.toBe(
      "done"
    );
    expect(sent.events).toEqual([
      expect.objectContaining({
        name: "project_imported",
        params: { via: "github" },
      }),
    ]);
  });

  it.each([
    ["not-found", new GithubImportError("missing", "not-found")],
    ["unsupported", new ConversionError("no framework", "unsupported")],
    ["network", new GithubImportError("no answer", "network")],
    ["other", new Error("Invalid program url")],
  ] as const)(
    "counts a failure with reason %s and rethrows",
    async (reason, error) => {
      await expect(
        trackImport(async () => {
          throw error;
        }, "files")
      ).rejects.toBe(error);
      expect(sent.events).toEqual([
        expect.objectContaining({
          name: "project_import_failed",
          params: { via: "files", reason },
        }),
      ]);
    }
  );

  it("sends nothing for a closed program choice", async () => {
    const cancelled = new ImportCancelledError();
    await expect(
      trackImport(async () => {
        throw cancelled;
      }, "github")
    ).rejects.toBe(cancelled);
    expect(sent.events).toEqual([]);
  });
});

describe("trackImportFailure", () => {
  it("counts a failure that was handled in place", () => {
    trackImportFailure("files", new GithubImportError("limit", "rate-limited"));
    expect(sent.events).toEqual([
      expect.objectContaining({
        name: "project_import_failed",
        params: { via: "files", reason: "rate-limited" },
      }),
    ]);
  });
});
