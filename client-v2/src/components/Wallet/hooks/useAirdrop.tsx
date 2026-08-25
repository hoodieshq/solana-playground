import { useEffect, useState } from "react";

import { PgCommand, PgConnection, PgGithubAuth } from "../../../utils";

export const useAirdrop = () => {
  const [airdropCondition, setAirdropCondition] = useState(false);

  useEffect(() => {
    const { dispose } = PgConnection.onDidChangeCluster(() => {
      setAirdropCondition(!!PgConnection.getAirdropAmount());
    });
    return dispose;
  }, []);

  const airdrop = async () => {
    if (!PgGithubAuth.user) await PgGithubAuth.signIn();
    await PgCommand.airdrop.execute();
  };

  return { airdrop, airdropCondition };
};
