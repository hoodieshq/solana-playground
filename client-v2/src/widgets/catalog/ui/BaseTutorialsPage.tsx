import { resultsLine, searchHint } from "../lib/levels";
import type { FrameworkFilter as Filter } from "../lib/levels";
import type { Banner } from "../model/banner";
import type { TutorialItem } from "../model/use-tutorial-list";
import type { CardOpen } from "./BaseCatalogGrid";
import BaseStartHereBanner from "./BaseStartHereBanner";
import BaseTutorialLevels from "./BaseTutorialLevels";
import CatalogSearch from "./CatalogSearch";
import FrameworkFilter from "./FrameworkFilter";

export interface BaseTutorialsPageProps {
  query: string;
  onQuery: (query: string) => void;
  framework: Filter;
  onFramework: (framework: Filter) => void;
  /** Draw the filter: the list holds two or more frameworks */
  filterable: boolean;
  /** How many tutorials the page lists in all, for the search's hint */
  count: number;
  /** The tutorials matching the query and the framework */
  items: readonly TutorialItem[];
  /** The Start here banner; none when the page lists nothing */
  banner?: Banner;
  /** The banner's Open, while it runs or once it failed */
  bannerOpen?: CardOpen;
  /** An Open runs: every card and the banner wait for it */
  busy: boolean;
  onOpen: (id: string) => Promise<void>;
  onBannerOpen: () => Promise<void>;
}

/**
 * The Tutorials page as the tutorial-v2 prototype draws it
 * (`desktop/Gallery.tsx`, `TutorialsBody`): the heading with the search and
 * the framework filter, the Start here banner while browsing or the results
 * line while searching or filtering, then the cards by level.
 */
const BaseTutorialsPage = ({
  query,
  onQuery,
  framework,
  onFramework,
  filterable,
  count,
  items,
  banner,
  bannerOpen,
  busy,
  onOpen,
  onBannerOpen,
}: BaseTutorialsPageProps) => {
  const searching = query.trim() !== "";
  const browsing = !searching && framework === "all";
  return (
    <section className="mx-auto flex w-full max-w-[50rem] flex-col gap-4 px-8 pt-8 pb-16 max-md:px-4">
      <div className="flex flex-wrap items-center gap-2">
        <h1 className="mr-auto font-heading text-[1.75rem] font-normal tracking-[-0.015em] text-foreground">
          Tutorials
        </h1>
        <CatalogSearch
          label="tutorials"
          placeholder={searchHint(count, framework)}
          query={query}
          onQuery={onQuery}
          className="w-80 max-sm:w-full max-sm:max-w-none"
        />
        {filterable ? (
          <FrameworkFilter value={framework} onChange={onFramework} />
        ) : null}
      </div>
      {browsing && banner ? (
        <BaseStartHereBanner
          banner={banner}
          open={bannerOpen}
          busy={busy}
          onOpen={onBannerOpen}
        />
      ) : null}
      {browsing ? null : (
        <p role="status" className="text-[0.8125rem] text-muted-foreground">
          {resultsLine(items.length, query, framework)}
        </p>
      )}
      <BaseTutorialLevels
        items={items}
        searching={searching}
        busy={busy}
        onOpen={onOpen}
      />
    </section>
  );
};

export default BaseTutorialsPage;
