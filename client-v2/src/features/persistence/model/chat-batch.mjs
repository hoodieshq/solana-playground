// How large one conversation push may be. Spelled once, here, because both
// halves act on it: `api/conversations.mjs` refuses a body over these caps
// with a 413, and `chat-sync.ts` splits a thread so that no body reaches them.
// A thread used to go up whole, so one that grew past the byte cap got a 413
// on every push and stopped syncing for good. `.mjs` so Node can import it
// directly; `allowJs` lets the TypeScript side import the same file (see
// `deleted.mjs`).

/** Anything larger is not a conversation batch, it is an attack or a bug */
export const MAX_BATCH_BYTES = 2_000_000;

/** Items in one batch, whatever their size */
export const MAX_BATCH_ITEMS = 500;

const encoder = new TextEncoder();

/** What a string weighs on the wire: UTF-8 bytes, not UTF-16 code units */
const bytesOf = (text) => encoder.encode(text).length;

/**
 * Split a push into request bodies the server accepts.
 *
 * Every body is `JSON.stringify({...envelope, items})`, the exact string the
 * caller sends, and is measured in UTF-8 bytes against `maxBytes`: the caps on
 * an item count characters, and a character can be three bytes on the wire.
 * Items keep their order, so the first body is the one that creates the
 * thread. The server upserts each item by id, so several bodies land the same
 * rows one body would have.
 *
 * An item that could not fit even in a body of its own is left out and named
 * in `oversized`: sending it would only buy the 413 this exists to avoid, and
 * the rest of the thread still syncs.
 *
 * @template {{ id: string }} T
 * @param {Record<string, unknown>} envelope what every body carries besides `items`
 * @param {readonly T[]} items
 * @param {{ maxBytes?: number, maxItems?: number }} [caps]
 * @returns {{ bodies: string[], oversized: string[] }}
 */
export const batchPush = (
  envelope,
  items,
  { maxBytes = MAX_BATCH_BYTES, maxItems = MAX_BATCH_ITEMS } = {}
) => {
  // `items` goes last, so the empty body is the envelope plus `[]` and every
  // item adds its own bytes and one comma after the first
  const emptyBytes = bytesOf(JSON.stringify({ ...envelope, items: [] }));

  /** @type {T[][]} */
  const batches = [];
  /** @type {string[]} */
  const oversized = [];
  /** @type {T[]} */
  let batch = [];
  let size = emptyBytes;

  for (const item of items) {
    const weight = bytesOf(JSON.stringify(item));
    if (emptyBytes + weight > maxBytes) {
      oversized.push(item.id);
      continue;
    }
    const added = batch.length ? weight + 1 : weight;
    if (batch.length >= maxItems || size + added > maxBytes) {
      batches.push(batch);
      batch = [];
      size = emptyBytes;
    }
    size += batch.length ? weight + 1 : weight;
    batch.push(item);
  }
  if (batch.length) batches.push(batch);

  return {
    bodies: batches.map((b) => JSON.stringify({ ...envelope, items: b })),
    oversized,
  };
};
