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
  /** A deploy spends real money: the line's dot turns amber */
  realSol: boolean;
}> = [
  {
    label: "Devnet",
    endpoint: Endpoint.DEVNET,
    line: "Deploys with free devnet SOL",
    realSol: false,
  },
  {
    label: "Testnet",
    endpoint: Endpoint.TESTNET,
    line: "Deploys with free testnet SOL",
    realSol: false,
  },
  {
    label: "Localnet",
    endpoint: Endpoint.LOCALNET,
    line: "Deploys with your local SOL",
    realSol: false,
  },
  ...PLATFORM_ENDPOINTS.map(({ name, value, cluster }) => ({
    label: name,
    endpoint: value,
    line:
      cluster === "mainnet-beta"
        ? REAL_SOL
        : `Deploys with free ${cluster} SOL`,
    realSol: cluster === "mainnet-beta",
  })),
  {
    label: "Mainnet Beta",
    endpoint: Endpoint.MAINNET_BETA,
    line: REAL_SOL,
    realSol: true,
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
          // The arrows move the choice and loop. Reaching Custom they move
          // only the focus, since choosing it means asking for a URL: only a
          // press on it (its `onClick`) asks
          onValueChange={(v) => {
            if (v !== CUSTOM) onPick(v);
          }}
        >
          {[...NETWORKS, { label: "Custom", endpoint: CUSTOM }].map((n) => (
            <SegmentedItem
              key={n.endpoint}
              value={n.endpoint}
              // A click, Enter or Space on Custom, current or not
              onClick={n.endpoint === CUSTOM ? onCustom : undefined}
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
          <StatusDot variant={listed.realSol ? "warning" : "success"} />
          {listed.line}
        </p>
      )}
    </>
  );
};

export default BaseNetworkChoice;
