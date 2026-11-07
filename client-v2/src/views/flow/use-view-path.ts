import { useEffect, useRef } from "react";

import {
  catalogPageOfPath,
  HOME_PATH,
  isHomePath,
  isStartPath,
  pathOfCatalogPage,
} from "@/routes/catalog-paths";
import { createLogger } from "@/shared/lib/logger";
import { PgExplorer, PgRouter, PgTutorial } from "@/utils";
import type { CatalogPage } from "@/widgets/catalog";
import { catalogPage } from "@/widgets/catalog";
import type { HomeVia, StartView } from "@/widgets/home";

const log = createLogger("flow:view-path");

/**
 * The open project's own path: a tutorial's route (with its saved page), or
 * `/` for any other project
 */
const openWork = async () => {
  const name = PgExplorer.currentWorkspaceName;
  if (name && PgTutorial.isWorkspaceTutorial(name)) await PgTutorial.open(name);
  else await PgRouter.navigate("/");
};

const go = (move: () => Promise<void>) =>
  move().catch((e: unknown) => log.error(e, { report: true }));

/**
 * Keep the address bar on what the page shows, both ways. Home shows on
 * `/home`, a page on its own path, and the work on its project's path, so
 * each has its own URL and Back and Forward move between them. The last
 * tutorial stays remembered as the open project, but only the work's own
 * path is a tutorial's.
 *
 * A path the user comes to (Back, Forward, a link, typed) opens or closes
 * the page it names, and `useStartView` shows or leaves Home for it; a view
 * the user picks then moves the path. Each pick is one history entry, but
 * Home's arrival on `/` by itself (the start, the last project deleted)
 * replaces `/`, which has nothing to show.
 */
export const useViewPath = ({
  view,
  homeVia,
  catalog,
}: {
  view: StartView;
  homeVia: HomeVia | undefined;
  catalog: CatalogPage | undefined;
}) => {
  // A path come to opens or closes its page
  useEffect(() => {
    const sub = PgRouter.onDidChangePath((path) => {
      const page = catalogPageOfPath(path);
      if (page) catalogPage.open(page, "link");
      else catalogPage.close();
    });
    return () => sub.dispose();
  }, []);

  // What the user picks moves the path: only what changed, since a pick
  // that navigates itself (a card's Open, a project's row) closes the page
  // after its path has already moved on
  const was = useRef<{ view: StartView; catalog?: CatalogPage }>(undefined);
  useEffect(() => {
    const before = was.current;
    was.current = { view, catalog };
    if (view === "pending") return;
    const path = PgRouter.location.pathname;
    if (catalog) {
      if (catalogPageOfPath(path) !== catalog) {
        go(() => PgRouter.navigate(pathOfCatalogPage(catalog)));
      }
      return;
    }
    // A page closed: back to what it showed over, unless the path left it
    const closed = !!before?.catalog;
    if (closed && catalogPageOfPath(path) !== before.catalog) return;
    if (view === "home") {
      if (isHomePath(path)) return;
      if (!closed && before?.view === "home" && !isStartPath(path)) return;
      const replace = path === "/" && homeVia !== "nav";
      go(() => PgRouter.navigate(HOME_PATH, { replace }));
      return;
    }
    // The work on a start path: back to the project's own
    if (isStartPath(path) && path !== "/") go(openWork);
  }, [view, homeVia, catalog]);
};
