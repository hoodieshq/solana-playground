import { useEffect, useState } from "react";

import { PgSession } from "../../../features/auth";
import { PgCommand, PgConnection } from "../../../utils";

export const useAirdrop = () => {
  // `undefined` until the cluster is known, so the menu neither offers
  // Airdrop nor says there is no faucet before it can tell
  const [airdropCondition, setAirdropCondition] = useState<boolean>();

  useEffect(() => {
    const { dispose } = PgConnection.onDidChangeCluster((cluster) => {
      setAirdropCondition(
        cluster ? !!PgConnection.getAirdropAmount() : undefined
      );
    });
    return dispose;
  }, []);

  const airdrop = async () => {
    // A failed sign-in rejects to the caller, which tells the user: printed
    // to a folded console, or to none under Home, it reached nobody
    if (!PgSession.get()) await PgSession.signIn();
    await PgCommand.airdrop.execute();
  };

  return { airdrop, airdropCondition };
};
