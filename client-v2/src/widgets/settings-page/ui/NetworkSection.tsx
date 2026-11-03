import { useEffect, useState } from "react";

import { DEFAULT_ENDPOINT, NETWORKS } from "@/constants";
import { PgCustomRpcs } from "@/entities/custom-rpc";
import type { CustomRpc, SaveResult } from "@/entities/custom-rpc";
import { Button } from "@/shared/ui/button";
import { useRenderOnChange } from "@/hooks";
import { PgSettings, PgView } from "@/utils";
import type { ToastChildProps } from "@/utils/view";
import { settingsTelemetry } from "../model/telemetry";
import BaseCustomRpcs from "./BaseCustomRpcs";
import type { CustomRpcSaveAnswer } from "./BaseCustomRpcs";
import BaseNetworkChoice from "./BaseNetworkChoice";

const OFFERED = NETWORKS.map((n) => n.value);

/** The line under the URL field for a refused save (Spec 07's copy) */
const refusal = (result: Exclude<SaveResult, { ok: true }>) =>
  result.reason === "format"
    ? "Enter a URL that starts with https://"
    : `Already saved as ${result.name}.`;

/** The toast after a remove, with the Undo that puts the RPC back */
const Removed = ({
  id,
  name,
  picked,
  onUndo,
}: ToastChildProps & { name: string; picked: boolean; onUndo: () => void }) => (
  <span className="flex items-center gap-3">
    <span>
      {picked ? `Removed ${name}. Network is Devnet now.` : `Removed ${name}.`}
    </span>
    <Button
      variant="ghost"
      size="sm"
      onClick={() => {
        onUndo();
        PgView.closeToast(id);
      }}
    >
      Undo
    </Button>
  </span>
);

/**
 * The Network section on the live settings: the chips, Devnet, Mainnet and
 * each saved custom RPC, and the list that adds, edits and removes them.
 */
const NetworkSection = () => {
  // The chips follow an endpoint picked elsewhere too, such as the
  // Connection section's Endpoint select
  useRenderOnChange(PgSettings.onDidChangeConnectionEndpoint);
  const endpoint = PgSettings.connection.endpoint;

  const [rpcs, setRpcs] = useState<CustomRpc[]>(PgCustomRpcs.list);
  useEffect(() => {
    const changes = PgCustomRpcs.onDidChange(() =>
      setRpcs(PgCustomRpcs.list())
    );
    // A custom endpoint set before the list existed, or elsewhere, is listed
    const endpoints = PgSettings.onDidChangeConnectionEndpoint((url) => {
      if (typeof url === "string") PgCustomRpcs.adopt(url, OFFERED);
    });
    PgCustomRpcs.adopt(PgSettings.connection.endpoint, OFFERED);
    return () => {
      changes.dispose();
      endpoints.dispose();
    };
  }, []);

  const pick = (url: string) => (PgSettings.connection.endpoint = url);

  /** Report a save's result; a refusal becomes the line under the field */
  const answer = (
    result: SaveResult,
    mode: "add" | "edit"
  ): CustomRpcSaveAnswer => {
    if (!result.ok) {
      settingsTelemetry.track("settings_custom_rpc_refused", {
        reason: result.reason,
      });
      return { ok: false, error: refusal(result) };
    }
    settingsTelemetry.track("settings_custom_rpc_saved", { mode });
    return { ok: true };
  };

  // A new RPC is picked at once
  const add = (input: CustomRpc) => {
    const result = PgCustomRpcs.save(input);
    if (result.ok) pick(result.rpc.url);
    return answer(result, "add");
  };

  // An edited RPC keeps the connection on it when it was the one in use
  const edit = (rpc: CustomRpc, input: CustomRpc) => {
    const picked = PgSettings.connection.endpoint === rpc.url;
    const result = PgCustomRpcs.replace(rpc.url, input);
    if (result.ok && picked) pick(result.rpc.url);
    return answer(result, "edit");
  };

  const remove = (rpc: CustomRpc) => {
    const picked = PgSettings.connection.endpoint === rpc.url;
    const removed = PgCustomRpcs.remove(rpc.url);
    if (!removed) return;
    if (picked) pick(DEFAULT_ENDPOINT);
    settingsTelemetry.track("settings_custom_rpc_removed", { picked });
    PgView.setToast(Removed, {
      componentProps: {
        name: rpc.name,
        picked,
        onUndo: () => {
          PgCustomRpcs.restore(removed.rpc, removed.index);
          if (picked) pick(removed.rpc.url);
        },
      },
      options: { name: "custom-rpc-removed" },
    });
  };

  return (
    <div className="flex flex-col gap-3">
      <BaseNetworkChoice endpoint={endpoint} custom={rpcs} onPick={pick} />
      <BaseCustomRpcs rpcs={rpcs} onAdd={add} onEdit={edit} onRemove={remove} />
    </div>
  );
};

export default NetworkSection;
