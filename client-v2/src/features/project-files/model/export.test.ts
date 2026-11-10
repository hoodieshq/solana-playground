import { afterEach, beforeEach, describe, expect, it } from "vitest";

import {
  initTelemetry,
  memoryProvider,
  resetTelemetry,
} from "@/shared/lib/telemetry";

import { trackExportAsIs, trackExported, trackExportFailed } from "./export";

let sent: ReturnType<typeof memoryProvider>;

beforeEach(() => {
  sent = memoryProvider();
  initTelemetry({ providers: [sent] });
});

afterEach(() => resetTelemetry());

describe("trackExported", () => {
  it("counts a converted zip from the dialog as converted", () => {
    trackExported("dialog", { profile: "anchor", files: 2 });

    expect(sent.events).toEqual([
      {
        name: "project_exported",
        params: { via: "dialog", converted: true, profile: "anchor", files: 2 },
      },
    ]);
  });

  it("counts a zip of the files as they are as not converted", () => {
    trackExported("settings", { profile: "as-is", files: 5 });

    expect(sent.events).toEqual([
      {
        name: "project_exported",
        params: {
          via: "settings",
          converted: false,
          profile: "as-is",
          files: 5,
        },
      },
    ]);
  });
});

describe("trackExportFailed", () => {
  it("names where the export started and how the zip was being made", () => {
    trackExportFailed("dialog", "typescript");

    expect(sent.events).toEqual([
      {
        name: "project_export_failed",
        params: { via: "dialog", profile: "typescript" },
      },
    ]);
  });
});

describe("trackExportAsIs", () => {
  it("counts the files the export resolves with, and returns them", async () => {
    expect(await trackExportAsIs(() => Promise.resolve(3), "settings")).toBe(3);

    expect(sent.events).toEqual([
      {
        name: "project_exported",
        params: {
          via: "settings",
          converted: false,
          profile: "as-is",
          files: 3,
        },
      },
    ]);
  });

  it("counts an export that rejects as failed, and rethrows", async () => {
    const failure = new Error("quota");

    await expect(
      trackExportAsIs(() => Promise.reject(failure), "dialog")
    ).rejects.toBe(failure);

    expect(sent.events).toEqual([
      {
        name: "project_export_failed",
        params: { via: "dialog", profile: "as-is" },
      },
    ]);
  });
});
