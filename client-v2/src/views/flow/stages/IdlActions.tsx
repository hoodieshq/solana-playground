import { useState } from "react";
import type { FC } from "react";

import ImportButton from "../../../components/ImportButton";
import { createLogger } from "@/shared/lib/logger";
import { Button } from "@/shared/ui/button";
import { useRenderOnChange } from "../../../hooks";
import { PgCommon, PgProgramInfo } from "../../../utils";

const log = createLogger("flow:idl-actions");

const LOAD_HINT =
  "Replaces the IDL this browser uses in Interact \u2014 nothing is written on-chain";

/**
 * Which door to the IDL: `download` saves what the build produced; `upload`
 * loads a file picked through a button, the prototype's secondary action
 * under Deploy's pill and in Interact's toolbar.
 */
export type IdlActionsMode = "download" | "upload";

/** Parses an Anchor IDL file's text; throws when it is not one */
const parseIdl = (text: string) => {
  const parsed = JSON.parse(text);
  // The one field every consumer walks; a JSON file without it would land in
  // Interact as "corrupted IDL" -- refuse it at the door instead
  if (!Array.isArray(parsed?.instructions)) {
    throw new Error("missing `instructions`");
  }
  return parsed;
};

/** Saves the IDL the last build produced */
const DownloadIdl = () => {
  const idl = useRenderOnChange(PgProgramInfo.onDidChangeIdl);
  if (!idl) {
    return (
      <Button variant="outline" disabled title="Build successfully first">
        Download IDL
      </Button>
    );
  }
  return (
    <Button asChild variant="outline">
      <a href={PgCommon.getDataUrl(idl)} download="idl.json">
        Download IDL
      </a>
    </Button>
  );
};

/**
 * How the line beside Upload IDL names the IDL in use: by its own name, so
 * the user can tell which file is loaded. A 1.x IDL keeps it under
 * `metadata`.
 */
const idlLabel = (idl: object) => {
  const { name: legacy, metadata } = idl as {
    name?: unknown;
    metadata?: { name?: unknown };
  };
  const name = metadata?.name ?? legacy;
  return typeof name === "string" && name ? `IDL \u00b7 ${name}` : "IDL loaded";
};

/**
 * Loads an IDL file into this browser, picked through a button. The IDL in
 * use is shared state, so Deploy and Interact, each with its own instance,
 * name the same one; only a refused pick stays with the instance it hit.
 */
const UploadIdl = () => {
  const idl = useRenderOnChange(PgProgramInfo.onDidChangeIdl);
  const [refused, setRefused] = useState(false);

  /** Refuses a file that is not an IDL; a throw after that is ours */
  const load = async (file: File | undefined) => {
    if (!file) return;
    // A refusal of an earlier file must not outlive a good pick of this one
    setRefused(false);
    // Read outside the try: a file that cannot be read is not the user's
    // malformed IDL, and `ImportButton` reports it
    const text = await file.text();
    let parsed;
    try {
      parsed = parseIdl(text);
    } catch (e) {
      // The user's own file, not a fault of ours: say so and log it quietly
      log.warn("Refused an IDL file", {
        context: { name: file.name, reason: String(e) },
      });
      setRefused(true);
      return;
    }
    PgProgramInfo.update({ idl: parsed });
  };

  // `ImportButton` reports a throw from `load` itself. The input lets go of
  // the file on every pick: a browser fires no change for the file it already
  // holds, so a file fixed on disk and picked again would be ignored.
  // One group, so the line stays beside its button wherever a stage puts it
  return (
    <span className="inline-flex flex-wrap items-center gap-2">
      <ImportButton
        accept=".json"
        title={LOAD_HINT}
        onImport={(ev) => {
          const file = ev.target.files?.[0];
          ev.target.value = "";
          return load(file);
        }}
      >
        Upload IDL
      </ImportButton>
      {refused && (
        <span role="status" className="font-mono text-xs text-error">
          That file is not an Anchor IDL.
        </span>
      )}
      {idl && (
        <span role="status" className="font-mono text-xs text-muted-foreground">
          {idlLabel(idl)}
        </span>
      )}
    </span>
  );
};

/**
 * Labels promise no more than what happens in the browser: "Download IDL"
 * saves what the build already produced, "Upload IDL" replaces the IDL
 * this app uses -- neither touches the chain.
 */
const IdlActions: FC<{ mode: IdlActionsMode }> = ({ mode }) =>
  mode === "download" ? <DownloadIdl /> : <UploadIdl />;

export default IdlActions;
