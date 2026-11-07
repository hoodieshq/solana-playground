import { useEffect } from "react";

import Grounding from "@/views/sidebar/assistant/Component/Grounding";
import { PgAssistant } from "@/views/sidebar/assistant/store";

/**
 * The skills and MCP servers of the assistant's Sources and tools, on the
 * settings page. Both read and write the one `PgAssistant` store, so a switch
 * here shows in the panel and in the next turn.
 */
const AssistantSources = () => {
  // The panel asks on its own mount; the page may open without it (a phone,
  // a closed assistant), and asking again is safe
  useEffect(() => {
    void PgAssistant.initMcp();
  }, []);

  return <Grounding embedded />;
};

export default AssistantSources;
