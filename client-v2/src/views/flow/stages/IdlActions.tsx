import { useState } from "react";
import type { FC } from "react";
import { FileJson } from "lucide-react";

import { createLogger } from "@/shared/lib/logger";
import { Button } from "@/shared/ui/button";
import {
  DropZone,
  DropZoneDescription,
  DropZoneIcon,
  DropZoneTitle,
} from "@/shared/ui/drop-zone";
import { useRenderOnChange } from "../../../hooks";
import { PgCommon, PgProgramInfo } from "../../../utils";

const log = createLogger("flow:idl-actions");

interface IdlActionsProps {
  showGenerate?: boolean;
  showUpload?: boolean;
}

type Note = { kind: "used"; text: string } | { kind: "refused"; text: string };

/**
 * Labels promise no more than what happens in the browser: "Download IDL"
 * saves what the build already produced, "Load IDL file" replaces the IDL
 * this app uses -- neither touches the chain.
 */
const IdlActions: FC<IdlActionsProps> = ({ showGenerate, showUpload }) => {
  const idl = useRenderOnChange(PgProgramInfo.onDidChangeIdl);
  const [note, setNote] = useState<Note | null>(null);

  const load = async (file: File | undefined) => {
    if (!file) return;
    try {
      const parsed = JSON.parse(await file.text());
      // The one field every consumer walks; a JSON file without it would
      // land in Interact as "corrupted IDL" -- refuse it at the door instead
      if (!Array.isArray(parsed.instructions)) {
        throw new Error("missing `instructions`");
      }
      PgProgramInfo.update({ idl: parsed });
      setNote({ kind: "used", text: `Using ${parsed.name ?? file.name}` });
    } catch (e) {
      // The user's own file, not a fault of ours: say so and log it quietly
      log.warn("Refused an IDL file", {
        context: { name: file.name, reason: String(e) },
      });
      setNote({ kind: "refused", text: "Not an Anchor IDL JSON file" });
    }
  };

  return (
    <>
      {showGenerate && idl && (
        <Button asChild variant="outline">
          <a href={PgCommon.getDataUrl(idl)} download="idl.json">
            Download IDL
          </a>
        </Button>
      )}
      {showGenerate && !idl && (
        <Button variant="outline" disabled title="Build successfully first">
          Download IDL
        </Button>
      )}
      {showUpload && (
        <div className="flex w-full flex-col gap-2">
          <DropZone accept=".json" onFiles={(files) => load(files[0])}>
            <DropZoneIcon>
              <FileJson />
            </DropZoneIcon>
            <DropZoneTitle>Load IDL file</DropZoneTitle>
            <DropZoneDescription>
              Replaces the IDL this browser uses in Interact -- nothing is
              written on-chain
            </DropZoneDescription>
          </DropZone>
          {note && (
            <span
              role="status"
              className={
                note.kind === "refused"
                  ? "font-mono text-xs text-error"
                  : "font-mono text-xs text-muted-foreground"
              }
            >
              {note.text}
            </span>
          )}
        </div>
      )}
    </>
  );
};

export default IdlActions;
