// A machine-wide queue for local e2e runs. Each run starts a CRA dev server
// (~700 MB) and several headless Chromiums; with a few worktrees running at
// once the machine swaps (HOO-2106). A run takes one of a few slot directories
// before it starts its dev server and gives it back when it ends, so only
// `max` runs load the machine at a time and the rest wait their turn.
// `playwright.config.mts` is the only caller, and its API is synchronous
// because the config loads synchronously.

import fs from "node:fs";
import path from "node:path";

export const DEFAULT_MAX_RUNS = 2;

/**
 * A slot directory exists a moment before its `owner.json` does. A directory
 * without one is taken for abandoned only once it is older than this, so a run
 * that is writing its owner right now is not robbed of its slot.
 */
export const OWNERLESS_SLOT_STALE_MS = 10_000;

const OWNER_FILE = "owner.json";

/**
 * @typedef {{ pid: number, worktree: string, port: number }} Owner
 * @typedef {Owner & { slot: number, since: string }} Holder
 * @typedef {{ slot: number, release: () => void }} Slot
 * @typedef {{ kind: "acquired", slot: Slot }
 *   | { kind: "busy", holders: Holder[] }} TryResult
 */

const slotPath = (dir, n) => path.join(dir, `slot-${n}`);

// EPERM means the process exists but is not ours to signal: alive. ESRCH is
// the only answer that proves it gone; any other error is not a reason to
// take a slot from someone.
const isAlive = (pid) => {
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    return error.code !== "ESRCH";
  }
};

/** @returns {Owner & { since: string } | null} */
const readOwner = (slotDir) => {
  try {
    const owner = JSON.parse(
      fs.readFileSync(path.join(slotDir, OWNER_FILE), "utf8")
    );
    return Number.isInteger(owner.pid) ? owner : null;
  } catch {
    // Missing while its run is still writing it, or unreadable: the caller
    // decides by the directory's age, so "no owner" is an answer here.
    return null;
  }
};

const isOlderThan = (slotDir, ms) => {
  try {
    return Date.now() - fs.statSync(slotDir).mtimeMs > ms;
  } catch {
    // Gone since we looked: nothing is left to steal, and the next pass
    // finds the slot free.
    return false;
  }
};

const removeSlot = (slotDir) => {
  fs.rmSync(slotDir, { recursive: true, force: true });
};

const makeSlot = (dir, n, owner) => {
  const slotDir = slotPath(dir, n);
  fs.writeFileSync(
    path.join(slotDir, OWNER_FILE),
    JSON.stringify({ ...owner, since: new Date().toISOString() })
  );
  let released = false;
  return {
    slot: n,
    release() {
      if (released) return;
      released = true;
      // Only our own slot: after a crash and a reclaim the directory may be
      // another run's by now.
      const current = readOwner(slotDir);
      if (current === null || current.pid !== owner.pid) return;
      removeSlot(slotDir);
    },
  };
};

/**
 * One pass over the slots: takes the first free one, or reports who holds
 * them. A slot whose owner is dead is removed and tried again.
 *
 * @param {{ dir: string, max: number, owner: Owner, staleMs?: number }} options
 * @returns {TryResult}
 */
export const tryAcquireSlot = ({
  dir,
  max,
  owner,
  staleMs = OWNERLESS_SLOT_STALE_MS,
}) => {
  fs.mkdirSync(dir, { recursive: true });
  const holders = [];
  for (let n = 1; n <= max; n++) {
    const slotDir = slotPath(dir, n);
    // mkdir is atomic: of several runs racing for a slot, one succeeds.
    try {
      fs.mkdirSync(slotDir);
      return { kind: "acquired", slot: makeSlot(dir, n, owner) };
    } catch (error) {
      if (error.code !== "EEXIST") throw error;
    }
    const held = readOwner(slotDir);
    const abandoned =
      held === null ? isOlderThan(slotDir, staleMs) : !isAlive(held.pid);
    if (abandoned) {
      removeSlot(slotDir);
      try {
        fs.mkdirSync(slotDir);
        return { kind: "acquired", slot: makeSlot(dir, n, owner) };
      } catch (error) {
        if (error.code !== "EEXIST") throw error;
        // Another waiting run reclaimed it first; it is theirs now.
      }
    }
    const current = readOwner(slotDir);
    holders.push({
      slot: n,
      pid: current?.pid ?? 0,
      worktree: current?.worktree ?? "unknown",
      port: current?.port ?? 0,
      since: current?.since ?? "unknown",
    });
  }
  return { kind: "busy", holders };
};

const sleep = (ms) => {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
};

/**
 * Takes a slot, blocking until one is free. `onWait` gets the holders once
 * per change of who they are, not on every poll.
 *
 * @param {{ dir: string, max: number, owner: Owner, pollMs?: number,
 *   staleMs?: number, onWait?: (holders: Holder[]) => void }} options
 * @returns {Slot}
 */
export const acquireSlot = ({
  dir,
  max,
  owner,
  pollMs = 2000,
  staleMs,
  onWait,
}) => {
  let announced = "";
  for (;;) {
    const result = tryAcquireSlot({ dir, max, owner, staleMs });
    if (result.kind === "acquired") return result.slot;
    const key = result.holders.map((h) => `${h.slot}:${h.pid}`).join(",");
    if (key !== announced) {
      announced = key;
      onWait?.(result.holders);
    }
    sleep(pollMs);
  }
};

/**
 * One line per holder.
 *
 * @param {Holder[]} holders
 * @param {number} max
 */
export const describeHolders = (holders, max) =>
  holders
    .map(
      (h) =>
        `e2e queue: all ${max} run slots are busy; waiting for ${h.worktree} (pid ${h.pid}, port ${h.port}, since ${h.since}) ...`
    )
    .join("\n");
