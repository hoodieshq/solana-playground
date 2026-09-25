import { SAMPLES } from "./samples";
// Deep imports rather than the `utils` barrel, which reaches `settings.ts` and
// a webpack-defined global jest cannot resolve (see `effects/session`). They
// are what keep this module testable.
import { PgExplorer } from "../../../utils/explorer/explorer";
import { PgWorkspace } from "../../../utils/explorer/workspace";

/**
 * Set once this browser's first run has been handled, whether or not it got
 * samples. Without it a first run looks exactly like a browser whose projects
 * were all deleted, and deleting the samples would bring them straight back.
 */
export const SEEDED_KEY = "pg-samples-seeded-v1";

/** `?samples` adds whichever samples are missing, whatever the marker says */
export const FORCE_PARAM = "samples";

/**
 * Decide which samples to add.
 *
 * - Forced: every sample that is not already there by name.
 * - First run: the same. A first run is a browser with no workspaces, or with
 *   nothing but samples, which is a first run that was interrupted.
 * - Anything else: none.
 *
 * @param sampleNames every sample, in order
 * @param state what this browser has, and what was asked for
 * @returns the names to add, in sample order
 */
export const planSeeding = (
  sampleNames: readonly string[],
  state: {
    /** Workspace names this browser already has */
    existing: readonly string[];
    /** Whether the first run has already been handled */
    seeded: boolean;
    /** Whether the page was opened with `?samples` */
    forced: boolean;
  }
): string[] => {
  const missing = sampleNames.filter((name) => !state.existing.includes(name));
  if (state.forced) return missing;
  if (state.seeded) return [];

  const firstRun = state.existing.every((name) => sampleNames.includes(name));
  return firstRun ? missing : [];
};

/**
 * Add the samples this browser should have, without opening any of them.
 *
 * `importWorkspace`, not `createWorkspace`. Creating always switches to the
 * new workspace, and a switch is heard everywhere: `Flow` answers it by
 * jumping into the project view, `routes/tutorials` by navigating away, and
 * sync by reconciling. On a first run there is no switching back, either: the
 * workspace to return to is none, and nothing makes the explorer current-less
 * again. Importing writes the files and registers the workspace while the
 * current one stays exactly where it was, which is why sync uses it too.
 *
 * It still dispatches `onDidCreateWorkspace`, which is what refreshes the
 * Projects list. `Flow` listens for that as well, but it only moves to the
 * project view when a workspace is current, and on a first run none is.
 *
 * A sample opens on `src/lib.rs`, like a new Anchor project: with no saved
 * tabs, the explorer falls back to the same default file `createWorkspace`
 * picks.
 *
 * @param opts -
 * - `forced`: add any missing sample, marker or not (`?samples`)
 * @returns the names added
 */
export const seedSamples = async (opts?: {
  forced?: boolean;
}): Promise<string[]> => {
  const existing = PgExplorer.allWorkspaceNames;
  if (!canSeed() || !existing) return [];

  const toAdd = planSeeding(
    SAMPLES.map((sample) => sample.name),
    { existing, seeded: isSeeded(), forced: !!opts?.forced }
  );

  const added: string[] = [];
  for (const sample of SAMPLES) {
    if (!toAdd.includes(sample.name)) continue;

    try {
      const files = await sample.getFiles();
      // Sync may have brought down a project of the same name meanwhile
      if (PgExplorer.allWorkspaceNames?.includes(sample.name)) continue;

      await PgExplorer.importWorkspace(sample.name, {
        id: PgWorkspace.mintId(sample.name),
        files: Object.fromEntries(files),
      });
      added.push(sample.name);
    } catch (e) {
      console.warn(`Could not add the "${sample.name}" sample:`, e);
    }
  }

  markSeeded();
  return added;
};

/**
 * Seed once the product has opened the explorer.
 *
 * This waits for `Flow`'s own `PgExplorer.init()` rather than calling it.
 * That is the moment there is a workspace list to decide from, and waiting for
 * it means:
 * - nothing runs while the deck or the landing page is up. They never mount
 *   the product, so they never open the explorer.
 * - no second init races the first. `init` reads the workspace list from disk
 *   when it has none in memory, so two in flight could have the second read
 *   land after the samples were added, and drop them.
 *
 * A shared or GitHub project opens the explorer in temporary mode, with no
 * workspaces to add to. That init is let pass, and the next real one is used.
 *
 * The URL is read now, at load. The deck's link into the product replaces it
 * with `/#app`, so `?samples` could be gone by the time the explorer opens.
 * `?classic` is read at load by `app/Panels` too, and the classic layout is
 * left alone: the samples are for Flow's home screen, and classic has none.
 * Its first-run decision is left for a Flow load.
 *
 * @returns the names added, once seeding has run
 */
export const seedWhenReady = (): Promise<string[]> => {
  const params = new URLSearchParams(window.location.search);
  if (params.has("classic")) return Promise.resolve([]);

  const forced = params.has(FORCE_PARAM);
  return new Promise((resolve, reject) => {
    const run = () => seedSamples({ forced }).then(resolve, reject);
    if (canSeed()) {
      run();
      return;
    }

    const subscription = PgExplorer.onDidInit(() => {
      if (!canSeed()) return;
      subscription.dispose();
      run();
    });
  });
};

/** Initialized, with real workspaces behind it rather than a temporary project */
const canSeed = () =>
  PgExplorer.isInitialized &&
  !PgExplorer.isTemporary &&
  !!PgExplorer.allWorkspaceNames;

const isSeeded = () => {
  try {
    return localStorage.getItem(SEEDED_KEY) !== null;
  } catch {
    return false;
  }
};

const markSeeded = () => {
  try {
    localStorage.setItem(SEEDED_KEY, "1");
  } catch {
    // Storage is off, so there is nowhere to remember it
  }
};
