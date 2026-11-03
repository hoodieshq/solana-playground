import type { FC } from "react";

import { reportButtonFailure } from "@/shared/lib/report-button-failure";

import BaseRunCallout from "./BaseRunCallout";
import { useOpenedLink, useRunState } from "./use-run-state";
import { PgClientRun } from "../model/run";

/** The note above the code of a project with no program, connected */
const RunCallout: FC = () => {
  const state = useRunState();
  const link = useOpenedLink();
  return (
    <BaseRunCallout
      state={state}
      source={link && { title: link.title, from: link.from }}
      onRunAgain={() => {
        PgClientRun.start().catch(reportButtonFailure("run the script"));
      }}
      onCheckAgain={() => {
        PgClientRun.checkAgain().catch(
          reportButtonFailure("check the balance")
        );
      }}
      onNotNow={PgClientRun.dismissFunding}
      onCopyError={reportButtonFailure("copy the address")}
    />
  );
};

export default RunCallout;
