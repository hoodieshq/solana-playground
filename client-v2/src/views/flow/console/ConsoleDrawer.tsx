import type { FC } from "react";
import { useEffect, useState } from "react";

import { createLogger } from "../../../shared/lib/logger";
import { PgTerminal } from "../../../utils";
import Terminal from "../../main/secondary/terminal/Component/Terminal";
import { PgBuildOutput } from "../../sidebar/assistant/bridge/build-output";
import { PgFlow } from "../state/stage";
import BaseConsoleDrawer from "./BaseConsoleDrawer";
import { describeConsoleStatus } from "./status";
import type { ConsoleStatus } from "./status";

const log = createLogger("flow:console");

interface ConsoleDrawerProps {
  open: boolean;
  onToggle: () => void;
}

/**
 * The console at the bottom of the centre column. The layout shell folds its
 * panel to the handle's height (`BOTTOM_BAR_PX`, which both read) rather
 * than unmounting it, so the xterm buffer (scrollback, running process)
 * survives while it is closed.
 */
const ConsoleDrawer: FC<ConsoleDrawerProps> = ({ open, onToggle }) => {
  const [status, setStatus] = useState<ConsoleStatus>(() =>
    describeConsoleStatus(PgFlow.state)
  );

  useEffect(() => {
    const b = PgFlow.onDidChange((flow) =>
      setStatus(describeConsoleStatus(flow))
    );
    // `PgBuildOutput` fills in slightly after the `build-finish` event that
    // sets `flow.build`, and it carries the diagnostic code a failed
    // status line needs -- recompute once it lands so a failed build never
    // gets stuck on the bare "build failed" fallback.
    const c = PgBuildOutput.onDidChange(() =>
      setStatus(describeConsoleStatus(PgFlow.state))
    );
    return () => {
      b.dispose();
      c.dispose();
    };
  }, []);

  const clear = () => {
    PgTerminal.clear().catch((error: unknown) =>
      log.error(error, { report: true, context: { action: "clear" } })
    );
  };

  return (
    <BaseConsoleDrawer
      open={open}
      onToggle={onToggle}
      status={status}
      onClear={clear}
    >
      <Terminal />
    </BaseConsoleDrawer>
  );
};

export default ConsoleDrawer;
