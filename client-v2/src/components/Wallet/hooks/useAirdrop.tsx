import { useEffect, useState } from "react";

import { PgGithubAuth } from "../../../features/github-oauth";
import { PgCommand, PgConnection, PgTerminal } from "../../../utils";

export const useAirdrop = () => {
  const [airdropCondition, setAirdropCondition] = useState(false);

  useEffect(() => {
    const { dispose } = PgConnection.onDidChangeCluster(() => {
      setAirdropCondition(!!PgConnection.getAirdropAmount());
    });
    return dispose;
  }, []);

  const airdrop = async () => {
    if (!PgGithubAuth.user) {
      try {
        await PgGithubAuth.signIn();
      } catch (e) {
        PgTerminal.println(PgTerminal.error((e as Error).message));
        return;
      }
    }
    await PgCommand.airdrop.execute();
  };

  return { airdrop, airdropCondition };
};
