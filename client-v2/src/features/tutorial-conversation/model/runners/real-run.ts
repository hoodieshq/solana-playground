import { BorshInstructionCoder } from "@coral-xyz/anchor";
import type { Idl } from "@coral-xyz/anchor";

import {
  PgCommand,
  PgConnection,
  PgProgramInfo,
  PgTerminal,
  PgTx,
  PgWallet,
  PgWeb3,
} from "../../../../utils";
import { createLogger } from "@/shared/lib/logger";
import type { ActRun } from "./act-runner";
import { captureSends } from "./capture";
import type { Sender } from "./capture";
import { runOrCall } from "./run-call";
import type { Landed, RunPort } from "./run-call";
import type { FundingChain } from "./fund";
import type { DecodedCall } from "./transactions";

const log = createLogger("tutorial-conversation:run");

/** The client file a tutorial's run act runs, in the workspace's `client/` */
const CLIENT_FILE = "client.ts";

/** Reads of a confirmed transaction before the RPC is taken to not have it */
const TX_READS = 5;
const TX_READ_MS = 800;

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * The calls a wire transaction makes to the program, as its IDL decodes
 * them: the instruction, each argument's value as a string, and the
 * accounts by their IDL names. Instructions to other programs are skipped;
 * one to this program the IDL cannot decode (an IDL older than the program)
 * is left out and logged, so the call goal it would have passed fails.
 */
// TODO(HOO-2357 follow-up): move to a pure module with a Hello Anchor IDL
// fixture test, and say on the card when an instruction did not decode;
// both deferred from the sx review, the by-hand devnet run covers it now
const decodeCalls = (
  encoded: string,
  programId: string,
  idl: Idl | null
): DecodedCall[] => {
  if (!idl) return [];
  const tx = PgWeb3.VersionedTransaction.deserialize(
    Buffer.from(encoded, "base64")
  );
  const { message } = tx;
  const keys = message.staticAccountKeys;
  const coder = new BorshInstructionCoder(idl);
  const calls: DecodedCall[] = [];
  for (const ix of message.compiledInstructions) {
    if (keys[ix.programIdIndex]?.toBase58() !== programId) continue;
    const decoded = coder.decode(Buffer.from(ix.data));
    if (!decoded) {
      log.warn(
        "An instruction to the tutorial's program its IDL cannot decode"
      );
      continue;
    }
    const metas = ix.accountKeyIndexes.map((i) => ({
      pubkey: keys[i],
      isSigner: message.isAccountSigner(i),
      isWritable: message.isAccountWritable(i),
    }));
    const formatted = coder.format(decoded, metas);
    calls.push({
      instruction: decoded.name,
      args: Object.fromEntries(
        (formatted?.args ?? []).map((a) => [a.name, a.data])
      ),
      accounts: (formatted?.accounts ?? []).map((a) => ({
        name: a.name ?? "account",
        address: a.pubkey.toBase58(),
      })),
    });
  }
  return calls;
};

/** A confirmed transaction's record, read until the RPC has indexed it */
const landedOnDevnet = async (signature: string): Promise<Landed | null> => {
  await PgTx.confirm(signature);
  for (let i = 0; i < TX_READS; i++) {
    const tx = await PgConnection.current.getTransaction(signature, {
      commitment: "confirmed",
      maxSupportedTransactionVersion: 0,
    });
    if (tx?.meta) {
      return {
        log: tx.meta.logMessages ?? [],
        err: tx.meta.err,
        computeUnits: tx.meta.computeUnitsConsumed ?? null,
        fee: tx.meta.fee,
        signer:
          tx.transaction.message.getAccountKeys().get(0)?.toBase58() ?? null,
      };
    }
    if (i < TX_READS - 1) await wait(TX_READ_MS);
  }
  return null;
};

/** The call act's instruction, through the Test form's sender */
const sendCall = async (call: {
  instruction: string;
  args: Record<string, string>;
}) => {
  const idlIx = PgProgramInfo.idl?.instructions.find(
    (ix) => ix.name === call.instruction
  );
  if (!idlIx) {
    throw new Error(
      `The deployed program has no \`${call.instruction}\`. Build and deploy it again.`
    );
  }
  // Loaded here, not at the top: its storage reads `sessionStorage` on
  // import, which throws where the browser refuses storage and would take
  // the whole app down with it, as the Test panel's lazy load never did
  const { PgProgramInteraction } = await import(
    "../../../../utils/program-interaction"
  );
  const ix = PgProgramInteraction.getOrCreateInstruction(idlIx);
  const values = {
    ...ix.values,
    args: ix.values.args.map((arg) => ({
      ...arg,
      generator: { type: "Custom" as const, value: call.args[arg.name] ?? "" },
    })),
  };
  await PgProgramInteraction.test({ ...ix, values });
};

/** The run and call port over the editor's runner and devnet */
export const realRunPort = (
  funding: FundingChain,
  capSol: number
): RunPort => ({
  refusal: () =>
    PgConnection.cluster === "devnet"
      ? null
      : "Tutorials run on devnet. Switch the network to devnet in Settings and try again.",
  wallet: () => PgWallet.current?.publicKey.toBase58() ?? null,
  programId: () => PgProgramInfo.pk?.toBase58() ?? null,
  funding,
  capSol,
  send: async (act, input) => {
    const { error, captured } = await captureSends(
      PgWeb3.Connection.prototype as unknown as Sender,
      async () => {
        if (act === "run") {
          await PgCommand.run.execute(CLIENT_FILE);
          return;
        }
        if (!input.call) throw new Error("The call act names no instruction");
        await sendCall(input.call);
      }
    );
    return { captured, error };
  },
  landed: landedOnDevnet,
  decode: (encoded) => {
    const programId = PgProgramInfo.pk?.toBase58();
    if (!programId) return [];
    try {
      return decodeCalls(encoded, programId, PgProgramInfo.idl as Idl | null);
    } catch (e) {
      // The result still lands; only its `called` is short, which fails a
      // call goal rather than passing it on a guess
      log.error(e, { report: true, context: { stage: "Decoding a call" } });
      return [];
    }
  },
  print: (line) => PgTerminal.println(line),
  report: (error, stage) =>
    log.error(error, { report: true, context: { stage } }),
  now: () => Date.now(),
});

/** The run act and the call act, on devnet */
export const runOnDevnet =
  (funding: FundingChain, capSol: number): ActRun =>
  async (act, input, onStage) => {
    if (act !== "run" && act !== "call") {
      throw new Error(`runOnDevnet runs a run or a call, not a ${act}`);
    }
    const result = await runOrCall(
      realRunPort(funding, capSol),
      act,
      input,
      onStage
    );
    // The reason and the message only: no key material
    if (!result.ok) {
      log.warn(`A tutorial ${act} failed`, {
        context: {
          message: result.message,
          reason: "reason" in result ? result.reason : undefined,
        },
      });
    }
    return result;
  };
