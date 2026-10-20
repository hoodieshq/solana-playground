import { useEffect, useRef, useState } from "react";

import { StartFromScratch } from "@/features/new-project";
import { PgTutorial, PgView } from "@/utils";
import type { CardList } from "../model/lists";
import { importProgram, isImportCancel } from "../model/program-open";
import { catalogTelemetry } from "../model/telemetry";
import type { CatalogPage } from "../model/telemetry";
import { useCardOpen } from "../model/use-card-open";
import { useProgramList } from "../model/use-program-list";
import { useTutorialList } from "../model/use-tutorial-list";
import BaseNewProject from "./BaseNewProject";

/**
 * New project, connected: Start from scratch and the catalog's two lists,
 * one query for both. Whatever opens or starts from here closes the dialog;
 * a failure stays where it happened. One Open at a time across both lists.
 * Programs are read once per time the dialog opens, since this only exists
 * while it is open.
 */
const NewProject = ({
  initialTab = "tutorials",
}: {
  initialTab?: CatalogPage;
}) => {
  // Tutorials lead: a verified path is what this fork is for
  const [tab, setTab] = useState<CatalogPage>(initialTab);
  const [query, setQuery] = useState("");

  // `PgView.setModal(null)` closes the top dialog, whichever it is. An Open
  // that ends after this dialog was dismissed must leave the next one alone
  const shown = useRef(true);
  useEffect(() => {
    shown.current = true;
    return () => {
      shown.current = false;
    };
  }, []);
  const closeDialog = () => {
    if (shown.current) PgView.setModal(null);
  };

  const tutorialOpen = useCardOpen("tutorials", undefined, closeDialog);
  const programOpen = useCardOpen("programs", isImportCancel, closeDialog);
  const busy = tutorialOpen.busy || programOpen.busy;
  const lists: Record<CatalogPage, CardList> = {
    tutorials: useTutorialList(query, tutorialOpen.cardOpen),
    programs: useProgramList(query, programOpen.cardOpen),
  };
  const OPEN: Record<CatalogPage, (id: string) => Promise<void>> = {
    tutorials: (name) => tutorialOpen.open(name, () => PgTutorial.open(name)),
    programs: (repo) => programOpen.open(repo, importProgram(repo)),
  };

  return (
    <BaseNewProject
      scratch={<StartFromScratch onStarted={closeDialog} />}
      tab={tab}
      onTab={(next) => {
        catalogTelemetry.track("catalog_tab_switched", { tab: next });
        setTab(next);
      }}
      counts={{
        tutorials: lists.tutorials.count,
        programs: lists.programs.count,
      }}
      query={query}
      onQuery={setQuery}
      grid={{
        list: lists[tab].list,
        busy,
        // The other list's Open may still run; one at a time across both
        onOpen: async (id) => {
          if (!busy) await OPEN[tab](id);
        },
      }}
    />
  );
};

export default NewProject;
