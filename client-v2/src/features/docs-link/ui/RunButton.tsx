import type { FC } from "react";

import { reportButtonFailure } from "@/shared/lib/report-button-failure";

import BaseRunButton from "./BaseRunButton";
import { useRunState } from "./use-run-state";
import { PgClientRun } from "../model/run";

const ENDED = new Set(["done", "failed", "missing-package"]);

/** The stage row's Run, connected to the run store */
const RunButton: FC = () => {
  const state = useRunState();
  return (
    <BaseRunButton
      running={state.kind === "running"}
      ran={ENDED.has(state.kind)}
      onRun={() => {
        PgClientRun.start().catch(reportButtonFailure("run the script"));
      }}
    />
  );
};

export default RunButton;
