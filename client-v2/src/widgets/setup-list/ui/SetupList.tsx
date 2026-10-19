import { useEffect } from "react";

import { isSetupRejected } from "@/commands/connect/setup-rejected";
import { isSignInFailure, PgSession } from "@/features/auth";
import { useRenderOnChange, useWallet } from "@/hooks";
import { createLogger } from "@/shared/lib/logger";
import { PgCommand, PgConnection, PgView } from "@/utils";
import { PgAssistant } from "@/views/sidebar/assistant/store";
import type { SetupStep, StepView } from "../model/steps";
import { setupMarks, useSetupMarks } from "../model/storage";
import { setupTelemetry } from "../model/telemetry";
import BaseSetupList from "./BaseSetupList";

const log = createLogger("setup-list:actions");

/** As the account menu shows an address */
const shortAddress = (address: string) =>
  `${address.slice(0, 4)}…${address.slice(-4)}`;

const warnWallet = () =>
  PgView.setToast(
    () => (
      <span>
        <strong>Couldn't connect the wallet.</strong> The console has the
        details.
      </span>
    ),
    { options: { name: "wallet-failed" } }
  );

export interface SetupListProps {
  /** Opens Connect a model; the assistant widget owns it */
  onConnectAssistant: () => void;
  /** Opens the settings on the network; the layout owns them */
  onChooseNetwork: () => void;
}

/**
 * "Get set up": the four steps' live state, and their actions. Gone for good
 * on this device once dismissed, or once all four were done together.
 */
const SetupList = ({ onConnectAssistant, onChooseNetwork }: SetupListProps) => {
  const marks = useSetupMarks();
  const cluster = useRenderOnChange(PgConnection.onDidChangeCluster);
  useRenderOnChange(PgSession.onDidChange);
  useRenderOnChange(PgAssistant.onDidChange);
  const wallet = useWallet();
  const user = PgSession.get();

  const steps: StepView[] = [
    { step: "assistant", done: PgAssistant.isConnected },
    { step: "network", done: marks.networkChosen, value: cluster ?? undefined },
    { step: "github", done: !!user, value: user?.login ?? undefined },
    {
      step: "wallet",
      done: !!wallet,
      value: wallet ? shortAddress(wallet.publicKey.toBase58()) : undefined,
    },
  ];
  const done = steps.filter((s) => s.done).length;
  const allDone = done === steps.length;

  useEffect(() => {
    if (!allDone || setupMarks.get().completed) return;
    setupMarks.mark({ completed: true });
    setupTelemetry.track("setup_completed", {});
  }, [allDone]);

  // Keyed by step, so a new step without an action does not compile
  const actions: Record<SetupStep, () => void> = {
    assistant: onConnectAssistant,
    network: onChooseNetwork,
    github: () => {
      PgSession.signIn().catch((error: unknown) => {
        // `PgSession.signInState` holds a known failure and the account row
        // shows it; `auth` telemetry has its reason
        if (isSignInFailure(error)) {
          log.info("sign-in failed", { context: { error: String(error) } });
          return;
        }
        log.error(error, { report: true, context: { step: "github" } });
      });
    },
    wallet: () => {
      // Rejects when the user closes the setup, which is their choice
      PgCommand.connect.execute().catch((error: unknown) => {
        if (isSetupRejected(error)) {
          log.info("wallet setup dismissed");
          return;
        }
        log.error(error, { report: true, context: { step: "wallet" } });
        warnWallet();
      });
    },
  };

  const pick = (step: SetupStep) => {
    setupTelemetry.track("setup_item_picked", { item: step });
    actions[step]();
  };

  const dismiss = () => {
    setupTelemetry.track("setup_dismissed", { done });
    setupMarks.mark({ dismissed: true });
  };

  // `allDone` too: the effect marks completion after this render, and the
  // list must not flash in between
  if (marks.dismissed || marks.completed || allDone) return null;

  return <BaseSetupList steps={steps} onPick={pick} onDismiss={dismiss} />;
};

export default SetupList;
