import {
  FORCE_PARAM,
  SEEDED_KEY,
  planSeeding,
  seedSamples,
  seedWhenReady,
} from "./seed";
import { SAMPLES } from "./samples";
import { PgExplorer } from "../../../utils/explorer/explorer";

const NAMES = SAMPLES.map((sample) => sample.name);

describe("planSeeding", () => {
  const plan = (existing: string[], seeded: boolean, forced = false) =>
    planSeeding(NAMES, { existing, seeded, forced });

  it("gives a first run every sample", () => {
    expect(plan([], false)).toEqual(NAMES);
  });

  it("gives nothing once the first run has been handled", () => {
    // What keeps a deleted sample deleted
    expect(plan(NAMES.slice(1), true)).toEqual([]);
    expect(plan([], true)).toEqual([]);
  });

  it("leaves a browser with projects of its own alone", () => {
    expect(plan(["my-project"], false)).toEqual([]);
  });

  it("finishes a first run that was interrupted", () => {
    expect(plan(["Counter"], false)).toEqual(NAMES.slice(1));
  });

  it("adds whatever is missing when forced, marker or not", () => {
    expect(plan(["my-project", "Voting"], true, true)).toEqual(
      NAMES.filter((name) => name !== "Voting")
    );
    expect(plan(NAMES, true, true)).toEqual([]);
  });
});

describe("seeding the explorer", () => {
  const stored = (PgExplorer.fs as unknown as { __files: Map<string, string> })
    .__files;

  // A fresh browser: nothing stored, no marker, and the explorer not opened
  beforeEach(() => {
    stored.clear();
    localStorage.clear();
    window.history.replaceState(null, "", "/");
    Object.assign(PgExplorer, {
      _workspace: null,
      _initializedWorkspaceName: null,
      _isInitialized: false,
      _isTemporary: false,
    });
  });

  /** A project of the browser's own, open, the way a returning user has one */
  const createOwnProject = () =>
    PgExplorer.createWorkspace("my-project", {
      files: [["/my-project/src/lib.rs", "// mine"]],
    });

  it("adds every sample on a first run, and opens none of them", async () => {
    await PgExplorer.init();
    const switched = jest.fn();
    const subscription = PgExplorer.onDidSwitchWorkspace(switched);

    expect(await seedSamples()).toEqual(NAMES);
    subscription.dispose();

    expect(PgExplorer.allWorkspaceNames).toEqual(NAMES);
    // Nothing current and no switch, so `Flow` stays on the home screen
    expect(PgExplorer.currentWorkspaceName).toBeUndefined();
    expect(switched).not.toHaveBeenCalled();
    expect(localStorage.getItem(SEEDED_KEY)).not.toBeNull();
    // The Anchor template's layout, under the workspace's own directory
    expect(stored.has("/Tip Jar/src/lib.rs")).toBe(true);
    expect(stored.has("/Tip Jar/client/client.ts")).toBe(true);
    expect(stored.has("/Tip Jar/tests/anchor.test.ts")).toBe(true);
  });

  it("can delete a sample before anything is opened, and not bring it back", async () => {
    await PgExplorer.init();
    await seedSamples();

    await PgExplorer.deleteWorkspace("Voting");

    expect(await seedSamples()).toEqual([]);
    expect(PgExplorer.allWorkspaceNames).toEqual(
      NAMES.filter((name) => name !== "Voting")
    );
  });

  it("leaves a browser with projects of its own alone", async () => {
    await PgExplorer.init();
    await createOwnProject();

    expect(await seedSamples()).toEqual([]);
    expect(PgExplorer.allWorkspaceNames).toEqual(["my-project"]);
  });

  it("adds the missing samples when forced, and stays in the open project", async () => {
    await PgExplorer.init();
    await createOwnProject();
    // Handles the first run, adding nothing
    await seedSamples();

    expect(await seedSamples({ forced: true })).toEqual(NAMES);
    expect(PgExplorer.currentWorkspaceName).toBe("my-project");
    expect(PgExplorer.getFileContent("src/lib.rs")).toBe("// mine");
    // Every sample is there now, so nothing is added twice
    expect(await seedSamples({ forced: true })).toEqual([]);
  });

  it("waits for a real explorer, with ?samples read at load", async () => {
    localStorage.setItem(SEEDED_KEY, "1");
    window.history.replaceState(null, "", `/?${FORCE_PARAM}#app`);
    const seeded = seedWhenReady();
    // What the deck's link into the product does to the URL
    window.history.replaceState(null, "", "/#app");

    // A shared project's temporary explorer has nowhere to put them
    await PgExplorer.init({ files: [["src/lib.rs", "// shared"]] });
    await PgExplorer.init();

    expect(await seeded).toEqual(NAMES);
  });
});
