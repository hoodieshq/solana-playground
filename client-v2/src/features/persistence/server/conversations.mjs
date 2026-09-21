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
  provider, model, base_url as "baseUrl", effort,
  created_at as "createdAt", updated_at as "updatedAt"`;

/**
 * Ensure the project row and the thread row exist, and are this user's.
 *
 * The insert is `on conflict (id) do nothing` rather than an upsert: the
 * parameters describe the backend the thread was *created* with, so a later
 * push from a re-pointed panel must not rewrite them. What each turn actually
 * ran on is on the messages.
 *
 * @param {import("pg").PoolClient} client
 * @param {{threadId: string, projectId: string, title?: string|null,
 *   params?: {provider?: string, model?: string, baseUrl?: string,
 *   effort?: string}}} thread
 * @returns {Promise<string>} the thread id
 * @throws {NotYours} when the id is already somebody else's thread
 */
const ensureThread = async (client, userId, thread) => {
  const { threadId, projectId, title = null, params = {} } = thread;
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
    `insert into conversations
       (id, user_id, project_id, title, provider, model, base_url, effort)
     values ($1, $2, $3, $4, $5, $6, $7, $8)
     on conflict (id) do nothing`,
    [
      threadId,
      userId,
      projectId,
      title,
      params.provider ?? null,
      params.model ?? null,
      params.baseUrl ?? null,
      params.effort ?? null,
    ]
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
 * Append items to a thread, creating it if this is its first push.
 *
 * Ids are minted by the client, so this is safely repeatable: a second dump
 * of the same messages writes nothing. That is what lets sign-in sync run
 * unconditionally instead of exactly once.
 *
 * Repeatable *within a conversation*, which is as far as a client-minted id
 * can be trusted -- see the `on conflict` below.
 *
 * @param {{threadId: string, projectId: string, title?: string|null,
 *   params?: object}} thread
 * @returns {Promise<number>} how many rows were new
 * @throws {NotYours} when the thread id is somebody else's
 */
export const appendMessages = async (userId, thread, items) => {
  const client = await getPool().connect();
  try {
    await client.query("begin");
    const conversationId = await ensureThread(client, userId, thread);

    // Not short-circuited on an empty batch: the first push of a thread that
    // has nothing in it yet is how the row comes into being, and the panel
    // does exactly that when a workspace opens.
    let rowCount = 0;
    if (items.length) {
      const values = [];
      const params = [];
      items.forEach((item, i) => {
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
      // still writes nothing: a repeat carries the same conversation.
      ({ rowCount } = await run(
        client,
        `insert into messages (id, conversation_id, kind, payload, created_at)
         select v.id::uuid, v.conversation_id::uuid, v.kind, v.payload::jsonb,
                (v.payload::jsonb ->> 'createdAt')::timestamptz
           from (values ${values.join(", ")})
                as v(id, conversation_id, kind, payload)
         on conflict (conversation_id, id) do nothing`,
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
