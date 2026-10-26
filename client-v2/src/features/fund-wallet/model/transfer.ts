import { PgTx, PgWeb3 } from "@/utils";
import type { StandardWallet } from "@/utils/wallet/types";

/** A transfer the cluster accepted but did not confirm, read as a network failure */
export class TransferNotConfirmedError extends Error {
  override name = "SendTransactionError";
}

/**
 * Moves `lamports` from the connected `payer` to `to` with one System Program
 * transfer the payer signs, on the Playground's own cluster: `PgTx.send` takes
 * the blockhash, fee payer, priority fee and RPC from the Playground, so the
 * transfer lands where `deploy` will look for it.
 *
 * @returns the confirmed signature
 */
export const sendFunds = async ({
  payer,
  to,
  lamports,
}: {
  payer: StandardWallet<true>;
  to: string;
  lamports: number;
}) => {
  const transfer = PgWeb3.SystemProgram.transfer({
    fromPubkey: payer.publicKey,
    toPubkey: new PgWeb3.PublicKey(to),
    lamports,
  });
  const signature = await PgTx.send(transfer, { wallet: payer });
  const result = await PgTx.confirm(signature);
  if (result?.err) {
    throw new TransferNotConfirmedError(
      `The transfer was not confirmed: ${JSON.stringify(result.err)}`
    );
  }
  return signature;
};
