/**
 * Conversation reads and writes.
 *
 * Every statement is scoped by `user_id`, in the statement itself rather than
 * in a caller's check: a route that forgets the guard then returns nothing
 * instead of returning someone else's thread.
 *
 * A thread is identified by its own id, minted on the client like every
 * message id. That is what lets a project hold more than one conversation,
 * and what makes a repeated push a no-op rather than a second thread.
 */
import { getPool, query, run } from "./db.mjs";

/**
 * A thread id that exists but belongs to somebody else.
 *
 * Its own type so the route can answer 404 -- the same answer as an id that
 * does not exist at all, which is what a client guessing at uuids should be
 * told either way.
 */
export class NotYours extends Error {
  constructor() {
    super("No such thread");
    this.name = "NotYours";
  }
}

/** Columns a thread listing returns. Never the messages. */
const THREAD_COLUMNS = `id, project_id as "projectId", title,
  created_at as "createdAt", updated_at as "updatedAt"`;

/**
 * Ensure the project row and the thread row exist, and are this user's.
 *
 * The insert is `on conflict (id) do nothing` rather than an upsert: a thread
 * row is identity, not state, and every push after the first would otherwise
 * rewrite it for no gain. What each turn ran on is on the messages, in
 * `payload.origin`. Messages are the other way round: they are state, and
 * `appendMessages` replaces one when a newer copy arrives.
 *
 * @param {import("pg").PoolClient} client
 * @param {{threadId: string, projectId: string, title?: string|null}} thread
 * @returns {Promise<string>} the thread id
 * @throws {NotYours} when the id is already somebody else's thread
 */
const ensureThread = async (client, userId, thread) => {
  const { threadId, projectId, title = null } = thread;
  const kind = projectId.startsWith("tut:") ? "tutorial" : "project";

  // `(user_id, id)`, not `id`: a tutorial's id is derived, so every user who
  // starts the same one produces the same string
  await run(
    client,
    `insert into projects (id, user_id, name, kind)
     values ($1, $2, $1, $3)
     on conflict (user_id, id) do nothing`,
    [projectId, userId, kind]
  );

  await run(
    client,
    `insert into conversations (id, user_id, project_id, title)
     values ($1, $2, $3, $4)
     on conflict (id) do nothing`,
    [threadId, userId, projectId, title]
  );

  // The insert above is silent when the id is taken, and a uuid can be
  // guessed. Without this read the next statement would append a stranger's
  // messages to a stranger's thread.
  const { rows } = await run(
    client,
    `select id from conversations where id = $1 and user_id = $2`,
    [threadId, userId]
  );
  if (!rows.length) throw new NotYours();

  return rows[0].id;
};

/**
 * One thread's row, without its messages.
 *
 * @returns {Promise<object|null>}
 */
export const getThread = async (userId, threadId) => {
  const { rows } = await query(
    `select ${THREAD_COLUMNS} from conversations
      where id = $1 and user_id = $2 and deleted_at is null`,
    [threadId, userId]
  );
  return rows[0] ?? null;
};

/**
 * Every live thread on one project, newest first.
 *
 * Deliberately without messages: this is what a browser that has never seen
 * the account reads to decide which thread to open, and downloading every
 * transcript to answer that would cost the whole history.
 *
 * @returns {Promise<object[]>}
 */
export const listThreads = async (userId, projectId) => {
  const { rows } = await query(
    `select ${THREAD_COLUMNS} from conversations
      where user_id = $1 and project_id = $2 and deleted_at is null
      order by updated_at desc`,
    [userId, projectId]
  );
  return rows;
};

/**
 * Read one thread in order.
 *
 * @returns {Promise<object[]>} stored chat items, oldest first
 */
export const listMessages = async (userId, threadId) => {
  const { rows } = await query(
    `select m.payload
       from messages m
       join conversations c on c.id = m.conversation_id
      where c.id = $1 and c.user_id = $2 and c.deleted_at is null
      order by m.created_at, m.id`,
    [threadId, userId]
  );
  return rows.map((row) => row.payload);
};

/**
 * An item's version: when it last changed, or when it was made.
 *
 * The JS twin of `VERSION_OF` below, for choosing between two copies of one id
 * inside a single batch.
 */
const versionOf = (item) => Date.parse(item.updatedAt ?? item.createdAt);

/**
 * The same, in SQL, for a `payload` column of the given row.
 *
 * Cast and compared as `timestamptz`, not as text: two spellings of one
 * instant -- a different offset, or no milliseconds -- would otherwise read
 * as one being newer and rewrite the row for nothing.
 */
