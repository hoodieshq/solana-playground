import { useEffect, useRef, useState } from "react";
import { ArrowLeft } from "lucide-react";

import { Button } from "@/shared/ui/button";
import Chat from "../../../views/sidebar/assistant/Component/Chat";
import Grounding from "../../../views/sidebar/assistant/Component/Grounding";
import { PgAssistant } from "../../../views/sidebar/assistant/store";
import { PgExplorer } from "../../../utils/explorer/explorer";
import { CONNECT_REGION } from "../../../views/sidebar/assistant/Component/connect-region";
import { useTurn } from "../model/use-turn";
import { AssistantComposer } from "./AssistantComposer";
import { BaseAssistantHead } from "./BaseAssistantHead";

/** What the panel shows under its head */
type View = "chat" | "sources";

/** The view a pick from More opened, until it has been given focus */
type Picked = "sources" | "connect";

/** What can take focus in a view, enabled */
const FOCUSABLE =
  'button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

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

  // The view a pick from More opened takes focus once the menu has closed
  // (`BaseAssistantHead`'s `focusPicked`): Back in Sources, the picker's first
  // control in Connect a model. Focus the user already put somewhere in the
  // meantime, such as on a select they clicked, is left where it is.
  const picked = useRef<Picked | null>(null);
  const root = useRef<HTMLDivElement>(null);
  const back = useRef<HTMLButtonElement>(null);
  const focusPicked = () => {
    const view = picked.current;
    picked.current = null;
    const active = document.activeElement;
    if (active && active !== document.body) return true;
    const target =
      view === "sources"
        ? back.current
        : root.current?.querySelector<HTMLElement>(
            `[${CONNECT_REGION}] :is(${FOCUSABLE})`
          );
    if (!target) return false;
    target.focus();
    return true;
  };

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
    <div ref={root} className="flex h-full max-h-full min-h-0 flex-1 flex-col">
      <BaseAssistantHead
        title={title}
        onSources={() => {
          setView("sources");
          picked.current = "sources";
        }}
        onConnect={() => {
          // The picker is in the thread, which Sources covers
          setView("chat");
          turn.openConnect("menu");
          picked.current = "connect";
        }}
        focusPicked={focusPicked}
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
            <Button
              ref={back}
              variant="ghost"
              size="sm"
              onClick={() => setView("chat")}
            >
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
