// `@types/mocha` also declares a global `it`, without `each`
import { beforeEach, describe, expect, it } from "vitest";

import {
  initTelemetry,
  memoryProvider,
  resetTelemetry,
} from "@/shared/lib/telemetry";
import { GithubImportError } from "@/utils/import-error";

import { trackView } from "./view";

let sent: ReturnType<typeof memoryProvider>;

beforeEach(() => {
  resetTelemetry();
  sent = memoryProvider();
  initTelemetry({ providers: [sent] });
});

describe("trackView", () => {
  it("counts a GitHub link that opens", async () => {
    await expect(trackView(async () => ["files"])).resolves.toEqual(["files"]);
    expect(sent.events).toEqual([
      expect.objectContaining({ name: "project_viewed", params: {} }),
    ]);
  });

  it.each([
    ["not-found", new GithubImportError("missing", "not-found")],
    ["too-large", new GithubImportError("truncated", "too-large")],
    ["network", new TypeError("Failed to fetch")],
    ["other", new Error("Invalid program url")],
  ] as const)(
    "counts a link that fails with %s and rethrows",
    async (reason, error) => {
      await expect(
        trackView(async () => {
          throw error;
        })
      ).rejects.toBe(error);
      expect(sent.events).toEqual([
        expect.objectContaining({
          name: "project_view_failed",
          params: { reason },
        }),
      ]);
    }
  );
});
