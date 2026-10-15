import { useEffect, useState } from "react";

import { createLogger } from "@/shared/lib/logger";
import { DEFAULT_BACKEND_URL } from "../../../views/sidebar/assistant/model/types";
import { assistantTelemetry } from "./telemetry";

const log = createLogger("assistant:connect");

/** What the deployment's keyless default backend answered */
export type DefaultBackend =
  | { state: "checking" }
  | { state: "absent" }
  | { state: "present"; model: string | null };

type ProbeFailure = "network" | "status" | "body";

let probe: Promise<DefaultBackend> | undefined;

/** Test-only: forget the cached answer so the next probe asks again */
export const resetDefaultBackendProbe = () => {
  probe = undefined;
};

const failed = (reason: ProbeFailure, error: unknown): DefaultBackend => {
  log.error(error, { report: true, context: { reason } });
  assistantTelemetry.track("assistant_default_probe_failed", { reason });
  return { state: "absent" };
};

const ask = async (): Promise<DefaultBackend> => {
  let res: Response;
  try {
    res = await fetch(DEFAULT_BACKEND_URL);
  } catch (error) {
    return failed("network", error);
  }
  if (!res.ok) {
    return failed(
      "status",
      new Error(`GET ${DEFAULT_BACKEND_URL}: ${res.status}`)
    );
  }

  let body: { configured?: unknown; model?: unknown } | null;
  try {
    body = await res.json();
  } catch (error) {
    return failed("body", error);
  }
  if (typeof body?.configured !== "boolean") {
    return failed("body", new Error("No boolean `configured` in the answer"));
  }
  if (!body.configured) return { state: "absent" };
  return {
    state: "present",
    model: typeof body.model === "string" ? body.model : null,
  };
};

/** Ask the server once per page whether its default backend is configured, and with which model */
export const probeDefaultBackend = (): Promise<DefaultBackend> => {
  probe ??= ask();
  return probe;
};

export const useDefaultBackend = (): DefaultBackend => {
  const [backend, setBackend] = useState<DefaultBackend>({ state: "checking" });

  useEffect(() => {
    let live = true;
    probeDefaultBackend().then((answer) => {
      if (live) setBackend(answer);
    });
    return () => {
      live = false;
    };
  }, []);

  return backend;
};
