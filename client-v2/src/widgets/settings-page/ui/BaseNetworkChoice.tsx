import { useId } from "react";

import { Endpoint, PLATFORM_ENDPOINTS } from "@/constants";
import { Segmented, SegmentedItem } from "@/shared/ui/segmented";

// `string`, not `Endpoint`: platform endpoints are build-time URLs, not enum
// members. `line` is Spec 03's picker line; the other networks' lines come
// with the picker's redesign.
const NETWORKS: ReadonlyArray<{
  label: string;
  endpoint: string;
  line?: string;
}> = [
  { label: "Devnet", endpoint: Endpoint.DEVNET },
  { label: "Testnet", endpoint: Endpoint.TESTNET },
  { label: "Localnet", endpoint: Endpoint.LOCALNET },
  ...PLATFORM_ENDPOINTS.map(({ name, value }) => ({
    label: name,
    endpoint: value,
  })),
  {
    label: "Mainnet Beta",
    endpoint: Endpoint.MAINNET_BETA,
    line: "Deploys with real SOL",
  },
];

/**
 * The network chips, with the checked network's line under them. An endpoint
 * no chip lists (Playnet, a custom URL) leaves none checked.
 */
const BaseNetworkChoice = ({
  endpoint,
  onPick,
  onChoose,
}: {
  endpoint: string;
  onPick: (endpoint: string) => void;
  /**
   * Any pick, the network already chosen included, which changes nothing and
   * so fires no `onPick`: "Choose a network" counts it
   */
  onChoose?: (endpoint: string) => void;
}) => {
  const picked = NETWORKS.find((n) => n.endpoint === endpoint);
  const lineId = useId();
  return (
    <div className="flex flex-col gap-2">
      <Segmented
        variant="chips"
        aria-label="Network"
        aria-describedby={picked?.line ? lineId : undefined}
        value={picked ? endpoint : ""}
        onValueChange={(e) => {
          onPick(e);
          onChoose?.(e);
        }}
      >
        {NETWORKS.map((n) => (
          <SegmentedItem
            key={n.endpoint}
            value={n.endpoint}
            className="font-mono"
            onClick={() => {
              if (n.endpoint === endpoint) onChoose?.(n.endpoint);
            }}
          >
            {n.label}
          </SegmentedItem>
        ))}
      </Segmented>
      {picked?.line && (
        <span id={lineId} className="text-xs text-muted-foreground">
          {picked.line}
        </span>
      )}
    </div>
  );
};

export default BaseNetworkChoice;
