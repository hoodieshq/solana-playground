import type { CustomRpc, RpcHealth, SaveResult } from "@/entities/custom-rpc";
import { PgCustomRpcs } from "@/entities/custom-rpc";

import { settingsTelemetry } from "./telemetry";

/**
 * What saving answers the form: done, or the line to show under the URL,
 * with "Use anyway" when the URL could not be checked
 */
export type CustomRpcSaveAnswer =
  | { ok: true }
  | { ok: false; error: string; useAnyway?: () => CustomRpcSaveAnswer };

/** How a save went once its URL was checked, or why it waits on the person */
export type CheckedSave =
  | {
      kind: "done";
      result: SaveResult;
      /** `none`: refused before any request, or an edit that kept its URL */
      check: "passed" | "none";
    }
  | {
      kind: "unreachable";
      reason: Exclude<RpcHealth, "answered">;
      /** Save without the check: "Use anyway" */
      useAnyway: () => SaveResult;
    };

/**
 * Save `input` (over the RPC saved under `replacing`, or as a new one) once
 * its URL answers `fetchHealth`. A value the list would refuse sends no
 * request, and neither does an edit that keeps its URL.
 */
export const saveCheckedWith =
  (fetchHealth: (url: string) => Promise<RpcHealth>) =>
  async (
    input: CustomRpc,
    replacing: string | undefined
  ): Promise<CheckedSave> => {
    const write = () =>
      replacing === undefined
        ? PgCustomRpcs.save(input)
        : PgCustomRpcs.replace(replacing, input);
    const checked = PgCustomRpcs.check(input, replacing);
    if (!checked.ok) return { kind: "done", result: checked, check: "none" };
    if (checked.url === replacing) {
      return { kind: "done", result: write(), check: "none" };
    }
    const health = await fetchHealth(checked.url);
    if (health === "answered") {
      return { kind: "done", result: write(), check: "passed" };
    }
    return { kind: "unreachable", reason: health, useAnyway: write };
  };

/** The line under the URL field for a refused save (Spec 07's copy) */
const refusal = (result: Exclude<SaveResult, { ok: true }>): string => {
  switch (result.reason) {
    case "format":
      return "Enter a URL that starts with https://, or http:// for a local validator.";
    case "duplicate":
      return `Already saved as ${result.name}.`;
    case "storage":
      return "Could not save in this browser.";
  }
};

/** The line for a URL that could not be checked; "not responding" is the app's word */
const UNREACHABLE: Record<Exclude<RpcHealth, "answered">, string> = {
  no_answer: "This URL is not responding.",
  offline: "You're offline, so this URL can't be checked.",
};

type SaveMode = "add" | "edit";

/** Report a save's result to telemetry and the form; `onSaved` runs on success */
const answerSavedWith =
  (onSaved: (rpc: CustomRpc) => void, mode: SaveMode) =>
  (
    check: "passed" | "used_anyway" | "none",
    result: SaveResult
  ): CustomRpcSaveAnswer => {
    if (!result.ok) {
      settingsTelemetry.track("settings_custom_rpc_refused", {
        reason: result.reason,
      });
      return { ok: false, error: refusal(result) };
    }
    settingsTelemetry.track("settings_custom_rpc_saved", { mode, check });
    onSaved(result.rpc);
    return { ok: true };
  };

/**
 * Turn a checked save into the form's answer, tracking each outcome:
 * a refusal is the line under the field, an unreachable URL the line with
 * "Use anyway", and a save calls `onSaved` with the stored RPC
 */
export const answerFor =
  (onSaved: (rpc: CustomRpc) => void) =>
  (mode: SaveMode) =>
  (checked: CheckedSave): CustomRpcSaveAnswer => {
    const answer = answerSavedWith(onSaved, mode);
    if (checked.kind === "done") {
      return answer(checked.check, checked.result);
    }
    settingsTelemetry.track("settings_custom_rpc_refused", {
      reason: checked.reason,
    });
    return {
      ok: false,
      error: UNREACHABLE[checked.reason],
      useAnyway: () => answer("used_anyway", checked.useAnyway()),
    };
  };

