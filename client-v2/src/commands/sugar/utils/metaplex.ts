import {
  bundlrStorage,
  Metaplex,
  walletAdapterIdentity,
} from "@metaplex-foundation/js";

import { getConnectionFor } from "@/entities/cluster";

import { PgConnection, PgSettings, PgWallet } from "../../../utils";
import { BundlrEnpoints } from "../constants";

export const getMetaplex = async (endpoint?: string) => {
  // Bundlr pays for uploads over `providerUrl`, and an `undefined` one falls
  // back to mainnet-beta instead of the cluster the Candy Machine is on
  const rpcUrl = endpoint ?? PgSettings.connection.endpoint;
  return Metaplex.make(getConnectionFor(undefined)(rpcUrl))
    .use(walletAdapterIdentity(PgWallet.current!))
    .use(
      bundlrStorage({
        address:
          (await PgConnection.getCluster(rpcUrl)) === "mainnet"
            ? BundlrEnpoints.MAINNET
            : BundlrEnpoints.DEVNET,
        providerUrl: rpcUrl,
      })
    );
};
