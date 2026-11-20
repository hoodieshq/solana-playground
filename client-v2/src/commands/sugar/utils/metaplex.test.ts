import { bundlrStorage } from "@metaplex-foundation/js";

import { TEST_ENDPOINT } from "../../../test-utils/endpoints.mjs";
import { getMetaplex } from "./metaplex";

vi.mock("@metaplex-foundation/js", () => {
  const metaplex = { use: () => metaplex };
  return {
    Metaplex: { make: () => metaplex },
    bundlrStorage: vi.fn(),
    walletAdapterIdentity: vi.fn(),
  };
});
vi.mock("@/entities/cluster", () => ({
  getConnectionFor: () => (endpoint: string) => ({ rpcEndpoint: endpoint }),
}));
vi.mock("../constants", async () => ({
  BundlrEnpoints: (await import("../constants/bundlr")).BundlrEnpoints,
}));
vi.mock("../../../utils", async () => ({
  PgConnection: {
    // Without an endpoint, `PgConnection.getCluster` reads the selected one
    getCluster: async (endpoint: string | undefined) =>
      (endpoint ?? "devnet").includes("devnet") ? "devnet" : "mainnet",
  },
  PgSettings: {
    connection: {
      endpoint: (await import("../../../test-utils/endpoints.mjs"))
        .TEST_ENDPOINT.DEVNET,
    },
  },
  PgWallet: { current: {} },
}));

/**
 * Bundlr pays for uploads in SOL over `providerUrl`. Left undefined, it
 * overrides Metaplex's own default (the connection's endpoint) and Bundlr
 * falls back to mainnet-beta whatever cluster the Playground is on.
 */
describe("getMetaplex", () => {
  beforeEach(() => vi.mocked(bundlrStorage).mockClear());

  it("pays Bundlr over the selected endpoint when no --rpc-url is given", async () => {
    await getMetaplex();

    expect(bundlrStorage).toHaveBeenCalledWith({
      address: "https://devnet.bundlr.network",
      providerUrl: TEST_ENDPOINT.DEVNET,
    });
  });

  it("pays Bundlr over --rpc-url when one is given", async () => {
    await getMetaplex(TEST_ENDPOINT.MAINNET_BETA);

    expect(bundlrStorage).toHaveBeenCalledWith({
      address: "https://node1.bundlr.network",
      providerUrl: TEST_ENDPOINT.MAINNET_BETA,
    });
  });
});
