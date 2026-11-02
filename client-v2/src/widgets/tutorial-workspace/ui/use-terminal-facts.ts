import { useEffect, useState } from "react";

import { PgExplorer, PgProgramInfo } from "@/utils";
import { PgBuildOutput } from "@/views/sidebar/assistant/bridge/build-output";
import { parseBuildReport } from "@/views/flow/stages/build-report";
import { PgFlow } from "@/views/flow/state/stage";
import type { FlowState } from "@/views/flow/state/stage";
import type { LastRun, TerminalFacts } from "../model/terminal";

/** The first diagnostic of the last failed build, if the compiler named one */
export const firstDiagnostic = () => {
  const out = PgBuildOutput.latest;
  return out ? parseBuildReport(out.stderr).diagnostics[0] ?? null : null;
};

/** The instruction names of the IDL the last good build made */
const instructions = (): string[] =>
  PgProgramInfo.idl?.instructions.map((ix) => ix.name) ?? [];

/** What finished last, read off a change of `PgFlow`'s state */
const finished = (prev: FlowState, next: FlowState): LastRun | null => {
  if (prev.build === "running" && next.build !== "running") {
    return next.build === "failed"
      ? { kind: "build", ok: false, line: firstDiagnostic()?.line ?? null }
      : { kind: "build", ok: true, instructions: instructions() };
  }
  if (prev.deploy === "running" && next.deploy !== "running") {
    return { kind: "deploy", ok: next.deploy === "done" };
  }
  return null;
};

/** What a reload knows: the workspace's record, read back by `PgFlow` */
const restored = (flow: FlowState): LastRun | null => {
  if (flow.deploy === "done") return { kind: "deploy", ok: true };
  if (flow.build === "failed") {
    return { kind: "build", ok: false, line: firstDiagnostic()?.line ?? null };
  }
  if (flow.build === "done") {
    return { kind: "build", ok: true, instructions: instructions() };
  }
  return null;
};

const contentOf = (path: string) => {
  const full = PgExplorer.convertToFullPath(path);
  return PgExplorer.files[full] ? PgExplorer.getFileContent(full) ?? "" : null;
};

/**
 * The terminal bar's facts, kept up from `PgFlow`, the build's output and
 * the explorer's saves. `files` are the tutorial's files: a save that makes
 * one differ from what the last good deploy shipped turns the bar amber. The
 * deployed copy is the visit's, so after a reload no edit reads as amber
 * until the next deploy.
 */
export const useTerminalFacts = (files: string[]): TerminalFacts => {
  const [facts, setFacts] = useState<TerminalFacts>(() => ({
    running: null,
    last: restored(PgFlow.state),
    changed: null,
  }));
  const key = files.join("\n");

  useEffect(() => {
    let prev = PgFlow.state;
    let deployed: Map<string, string | null> | null = null;
    const changedFile = () => {
      if (!deployed) return null;
      for (const [path, content] of deployed) {
        if (contentOf(path) !== content) return path.split("/").pop() ?? path;
      }
      return null;
    };
    const flow = PgFlow.onDidChange((next) => {
      const done = finished(prev, next);
      if (done?.kind === "deploy" && done.ok) {
        deployed = new Map(key.split("\n").map((p) => [p, contentOf(p)]));
      }
      let running: TerminalFacts["running"] = null;
      if (next.build === "running") running = "build";
      else if (next.deploy === "running") running = "deploy";
      const fresh = next.build === "upcoming" && next.deploy === "upcoming";
      // The workspace's record read back (`restore`), not a run finishing
      const readBack = prev.build === "upcoming" && !fresh && running === null;
      setFacts((f) => {
        let last = f.last;
        if (done) last = done;
        else if (fresh) last = null;
        else if (readBack) last = restored(next);
        return {
          running,
          last,
          changed: done?.kind === "deploy" ? null : changedFile(),
        };
      });
      prev = next;
    });
    // The failed build's line comes with its output, a moment after the event
    const output = PgBuildOutput.onDidChange(() =>
      setFacts((f) =>
        f.last?.kind === "build" && !f.last.ok
          ? { ...f, last: { ...f.last, line: firstDiagnostic()?.line ?? null } }
          : f
      )
    );
    const saved = PgExplorer.onDidSaveFile(() =>
      setFacts((f) => ({ ...f, changed: changedFile() }))
    );
    return () => {
      flow.dispose();
      output.dispose();
      saved.dispose();
    };
  }, [key]);

  return facts;
};
