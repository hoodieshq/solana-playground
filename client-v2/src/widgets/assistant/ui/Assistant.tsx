import { useEffect, useState } from "react";
import { ArrowLeft } from "lucide-react";

import { Button } from "@/shared/ui/button";
import Chat from "../../../views/sidebar/assistant/Component/Chat";
import Grounding from "../../../views/sidebar/assistant/Component/Grounding";
import { PgAssistant } from "../../../views/sidebar/assistant/store";
import { PgExplorer } from "../../../utils/explorer/explorer";
import { useTurn } from "../model/use-turn";
import { AssistantComposer } from "./AssistantComposer";
import { BaseAssistantHead } from "./BaseAssistantHead";

/** What the panel shows under its head */
type View = "chat" | "sources";

/** What a heading shows while no project is open yet */
const NO_PROJECT = "Assistant";

/** The open project's name, kept live through a switch or a rename */
const useProjectName = () => {
  const read = () => PgExplorer.currentWorkspaceName ?? NO_PROJECT;
  const [name, setName] = useState(read);
  useEffect(() => {
    const update = () => setName(read());
    // A rename switches to the new name, and also says so on its own; the
    // explorer initialises after the panel on a cold start
    const subs = [
      PgExplorer.onDidInit(update),
      PgExplorer.onDidSwitchWorkspace(update),
      PgExplorer.onDidRenameWorkspace(update),
    ];
    update();
    return () => subs.forEach((sub) => sub.dispose());
  }, []);
  return name;
};

export interface AssistantProps {
  /** The panel is widened to its maximum */
  wide: boolean;
  setWide(wide: boolean): void;
  /** Widen is offered: not below `LAYOUT_BREAKPOINTS.compact`, in the Sheet */
  canWiden: boolean;
  /** Folds the panel, or closes the Sheet */
  onHide(): void;
}

/**
 * The assistant, connected: its head, then the conversation over the composer,
 * or Sources and tools in their place.
 */
export function Assistant({ wide, setWide, canWiden, onHide }: AssistantProps) {
  const [view, setView] = useState<View>("chat");
  // Here, above both views, so a turn and a prompt waiting in the composer
  // outlive a visit to Sources; the thread and the composer share this one
  const turn = useTurn();
  const title = useProjectName();

  // Ask the gateway what it serves and what those servers offer. Has to happen
  // here rather than only in Sources: `createTools` reads the result, so a
  // model connected before this ran would be offered no MCP tool at all, with
  // nothing on screen to say why.
  useEffect(() => {
    PgAssistant.initMcp();
  }, []);

  // A prompt raised while Sources is open (a tool call there, say) lands in
  // the composer, which is no use while Sources still covers it
  useEffect(() => {
    return PgAssistant.onDidRequestPrompt(() => setView("chat")).dispose;
  }, []);

  return (
    <div className="flex h-full max-h-full min-h-0 flex-1 flex-col">
      <BaseAssistantHead
        title={title}
        onSources={() => setView("sources")}
        onConnect={() => turn.openConnect("menu")}
        wide={wide}
        onWiden={() => setWide(!wide)}
        onHide={onHide}
        canWiden={canWiden}
      />
      {view === "chat" && (
        <>
          <Chat turn={turn} />
          <AssistantComposer turn={turn} />
        </>
      )}
      {view === "sources" && (
        <>
          <div className="shrink-0 px-2 pt-2">
            <Button variant="ghost" size="sm" onClick={() => setView("chat")}>
              <ArrowLeft aria-hidden="true" />
              Back
            </Button>
          </div>
          <Grounding />
        </>
      )}
    </div>
  );
}
