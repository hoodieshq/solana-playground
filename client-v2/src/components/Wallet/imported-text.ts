import { shortAddress } from "@/shared/lib/short-address";
import type { PgWeb3 } from "../../utils";

/**
 * What an import says, in Spec 12's words. `PgWallet.add` switches to an
 * account that already holds the keypair instead of adding it, which would
 * otherwise look like nothing happened. Spec 12 has no copy for that case yet
 * (WAL-33); the designers are asked to confirm this one.
 *
 * @param imported what `PgWallet.import` resolved with
 * @param name the current wallet's name after the import
 */
export const importedText = (
  imported: { keypair: PgWeb3.Keypair; added: boolean },
  name: string
): string =>
  imported.added
    ? `Imported ${shortAddress(
        imported.keypair.publicKey.toBase58()
      )} as ${name}.`
    : `${name} already holds that keypair, so it is now the current wallet.`;
