import { useEffect, useState } from "react";

import BaseBuild from "./BaseBuild";
import IdlActions from "./IdlActions";
import { parseBuildReport } from "./build-report";
import { buildSurface, ownOutput } from "./build-surface";
import { diagnosticView } from "./build-view";
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

  // `PgBuildOutput` keeps one value for the whole session, so a report from
  // the project opened before this one is still sitting in `out`. Anything
  // another workspace recorded is not this surface's to show.
  const own = ownOutput(out, PgExplorer.currentWorkspaceName ?? null);
  const surface = buildSurface({ flow, own });
  const report =
    surface.kind === "failed" ? parseBuildReport(surface.stderr) : null;
  const diagnostics = (report?.diagnostics ?? []).map((d) =>
    diagnosticView(d, d.file ? PgExplorer.getFileContent(d.file) ?? null : null)
  );

  return (
    <BaseBuild
      surface={surface}
      building={flow.build === "running"}
      host={serverHost()}
      ms={flow.buildMs}
      diagnostics={diagnostics}
      // `countErrors` (the stepper badge's own count) and `parseBuildReport`
      // share one parsing convention, but rustc output that convention can't
      // split still leaves the badge with a count and this surface with
      // none -- fall back to the stepper's count rather than "0 errors"
      // next to raw compiler output that says otherwise.
      errorCount={diagnostics.length || flow.buildErrorCount}
      raw={report?.raw ?? ""}
      onBuild={() => PgCommand.build.execute()}
      onContinue={() => PgFlow.setStage("deploy")}
      onExport={() => PgFramework.exportWorkspace()}
      onFix={(prompt) => PgAssistant.requestPrompt(prompt)}
      onOpenFile={(path) => PgExplorer.openFile(path)}
      idlActions={<IdlActions showGenerate />}
    />
  );
};

export default Build;
