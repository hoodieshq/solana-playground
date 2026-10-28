import {
  PgCommand,
  PgCommon,
  PgConnection,
  PgProgramInfo,
  PgSettings,
  PgTerminal,
  PgTx,
} from "../../../utils";
import {
  GeneratableInstruction,
  PgProgramInteraction,
} from "../../../utils/program-interaction";
import { PgCallHistory } from "../state/call-history";
import { failingLine } from "./call-outcome";
import type { CallOutcome } from "./call-outcome";

/** Errors the old Test UI translated, kept so the wording stays the same */
const KNOWN_ERRORS: Record<string, string> = {
  "unable to infer src variant": "Enum variant not found",
  "program.methods[txVals.name] is not a function":
    "Test component is outdated",
};

/** The program's logs for a sent transaction; empty when the RPC has none yet */
const readLogs = async (signature: string): Promise<string[]> => {
  try {
    const tx = await PgConnection.current.getTransaction(signature, {
      commitment: "confirmed",
      maxSupportedTransactionVersion: 0,
    });
    return tx?.meta?.logMessages ?? [];
  } catch {
    return [];
  }
};

const send = async (ix: GeneratableInstruction): Promise<CallOutcome> => {
  let signature: string | null = null;
  try {
    signature = await PgCommon.transition(PgProgramInteraction.test(ix));
    const confirmed = await PgTx.confirm(signature);
    const logs = await readLogs(signature);
    const ok = !confirmed?.err;
    return {
      instruction: ix.name,
      ok,
      signature,
      logs,
      failingLine: ok
        ? null
        : failingLine(
            logs,
            `Transaction failed: ${JSON.stringify(confirmed?.err)}`
          ),
    };
  } catch (e: any) {
    const raw: string = e?.message ?? String(e);
    const message = KNOWN_ERRORS[raw] ?? raw;
    // A preflight failure (`SendTransactionError`) carries the simulation's logs
    const logs: string[] = Array.isArray(e?.logs) ? e.logs : [];
    return {
      instruction: ix.name,
      ok: false,
      signature,
      logs,
      failingLine: failingLine(logs, message),
    };
  }
};

/**
 * Calls one instruction of the program Interact targets and reports how it
 * went. Never rejects: a failure is an outcome the panel shows. The terminal
 * prints the same story, and every finished call joins the history.
 */
export const runCall = async (
  ix: GeneratableInstruction
): Promise<CallOutcome> => {
  const print = (line: string) => {
    PgTerminal.println(line).catch(() => {});
  };
  print(PgTerminal.info(`Calling \`${ix.name}\`...`));

  const outcome = await send(ix);
  print(
    outcome.ok
      ? PgTerminal.success("Call succeeded.")
      : PgTerminal.error(
          `Call failed: ${outcome.failingLine ?? "unknown error"}`
        )
  );

  const programId = PgProgramInfo.getPkStr();
  const cluster = PgConnection.cluster;
  if (programId && cluster) {
    PgCallHistory.add({
      programId,
      cluster,
      instruction: outcome.instruction,
      ok: outcome.ok,
      signature: outcome.signature,
      failingLine: outcome.failingLine,
    });
  }

  if (outcome.signature && PgSettings.testUi.showTxDetailsInTerminal) {
    PgCommand.solana
      .execute("confirm", outcome.signature, "-v")
      .catch(() => {});
  }
  return outcome;
};
