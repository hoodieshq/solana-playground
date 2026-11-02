import { PLATFORM_RPC_URLS } from "../shared/config/client-env";

/** RPC endpoint */
export enum Endpoint {
  PLAYNET = "http://playnet",
  LOCALNET = "http://localhost:8899",
  DEVNET = "https://api.devnet.solana.com",
  TESTNET = "https://api.testnet.solana.com",
  MAINNET_BETA = "https://api.mainnet-beta.solana.com",
}

/** Cluster moniker an offered network talks to */
type NetworkCluster = "devnet" | "mainnet-beta";

/** A network Settings offers: one of ours, named as the cluster */
export interface Network {
  name: string;
  value: string;
  cluster: NetworkCluster;
}

/** Configured platform RPC URLs, keyed by cluster */
interface PlatformRpcUrls {
  devnet?: string;
  mainnet?: string;
}

/**
 * The networks Settings offers: Devnet and Mainnet, each on the platform RPC
 * the env configures, else on the public one. The public RPCs rate-limit a
 * shared app, so they are only the fallback, never listed beside ours.
 */
export const buildNetworks = (urls: PlatformRpcUrls): Network[] => [
  // `||` not `??`: sourcing an env file leaves unfilled keys as "", which is
  // not nullish and would win.
  { name: "Devnet", value: urls.devnet || Endpoint.DEVNET, cluster: "devnet" },
  {
    name: "Mainnet",
    value: urls.mainnet || Endpoint.MAINNET_BETA,
    cluster: "mainnet-beta",
  },
];

/** The networks Settings offers, Devnet first */
export const NETWORKS = buildNetworks(PLATFORM_RPC_URLS);

/** Default RPC endpoint: the offered Devnet */
export const DEFAULT_ENDPOINT = NETWORKS[0].value;

const CLUSTER_NAMES: Record<string, string> = {
  devnet: "Devnet",
  "mainnet-beta": "Mainnet",
  testnet: "Testnet",
  localnet: "Localnet",
  playnet: "Playnet",
};

/**
 * A cluster's name as a person reads it: a proper noun, so capitalised, and
 * "Mainnet" for the `mainnet-beta` moniker, which URLs, CLI flags and
 * telemetry keep. An unknown moniker comes back as it is.
 */
export function clusterName(cluster: string): string;
export function clusterName(cluster: string | null): string | null;
export function clusterName(cluster: string | null): string | null {
  if (cluster === null) return null;
  return CLUSTER_NAMES[cluster] ?? cluster;
}
