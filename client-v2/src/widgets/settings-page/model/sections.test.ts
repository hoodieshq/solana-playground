import { expect, it } from "vitest";

import {
  initLogger,
  memoryProvider as logMemory,
  resetLogger,
} from "@/shared/lib/logger";
import { groupSettings, sectionTitle, SECTION_ORDER } from "./sections";

/** Only what grouping reads: the id, the name, and whether it is a select */
const setting = (id: string, name: string, values?: string[]) => ({
  id,
  name,
  values,
});

it("groups by the id's prefix, in the page's section order", () => {
  const groups = groupSettings([
    setting("ui.theme", "Theme", ["dark", "light"]),
    setting("experimental.unstable", "Unstable"),
    setting("connection.endpoint", "Endpoint", ["devnet"]),
    setting("build.improveErrors", "Improve errors"),
  ]);
  expect(groups.map((g) => g.id)).toEqual([
    "build",
    "connection",
    "ui",
    "experimental",
  ]);
});

it("puts selects first in a section, then sorts by name", () => {
  const [connection] = groupSettings([
    setting("connection.preflightChecks", "Preflight checks"),
    setting("connection.priorityFee", "Priority fee", ["median"]),
    setting("connection.commitment", "Commitment", ["confirmed"]),
  ]);
  expect(connection.settings.map((s) => s.name)).toEqual([
    "Commitment",
    "Priority fee",
    "Preflight checks",
  ]);
});

it("titles the sections as the prototype does", () => {
  expect(SECTION_ORDER).toEqual([
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
  ]);
  expect(sectionTitle("blockExplorer")).toBe("Block Explorer");
  expect(sectionTitle("testUi")).toBe("Test UI");
  expect(sectionTitle("ui")).toBe("UI");
});

it("reports a group with no place in the order once, however often the page renders", () => {
  const logged = logMemory();
  initLogger({ providers: [logged] });
  const all = [setting("onceOnly.flag", "Flag")];
  groupSettings(all);
  groupSettings(all);
  resetLogger();
  const reports = logged.entries.filter(
    (entry) => entry.context?.group === "onceOnly"
  );
  expect(reports).toHaveLength(1);
});

it("shows a group the page does not know last, titled from its id", () => {
  const groups = groupSettings([
    setting("newThing.flag", "Flag"),
    setting("wallet.automaticAirdrop", "Automatic airdrop"),
  ]);
  expect(groups.map((g) => g.id)).toEqual(["wallet", "newThing"]);
  expect(sectionTitle("newThing")).toBe("New Thing");
});
