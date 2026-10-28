import { useEffect, useState } from "react";

import BaseBuild from "./BaseBuild";
import IdlActions from "./IdlActions";
import { buildSurface, ownOutput } from "./build-surface";
import { toldByStage } from "./stage-failure";
import { failedView } from "./build-view";
import { PgBuildOutput } from "../../sidebar/assistant/bridge/build-output";
import type { BuildOutput } from "../../sidebar/assistant/bridge/build-output";
import { PgAssistant } from "../../sidebar/assistant/store";
import { PgFlow } from "../state/stage";
import type { FlowState } from "../state/stage";
import { PgCommand, PgExplorer, PgFramework, PgSettings } from "../../../utils";

/**
 * The build server's host, for naming it in the UI. Falls back to the raw
 * setting: the value is parsed as a URL when it is set, but this also runs
 * on the surface that reports an unreachable server, where throwing would
 * replace the diagnosis with a blank stage.
 */
const serverHost = () => {
  const endpoint = PgSettings.server.endpoint;
  try {
    return new URL(endpoint).host;
  } catch {
    return endpoint;
  }
};

/** Spec 08's slow threshold for Build (draft, "to agree with dev") */
const SLOW_BUILD_MS = 60_000;

/**
 * Whether the build that started at `startedAt` has run past
 * `SLOW_BUILD_MS`. Counted from the run's own start, so a remount mid-run
 * does not restart the clock.
 */
const useSlowBuild = (building: boolean, startedAt: number | null) => {
  const [slow, setSlow] = useState(false);
  useEffect(() => {
    setSlow(false);
    if (!building) return;
    const left = SLOW_BUILD_MS - (Date.now() - (startedAt ?? Date.now()));
    const timer = setTimeout(() => setSlow(true), Math.max(0, left));
    return () => clearTimeout(timer);
  }, [building, startedAt]);
  return slow;
};

/** The Build stage, connected: the flow, this workspace's report, commands */
const Build = () => {
  const [out, setOut] = useState<BuildOutput | null>(null);
  const [flow, setFlow] = useState<FlowState>(PgFlow.state);

  useEffect(() => {
    const a = PgBuildOutput.onDidChange(setOut);
    const b = PgFlow.onDidChange(setFlow);
    return () => {
      a.dispose();
      b.dispose();
    };
  }, []);

  const building = flow.build === "running";
  const slow = useSlowBuild(building, flow.buildStartedAt);
  const own = ownOutput(out, PgExplorer.currentWorkspaceName ?? null);
  const surface = buildSurface({ flow, own });

  return (
    <BaseBuild
      surface={
        surface.kind === "failed"
          ? {
              kind: "failed",
              ...failedView(
                surface.stderr,
                flow.buildErrorCount,
                (path) => PgExplorer.getFileContent(path) ?? null
              ),
            }
          : surface
      }
      building={building}
      slow={slow}
      host={serverHost()}
      serverUrl={PgSettings.server.endpoint}
      ms={flow.buildMs}
      // The stage's catch rethrows; BaseBuild's buttons report what is left
      onBuild={() => PgCommand.build.execute().catch(toldByStage("build"))}
      onContinue={() => PgFlow.setStage("deploy")}
      onExport={() => PgFramework.exportWorkspace()}
      onAsk={(prompt) => PgAssistant.requestPrompt(prompt)}
      onOpenFile={(path) => PgExplorer.openFile(path)}
      idlActions={<IdlActions mode="download" />}
    />
  );
};

export default Build;
