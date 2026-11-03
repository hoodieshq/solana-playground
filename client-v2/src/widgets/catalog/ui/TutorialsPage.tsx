import { useMemo, useState } from "react";

import { ladderLine, startTutorials } from "@/entities/tutorial";
import { PgTutorial } from "@/utils";
import { matchesTutorial } from "../lib/filter";
import { frameworkCount } from "../lib/levels";
import type { FrameworkFilter } from "../lib/levels";
import { bannerOf, featuredOf } from "../model/banner";
import { catalogTelemetry } from "../model/telemetry";
import { useCardOpen } from "../model/use-card-open";
import { useSearchTelemetry } from "../model/use-search-telemetry";
import { useTutorialList } from "../model/use-tutorial-list";
import type { TutorialItem } from "../model/use-tutorial-list";
import BaseTutorialsPage from "./BaseTutorialsPage";

/** The id the banner's Open runs under, apart from its tutorial's card */
const BANNER = "banner";

/**
 * The start's tutorials (`startTutorials`), searched by name and
 * description, filtered by framework, under the Start here banner. Open, on
 * a card or the banner, navigates to the tutorial's route
 * (`PgTutorial.open`); a failure there is shown where it was pressed, while
 * what the route then fails to load is the route's to report.
 */
const TutorialsPage = () => {
  const [query, setQuery] = useState("");
  const [framework, setFramework] = useState<FrameworkFilter>("all");
  const { open, busy, cardOpen } = useCardOpen("tutorials");
  const pool = useMemo(() => startTutorials(PgTutorial.all), []);
  // Read once, unsearched: the banner and the filter go by the whole list
  const { list } = useTutorialList("", cardOpen, pool);
  const all = list.state === "ready" ? list.cards : [];
  const items = all.filter(
    (t) =>
      matchesTutorial({ name: t.title, description: t.description }, query) &&
      (framework === "all" || t.framework === framework)
  );
  useSearchTelemetry("tutorials", query, items.length === 0);

  const featured = featuredOf<TutorialItem>(all);
  const banner = featured && bannerOf(featured, ladderLine(featured.id));

  return (
    <BaseTutorialsPage
      query={query}
      onQuery={setQuery}
      framework={framework}
      onFramework={(f) => {
        setFramework(f);
        catalogTelemetry.track("catalog_filtered", {
          page: "tutorials",
          framework: f,
        });
      }}
      filterable={frameworkCount(all) >= 2}
      count={pool.length}
      items={items}
      banner={banner}
      bannerOpen={cardOpen(BANNER)}
      busy={busy}
      onOpen={(name) => open(name, () => PgTutorial.open(name))}
      onBannerOpen={async () => {
        if (!banner) return;
        await open(BANNER, async () => {
          await PgTutorial.open(banner.id);
          catalogTelemetry.track("catalog_banner_opened", {
            state: banner.state,
          });
        });
      }}
    />
  );
};

export default TutorialsPage;
