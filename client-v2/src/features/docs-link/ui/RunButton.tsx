import type { FC } from "react";

import { reportButtonFailure } from "@/shared/lib/report-button-failure";

import { PgClientRun } from "../model/run";
import BaseRunButton from "./BaseRunButton";
import { useLinkState, useRunState } from "./use-run-state";

const ENDED = new Set(["done", "failed", "missing-package"]);

/** The stage row's Run, connected to the run store */
const RunButton: FC = () => {
  const state = useRunState();
  // "This link is broken" opened no project: there is nothing to run
  const link = useLinkState();
  // eslint-disable-next-line unicorn/no-null -- a component that draws nothing returns `null`; React's types refuse `undefined`
  if (link.kind === "broken") return null;
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
