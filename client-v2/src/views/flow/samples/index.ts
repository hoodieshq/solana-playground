import { seedWhenReady } from "./seed";

/*
 * Sample projects: four small Anchor programs a first-time visitor finds in
 * the Projects list, so the product does not open empty.
 *
 * Imported for its side effect by `views/flow/index.ts`, so this runs once,
 * as the app shell loads: before anything has opened the explorer, and
 * without touching `Flow` itself. `seedWhenReady` does the waiting.
 */
seedWhenReady().catch((e) =>
  console.warn("Could not add the sample projects:", e)
);