const VERSION_OF = (row) =>
  `coalesce(${row}.payload ->> 'updatedAt', ${row}.payload ->> 'createdAt')::timestamptz`;

/**
 * Write items to a thread, creating it if this is its first push.
 *
 * An item is not immutable once pushed. A reply streams into an item that
 * already exists, and an approval is answered and given an outcome later, so
 * a push can carry a newer copy of an id the server already holds. The newer
 * one replaces the older, by `updatedAt ?? createdAt`; an equal or older copy
 * writes nothing. Insert-only used to be the rule, and a reply pushed while
 * it was still streaming was then what the account kept for ever.
 *
 * Ids are minted by the client, so this is still safely repeatable: a second
 * dump of the same messages writes nothing, and neither does a stale copy
 * from a device that pulled before the turn finished. That is what lets
 * sign-in sync run unconditionally instead of exactly once.
 *
 * Repeatable *within a conversation*, which is as far as a client-minted id
 * can be trusted -- see the `on conflict` below.
 *
 * @param {{threadId: string, projectId: string, title?: string|null}} thread
 * @returns {Promise<number>} how many rows were written: inserted, or
 * replaced by a newer copy. A copy that lost to the stored one is not counted.
 * @throws {NotYours} when the thread id is somebody else's
 */
export const appendMessages = async (userId, thread, items) => {
  const client = await getPool().connect();
  try {
    await client.query("begin");
    const conversationId = await ensureThread(client, userId, thread);

    // One copy per id, the newest. A thread can hold an id twice -- it lives
    // in IndexedDB, which the user can edit -- and `on conflict do update`
    // refuses to touch one row twice in a statement, so a duplicate would
    // fail the whole push where `do nothing` used to absorb it.
    //
    // Keyed on the lower-cased id because that is what the row is keyed on:
    // the insert casts to `uuid`, which ignores case, so two spellings of one
    // id are one row and would trip the same refusal.
    const newest = new Map();
    for (const item of items) {
      const key = item.id.toLowerCase();
      const kept = newest.get(key);
      if (!kept || versionOf(item) > versionOf(kept)) newest.set(key, item);
    }

    // Not short-circuited on an empty batch: the first push of a thread that
    // has nothing in it yet is how the row comes into being, and the panel
    // does exactly that when a workspace opens.
    let rowCount = 0;
    if (newest.size) {
      const values = [];
      const params = [];
      [...newest.values()].forEach((item, i) => {
        const at = i * 4;
        values.push(`($${at + 1}, $${at + 2}, $${at + 3}, $${at + 4})`);
        params.push(item.id, conversationId, item.kind, JSON.stringify(item));
      });

      // `(conversation_id, id)`, not `id`: the id comes verbatim out of the
      // request body, so it is only unique within the scope that minted it.
      // Against a global key, one account posting another's id would have its
      // write dropped in silence -- and the returned count would answer
      // whether that id exists anywhere at all. Same reasoning as
      // `(user_id, id)` on `projects`, one level down. Re-dumping a thread
      // still writes nothing: a repeat carries the same conversation, and
      // the same version.
      //
      // The key is also what keeps the update inside its owner's thread:
      // `conversationId` is the one `ensureThread` has just proved is this
      // user's, so a conflict can only ever be with a row of that thread.
      // `created_at` is left as it was, because it is what orders the thread
      // and a reply finishing does not move it.
      //
      // The versions compare clocks of one device, not two: an item is only
      // ever changed by the tab running its turn -- see `mergeThreads` in
      // `chat-codec.ts` -- so both copies of an id were stamped there.
      ({ rowCount } = await run(
        client,
        `insert into messages (id, conversation_id, kind, payload, created_at)
         select v.id::uuid, v.conversation_id::uuid, v.kind, v.payload::jsonb,
                (v.payload::jsonb ->> 'createdAt')::timestamptz
           from (values ${values.join(", ")})
                as v(id, conversation_id, kind, payload)
         on conflict (conversation_id, id) do update
            set payload = excluded.payload, kind = excluded.kind
          where ${VERSION_OF("excluded")} > ${VERSION_OF("messages")}`,
        params
      ));
    }

    await run(
      client,
      "update conversations set updated_at = now() where id = $1",
      [conversationId]
    );
    await client.query("commit");
    return rowCount;
  } catch (e) {
    await client.query("rollback");
    throw e;
  } finally {
    client.release();
  }
};
