import { useEffect, useState } from "react";

import { PgClientRun } from "../model/run";
import type { RunState } from "../model/run";
import { PgDocsLink } from "../model/opened";
import type { DocsLink } from "../lib/link";

/** @returns the stage row's run state, kept current */
export const useRunState = (): RunState => {
  const [state, setState] = useState(PgClientRun.state);
  useEffect(() => PgClientRun.onDidChange(setState).dispose, []);
  return state;
};

/** @returns the docs link the open project came from, kept current */
export const useOpenedLink = (): DocsLink | null => {
  const [link, setLink] = useState(PgDocsLink.opened);
  useEffect(() => PgDocsLink.onDidChange(setLink).dispose, []);
  return link;
};