if (import.meta.vitest) {
  const { describe, it, expect, vi, beforeEach, afterEach, beforeAll } =
    import.meta.vitest;

  describe("widgets/settings-page/model/save-custom-rpc", () => {
    let telemetry: typeof import("@/shared/lib/telemetry");
    let events: ReturnType<typeof telemetry.memoryProvider>;
    beforeAll(async () => {
      telemetry = await import("@/shared/lib/telemetry");
    });
    beforeEach(() => {
      localStorage.clear();
      events = telemetry.memoryProvider();
      telemetry.initTelemetry({ providers: [events] });
    });
    afterEach(() => {
      telemetry.resetTelemetry();
    });

    const tracked = () => events.events.map((e) => [e.name, e.params]);
    const healthOf = (health: RpcHealth) => vi.fn(async () => health);
    const TRITON = { name: "Triton", url: "https://t.test" };

    describe("saveCheckedWith", () => {
      it("saves a URL that answers, after one check of its normalised URL", async () => {
        const health = healthOf("answered");
        const checked = await saveCheckedWith(health)(TRITON, undefined);
        expect(health).toHaveBeenCalledWith("https://t.test/");
        expect(checked).toEqual({
          kind: "done",
          result: { ok: true, rpc: { name: "Triton", url: "https://t.test/" } },
          check: "passed",
        });
        expect(PgCustomRpcs.list()).toHaveLength(1);
      });

      it.each(["no_answer", "offline"] as const)(
        "saves nothing on %s until Use anyway",
        async (reason) => {
          const checked = await saveCheckedWith(healthOf(reason))(
            TRITON,
            undefined
          );
          if (checked.kind !== "unreachable") throw new Error(checked.kind);
          expect(checked.reason).toBe(reason);
          expect(PgCustomRpcs.list()).toEqual([]);
          expect(checked.useAnyway().ok).toBe(true);
          expect(PgCustomRpcs.list()).toEqual([
            { name: "Triton", url: "https://t.test/" },
          ]);
        }
      );

      it("sends no request for a value the list refuses", async () => {
        const health = healthOf("answered");
        const checked = await saveCheckedWith(health)(
          { name: "", url: "devnet" },
          undefined
        );
        expect(health).not.toHaveBeenCalled();
        expect(checked).toEqual({
          kind: "done",
          result: { ok: false, reason: "format" },
          check: "none",
        });
      });

      it("sends no request for an edit that keeps its URL", async () => {
        PgCustomRpcs.save(TRITON);
        const health = healthOf("no_answer");
        const checked = await saveCheckedWith(health)(
          { name: "Triton 2", url: "https://T.test" },
          "https://t.test/"
        );
        expect(health).not.toHaveBeenCalled();
        expect(checked).toMatchObject({ kind: "done", check: "none" });
        expect(PgCustomRpcs.list()[0].name).toBe("Triton 2");
      });

      it("checks an edit that changes its URL, and replaces in place", async () => {
        PgCustomRpcs.save(TRITON);
        const health = healthOf("answered");
        await saveCheckedWith(health)(
          { name: "Triton", url: "https://t2.test" },
          "https://t.test/"
        );
        expect(health).toHaveBeenCalledWith("https://t2.test/");
        expect(PgCustomRpcs.list()).toEqual([
          { name: "Triton", url: "https://t2.test/" },
        ]);
      });

      it("refuses a URL another tab saved while it was being checked", async () => {
        const health = vi.fn(async () => {
          PgCustomRpcs.save({ name: "Elsewhere", url: TRITON.url });
          return "answered" as const;
        });
        const checked = await saveCheckedWith(health)(TRITON, undefined);
        expect(checked).toMatchObject({
          kind: "done",
          result: { ok: false, reason: "duplicate", name: "Elsewhere" },
        });
      });
    });

    describe("answerFor", () => {
      const savedRpc = { name: "Triton", url: "https://t.test/" };

      it("tracks a checked save with check passed and calls onSaved", () => {
        const onSaved = vi.fn();
        const answer = answerFor(onSaved)("add")({
          kind: "done",
          result: { ok: true, rpc: savedRpc },
          check: "passed",
        });
        expect(answer).toEqual({ ok: true });
        expect(onSaved).toHaveBeenCalledWith(savedRpc);
        expect(tracked()).toEqual([
          ["settings_custom_rpc_saved", { mode: "add", check: "passed" }],
        ]);
      });

      it("answers a refusal with Spec 07's line", () => {
        const answer = answerFor(vi.fn())("edit")({
          kind: "done",
          result: { ok: false, reason: "duplicate", name: "Helius" },
          check: "none",
        });
        expect(answer).toEqual({
          ok: false,
          error: "Already saved as Helius.",
        });
        expect(tracked()).toEqual([
          ["settings_custom_rpc_refused", { reason: "duplicate" }],
        ]);
      });

      it.each([
        ["no_answer", "This URL is not responding."],
        ["offline", "You're offline, so this URL can't be checked."],
      ] as const)(
        "offers Use anyway on %s, and tracks it apart",
        (reason, line) => {
          const onSaved = vi.fn();
          const answer = answerFor(onSaved)("add")({
            kind: "unreachable",
            reason,
            useAnyway: () => ({ ok: true, rpc: savedRpc }),
          });
          if (answer.ok || !answer.useAnyway) throw new Error("no Use anyway");
          expect(answer.error).toBe(line);
          expect(onSaved).not.toHaveBeenCalled();
          expect(answer.useAnyway()).toEqual({ ok: true });
          expect(onSaved).toHaveBeenCalledWith(savedRpc);
          expect(tracked()).toEqual([
            ["settings_custom_rpc_refused", { reason }],
            [
              "settings_custom_rpc_saved",
              { mode: "add", check: "used_anyway" },
            ],
          ]);
        }
      );

      it("carries no URL, host or name in any event", () => {
        answerFor(vi.fn())("add")({
          kind: "unreachable",
          reason: "no_answer",
          useAnyway: () => ({ ok: true, rpc: savedRpc }),
        });
        expect(JSON.stringify(events.events)).not.toMatch(/t\.test|Triton/);
      });
    });
  });
}
