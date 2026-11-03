/**
 * Writes a program's IDL to the Program Metadata program (seed "idl", the
 * canonical PDA that Explorer reads) and reads it back.
 *
 * SPIKE (HOO-2486). The route: the official `@solana-program/program-metadata`
 * client builds and packs the instructions (allocate, extend, write,
 * initialize or set-data, close), Kit's planner fits them into transactions,
 * and we sign every planned transaction in one `signAllTransactions` call
 * with whichever wallet the playground holds, then send them over the
 * playground's web3.js connection. The only glue we own is that last step.
 */
import {
  address,
  compileTransaction,
  createNoopSigner,
  createSolanaRpc,
  createTransactionMessage,
  createTransactionPlanner,
  getTransactionEncoder,
  pipe,
  setTransactionMessageFeePayerSigner,
  setTransactionMessageLifetimeUsingBlockhash,
  type Address,
  type SingleTransactionPlan,
  type TransactionPlan,
} from "@solana/kit";
import {
  Compression,
  DataSource,
  Encoding,
  Format,
  fetchMaybeMetadata,
  fetchMetadataContent,
  findCanonicalPda,
  getProgramAuthority,
  getWriteMetadataInstructionPlan,
  packDirectData,
} from "@solana-program/program-metadata";
import {
  VersionedTransaction,
  type Connection,
  type PublicKey,
} from "@solana/web3.js";

export const IDL_SEED = "idl";

/** What the upload needs from the playground: a connection and a signer. */
export interface IdlUploadDeps {
  connection: Pick<
    Connection,
    "rpcEndpoint" | "sendRawTransaction" | "confirmTransaction"
  >;
  wallet: {
    publicKey: PublicKey;
    signAllTransactions(
      txs: VersionedTransaction[]
    ): Promise<VersionedTransaction[]>;
  };
}

export type IdlUploadResult = {
  metadata: Address;
  action: "init" | "upgrade";
  signatures: string[];
};

export class NotProgramAuthorityError extends Error {
  constructor(readonly authority: string | undefined) {
    super(
      authority
        ? `The program's upgrade authority is ${authority}; switch to that wallet to upload its IDL.`
        : "The program is immutable, so no wallet can upload its canonical IDL."
    );
  }
}

/** The canonical Program Metadata account holding `program`'s IDL. */
export async function idlMetadataAddress(program: string) {
  const [pda] = await findCanonicalPda({
    program: address(program),
    seed: IDL_SEED,
  });
  return pda;
}

/** The IDL JSON stored on chain for `program`, or `null` if none. */
export async function fetchProgramMetadataIdl(
  rpcEndpoint: string,
  program: string
): Promise<string | null> {
  const rpc = createSolanaRpc(rpcEndpoint);
  const metadata = await fetchMaybeMetadata(
    rpc,
    await idlMetadataAddress(program)
  );
  if (!metadata.exists) return null;
  return await fetchMetadataContent(rpc, address(program), IDL_SEED);
}

/**
 * Creates or replaces `program`'s canonical IDL. The wallet must be the
 * program's upgrade authority; nothing is sent otherwise.
 */
export async function uploadIdl(
  deps: IdlUploadDeps,
  program: string,
  idlJson: string
): Promise<IdlUploadResult> {
  const rpc = createSolanaRpc(deps.connection.rpcEndpoint);
  const programAddress = address(program);
  const walletAddress = address(deps.wallet.publicKey.toBase58());

  const { authority, programData } = await getProgramAuthority(
    rpc,
    programAddress
  );
  if (authority !== walletAddress) {
    throw new NotProgramAuthorityError(authority);
  }

  const metadataAddress = await idlMetadataAddress(program);
  const metadata = await fetchMaybeMetadata(rpc, metadataAddress);

  // The planner signs nothing; it only needs addresses to size messages.
  const signer = createNoopSigner(walletAddress);
  const { value: blockhash } = await rpc.getLatestBlockhash().send();
  const planner = createTransactionPlanner({
    createTransactionMessage: () =>
      pipe(
        createTransactionMessage({ version: 0 }),
        (m) => setTransactionMessageFeePayerSigner(signer, m),
        (m) => setTransactionMessageLifetimeUsingBlockhash(blockhash, m)
      ),
  });

  const client = {
    getMinimumBalance: async (
      space: number,
      config?: { withoutHeader?: boolean }
    ) => {
      // The RPC adds the 128-byte account header itself.
      const dataLength = config?.withoutHeader ? Math.max(space - 128, 0) : space;
      return await rpc
        .getMinimumBalanceForRentExemption(BigInt(dataLength))
        .send();
    },
    planTransaction: async () => {
      throw new Error("unused");
    },
    planTransactions: planner,
  };

  const instructionPlan = await getWriteMetadataInstructionPlan(client, {
    ...packDirectData({
      content: idlJson,
      compression: Compression.Zlib,
      encoding: Encoding.Utf8,
    }),
    format: Format.Json,
    dataSource: DataSource.Direct,
    payer: signer,
    authority: signer,
    program: programAddress,
    programData,
    seed: IDL_SEED,
    metadata,
    closeBuffer: true,
  });
  const transactionPlan = await planner(instructionPlan);

  // One wallet prompt for the whole upload, then send stage by stage.
  const stages = toStages(transactionPlan);
  const encoder = getTransactionEncoder();
  const unsigned = stages.flat().map((plan) =>
    VersionedTransaction.deserialize(
      new Uint8Array(encoder.encode(compileTransaction(plan.message)))
    )
  );
  const signed = await deps.wallet.signAllTransactions(unsigned);

  const signatures: string[] = [];
  let next = 0;
  for (const stage of stages) {
    const batch = signed.slice(next, next + stage.length);
    next += stage.length;
    const sent = await Promise.all(
      batch.map(async (tx) => {
        const signature = await deps.connection.sendRawTransaction(
          tx.serialize()
        );
        const { value } = await deps.connection.confirmTransaction(
          {
            signature,
            blockhash: blockhash.blockhash,
            lastValidBlockHeight: Number(blockhash.lastValidBlockHeight),
          },
          "confirmed"
        );
        if (value.err) {
          throw new Error(
            `IDL upload transaction ${signature} failed: ${JSON.stringify(value.err)}`
          );
        }
        return signature;
      })
    );
    signatures.push(...sent);
  }

  return {
    metadata: metadataAddress,
    action: metadata.exists ? "upgrade" : "init",
    signatures,
  };
}

/**
 * Orders a transaction plan into stages: each stage's transactions may land
 * in any order, and a stage starts only after the previous one confirmed.
 */
export function toStages(plan: TransactionPlan): SingleTransactionPlan[][] {
  switch (plan.kind) {
    case "single":
      return [[plan]];
    case "sequential":
      return plan.plans.flatMap(toStages);
    case "parallel": {
      const children = plan.plans.map(toStages);
      return children.every((c) => c.length === 1)
        ? [children.flatMap((c) => c[0])]
        : children.flat();
    }
  }
}
