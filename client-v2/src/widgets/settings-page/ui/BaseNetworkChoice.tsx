import { Endpoint, PLATFORM_ENDPOINTS } from "@/constants";
import { Segmented, SegmentedItem } from "@/shared/ui/segmented";
import { StatusDot } from "@/shared/ui/status-dot";

const REAL_SOL = "Deploys with real SOL";

/** Stands for any URL no chip lists; never an endpoint itself */
const CUSTOM = "custom";

// `string`, not `Endpoint`: platform endpoints are build-time URLs, not enum
// members. `line` says how a deploy works there, in Spec 03's words.
const NETWORKS: ReadonlyArray<{
  label: string;
  endpoint: string;
  line: string;
}> = [
  {
    label: "Devnet",
    endpoint: Endpoint.DEVNET,
    line: "Deploys with free devnet SOL",
  },
  {
    label: "Testnet",
    endpoint: Endpoint.TESTNET,
    line: "Deploys with free testnet SOL",
  },
  {
    label: "Localnet",
    endpoint: Endpoint.LOCALNET,
    line: "Deploys with your local SOL",
  },
  ...PLATFORM_ENDPOINTS.map(({ name, value, cluster }) => ({
    label: name,
    endpoint: value,
    line:
      cluster === "mainnet-beta"
        ? REAL_SOL
        : `Deploys with free ${cluster} SOL`,
  })),
  {
    label: "Mainnet Beta",
    endpoint: Endpoint.MAINNET_BETA,
    line: REAL_SOL,
  },
];

/**
 * The one network control: the chips, then Custom for any other URL, and
 * under them how a deploy works on the network picked. Playnet, which no chip
 * lists, leaves none checked.
 */
const BaseNetworkChoice = ({
  endpoint,
  onPick,
  onCustom,
}: {
  endpoint: string;
  onPick: (endpoint: string) => void;
  /** Custom: asks for a URL; the endpoint changes only once one is saved */
  onCustom: () => void;
}) => {
  const listed = NETWORKS.find((n) => n.endpoint === endpoint);
  const custom = !listed && endpoint !== Endpoint.PLAYNET;
  let value = "";
  if (listed) value = endpoint;
  else if (custom) value = CUSTOM;
  return (
    <>
      <div className="px-4 py-4">
        <Segmented
          variant="chips"
          aria-label="Network"
          value={value}
          onValueChange={(v) => (v === CUSTOM ? onCustom() : onPick(v))}
        >
          {[...NETWORKS, { label: "Custom", endpoint: CUSTOM }].map((n) => (
            <SegmentedItem
              key={n.endpoint}
              value={n.endpoint}
              // A press on Custom while it is current edits the URL
              onClick={n.endpoint === CUSTOM && custom ? onCustom : undefined}
              // A fingertip tall on a phone, as the prototype's network chips
              className="max-md:h-11 max-md:px-4 max-md:text-control"
            >
              {n.label}
            </SegmentedItem>
          ))}
        </Segmented>
      </div>
      {listed && (
        // The card's foot: how a deploy works here, amber where SOL is real
        <p className="flex items-center gap-2 bg-surface-raised/50 px-4 py-2.5 text-xs text-muted-foreground max-md:text-caption max-md:font-read">
          <StatusDot
            variant={
              listed.endpoint === Endpoint.MAINNET_BETA ||
              listed.line.includes("real")
                ? "warning"
                : "success"
            }
          />
          {listed.line}
        </p>
      )}
    </>
  );
};

export default BaseNetworkChoice;
