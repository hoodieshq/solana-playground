import { createLogger } from "@/shared/lib/logger";
import { PgCommon } from "@/utils/common";

const log = createLogger("settings-page:sections");

/**
 * The page's sections, in the prototype's order (design.md, "Settings as a
 * full page (5.20)"). `network` and `project` are the page's own; the rest are
 * the prefixes of `PgSettings.all`'s ids, and `experimental` is the one the
 * prototype leaves out.
 */
export const SECTION_ORDER = [
  "network",
  "project",
  "blockExplorer",
  "build",
  "connection",
  "editor",
  "notification",
  "server",
  "testUi",
  "ui",
  "wallet",
  "experimental",
] as const;

const TITLES: Record<string, string> = {
  blockExplorer: "Block Explorer",
  testUi: "Test UI",
  ui: "UI",
};

/** A section's heading; one the page does not know is titled from its id */
export const sectionTitle = (id: string) =>
  TITLES[id] ?? PgCommon.toTitleFromCamel(id);

/** What grouping reads of a setting */
interface Groupable {
  id: string;
  name: string;
  values?: unknown;
}

export interface SettingGroup<S extends Groupable> {
  id: string;
  settings: S[];
}

const rank = (id: string) => {
  const at = (SECTION_ORDER as readonly string[]).indexOf(id);
  return at === -1 ? SECTION_ORDER.length : at;
};

/**
 * `PgSettings.all` grouped by the prefix of each id, in `SECTION_ORDER`, with
 * selects before switches and then by name, as the old settings panel sorted
 * them. A group the page does not list comes last, and is logged so that a
 * new settings folder gets a place in the order rather than going unnoticed.
 */
export const groupSettings = <S extends Groupable>(
  all: S[]
): SettingGroup<S>[] => {
  const groups = new Map<string, S[]>();
  for (const setting of all) {
    const id = setting.id.split(".")[0];
    groups.set(id, [...(groups.get(id) ?? []), setting]);
  }
  for (const id of groups.keys()) {
    if (rank(id) === SECTION_ORDER.length) {
      log.warn("a settings group has no place in the page's order", {
        report: true,
        context: { group: id },
      });
    }
  }
  return [...groups.entries()]
    .sort(([a], [b]) => rank(a) - rank(b))
    .map(([id, settings]) => ({
      id,
      settings: [...settings].sort((a, b) => {
        if (a.values && !b.values) return -1;
        if (b.values && !a.values) return 1;
        return a.name.localeCompare(b.name);
      }),
    }));
};
