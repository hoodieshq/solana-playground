import { PgConnection, PgProgramInfo, PgServer, PgWeb3 } from "../../utils";
import { createLogger } from "@/shared/lib/logger";
import { additionalProgramLen } from "./additional-len";

const log = createLogger("deploy:estimate");

/** The fee of one signature, in lamports */
const LAMPORTS_PER_SIGNATURE = 5000;
/**
 * Program bytes one write transaction carries, rounded down from
 * `BpfLoaderUpgradeable.loadBuffer`'s chunk, which is the packet size less
 * the transaction's own bytes; an estimate needs no more precision
 */
const WRITE_CHUNK_BYTES = 1000;
/** Creating the buffer, extending the program data, and the deploy itself */
const FIXED_TRANSACTIONS = 3;

/**
 * Lamports a deploy of the built program is about to cost the paying wallet,
 * or `null` when the program or the chain cannot be read. A first deploy
 * keeps the buffer's rent as the program's; an upgrade gets the buffer's
 * rent back and pays only for a larger program data account and the fees.
 */
export const estimateDeployCost = async (): Promise<number | null> => {
  try {
    const onChain = PgProgramInfo.onChain;
    if (!onChain) return null;

    let programLen = PgProgramInfo.importedProgram?.bytes.length;
    if (!programLen && PgProgramInfo.uuid) {
      programLen = (await PgServer.deploy(PgProgramInfo.uuid)).length;
    }
    if (!programLen) return null;

    const connection = PgConnection.current;
    const additionalLen = additionalProgramLen({
      programLen,
      deployed: onChain.deployed,
      onChainLen: onChain.programDataLen,
    });
    const [bufferRent, extensionRent] = await Promise.all([
      connection.getMinimumBalanceForRentExemption(
        PgWeb3.BpfLoaderUpgradeableProgram.getBufferAccountSize(programLen)
      ),
      additionalLen > 0
        ? connection.getMinimumBalanceForRentExemption(additionalLen)
        : 0,
    ]);
    const writes = Math.ceil(programLen / WRITE_CHUNK_BYTES);
    const fees = (writes + FIXED_TRANSACTIONS) * LAMPORTS_PER_SIGNATURE;
    return (onChain.deployed ? 0 : bufferRent) + extensionRent + fees;
  } catch (e) {
    // The approval card leaves the cost out; the deploy itself is unaffected
    log.info("could not estimate the deploy cost", {
      context: { error: String(e) },
    });
    return null;
  }
};
