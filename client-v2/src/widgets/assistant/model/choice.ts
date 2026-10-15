import {
  PROVIDERS,
  type Effort,
  type ProviderId,
} from "../../../views/sidebar/assistant/model/types";
import type { Connection } from "../../../views/sidebar/assistant/store";
import type { DefaultBackend } from "./default-backend";
import { displayModelName } from "./model-name";

/** What the composer's model button shows */
export type ModelShown =
  /** The deployment's default is still being asked about: nothing to offer yet */
  | { kind: "checking" }
  /** Nothing to send to: the button opens Connect a model */
  | { kind: "none" }
  /** The deployment's default, connected or about to be on the first send */
  | { kind: "default"; label: string; connected: boolean }
  /** A key-based backend */
  | {
      kind: "keyed";
      provider: ProviderId;
      label: string;
      effort: { value: Effort; ladder: readonly Effort[] } | null;
    };

/** One entry of the model menu */
export interface ModelOption {
  provider: ProviderId;
  /** The model id, or `null` for the default backend's server-side pick */
  model: string | null;
  label: string;
}

const DEFAULT_LABEL = "Default model";

const defaultLabel = (backend: DefaultBackend) => {
  if (backend.state === "present" && backend.model !== null) {
    return displayModelName(backend.model);
  }
  return DEFAULT_LABEL;
};

/** What the model button shows for the current connection, or for the default about to be used */
export const modelShown = (
  connection: Connection | null,
  defaultBackend: DefaultBackend
): ModelShown => {
  if (connection === null) {
    if (defaultBackend.state === "checking") return { kind: "checking" };
    if (defaultBackend.state !== "present") return { kind: "none" };
    return {
      kind: "default",
      label: defaultLabel(defaultBackend),
      connected: false,
    };
  }
  if (connection.id === "default") {
    return {
      kind: "default",
      label: defaultLabel(defaultBackend),
      connected: true,
    };
  }
  // A connection with no model of its own gets the provider's default, as
  // `createProvider` does
  const info = PROVIDERS.find((p) => p.id === connection.id);
  const settings = connection.settings ?? info?.modelSettings?.defaults;
  if (settings) {
    return {
      kind: "keyed",
      provider: connection.id,
      label: displayModelName(settings.model),
      effort: {
        value: settings.effort,
        ladder: info?.modelSettings?.efforts ?? [],
      },
    };
  }
  const endpoint = connection.endpoint ?? info?.endpoint;
  return {
    kind: "keyed",
    provider: connection.id,
    label: endpoint ? displayModelName(endpoint.model) : DEFAULT_LABEL,
    effort: null,
  };
};

/** The model menu: the deployment's default first, then each provider's listed models */
export const modelOptions = (defaultBackend: DefaultBackend): ModelOption[] => {
  const options: ModelOption[] = [];
  if (defaultBackend.state === "present") {
    options.push({
      provider: "default",
      model: null,
      label: defaultLabel(defaultBackend),
    });
  }
  for (const info of PROVIDERS) {
    const models = [
      ...(info.modelSettings?.models ?? []),
      ...(info.endpoint?.models ?? []),
    ];
    for (const model of models) {
      options.push({
        provider: info.id,
        model,
        label: displayModelName(model),
      });
    }
  }
  return options;
};
