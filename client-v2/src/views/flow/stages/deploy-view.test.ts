// The Deploy stage's one view, from the stage's run, the global deploy state
// and the flow's last result.
import { describe, expect, it } from "vitest";

import type { StageDeployState } from "@/features/deploy";

import { deployView, IDLE_VIEW } from "./deploy-view";

const WALLET = "7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU";

/** The stage open on devnet, project "counter", the Playground wallet current */
const here = deployView({
  cluster: "devnet",
  workspace: "counter",
  wallet: WALLET,
});

const DETAIL = {
  reason: "airdrop_failed",
  balance: 0,
  needed: 1_000_000_000,
  address: WALLET,
  cause: "429",
} as const;

const fundingStopOn = (
  cluster: string,
  workspace: string
): StageDeployState => ({
  phase: "stopped",
  stop: { kind: "funding", detail: DETAIL, cluster, workspace },
});
const FUNDING_HERE = fundingStopOn("devnet", "counter");

const DONE_WITH_BACKUP: StageDeployState = { phase: "done", backupFor: WALLET };

describe("deployView", () => {
  it("shows only the running deploy when the terminal deploys over a funding stop", () => {
    expect(
      here({
        stage: FUNDING_HERE,
        deployState: "loading",
        flowDeploy: "failed",
      })
    ).toEqual({ kind: "running", askingStaleBuild: false });
  });

  it("shows only the running deploy when the terminal deploys after a backup line", () => {
    expect(
      here({
        stage: DONE_WITH_BACKUP,
        deployState: "loading",
        flowDeploy: "done",
      })
    ).toEqual({ kind: "running", askingStaleBuild: false });
  });

  it("asks about the stale build only while the stage's own run waits on it", () => {
    expect(
      here({
        stage: { phase: "running", askingStaleBuild: true },
        deployState: "loading",
        flowDeploy: "active",
      })
    ).toEqual({ kind: "running", askingStaleBuild: true });
  });

  it("shows the funding card for a stop on the project and network open now", () => {
    expect(
      here({ stage: FUNDING_HERE, deployState: "ready", flowDeploy: "failed" })
    ).toEqual({ kind: "funding", stop: DETAIL });
  });

  it("shows a failure, not the card, for a funding stop on another network", () => {
    expect(
      here({
        stage: fundingStopOn("testnet", "counter"),
        deployState: "ready",
        flowDeploy: "failed",
      })
    ).toEqual({ kind: "failed" });
  });

  it("shows no card for a funding stop in another project", () => {
    expect(
      here({
        stage: fundingStopOn("devnet", "other"),
        deployState: "ready",
        flowDeploy: "active",
      })
    ).toEqual(IDLE_VIEW);
  });

  it("treats a cancelled run as no failure", () => {
    expect(
      here({
        stage: { phase: "stopped", stop: { kind: "cancelled" } },
        deployState: "ready",
        flowDeploy: "failed",
      })
    ).toEqual(IDLE_VIEW);
  });

  it("offers the backup line for the wallet it was shown for, after a deploy", () => {
    const run = {
      stage: DONE_WITH_BACKUP,
      deployState: "ready",
      flowDeploy: "done",
    } as const;
    expect(here(run)).toEqual({ kind: "idle", backup: true });
    expect(
      deployView({
        cluster: "devnet",
        workspace: "counter",
        wallet: "another wallet",
      })(run)
    ).toEqual(IDLE_VIEW);
  });
});
