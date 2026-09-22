import assert from "node:assert/strict";
import { before, beforeEach, describe, it } from "node:test";

import { query } from "./db.mjs";
import {
  appendMessages,
  getThread,
  listMessages,
  listThreads,
  NotYours,
} from "./conversations.mjs";

// `yarn test-api` loads `.env`; without a database this suite skips rather
// than fails, which is what lets the unit suites run on their own.
const DB = process.env.DATABASE_URL;

describe("conversations", { skip: !DB && "DATABASE_URL not set" }, () => {
  const userId = "test-user";
  // A second account, needed by the cases below that write as somebody else.
  // A read can name a user that does not exist; a write cannot, because
  // `projects.user_id` is a foreign key into "user".
  const other = "test-user-2";

  /** A thread id, minted the way the client mints one */
  const thread = (n) =>
    `11111111-0000-4000-8000-${String(n).padStart(12, "0")}`;

  /** The shape `appendMessages` takes: which thread, on which workspace */
  const on = (n, extra = {}) => ({
    threadId: thread(n),
    projectId: "p1",
    ...extra,
  });

  before(async () => {
    for (const [id, email] of [
      [userId, "test@example.com"],
      [other, "other@example.com"],
    ]) {
      await query(
        `insert into "user" (id, name, email, "emailVerified", "createdAt", "updatedAt")
         values ($1, 'Test', $2, false, now(), now())
         on conflict (id) do nothing`,
        [id, email]
      );
    }
  });

  beforeEach(async () => {
    await query("delete from projects where user_id = any($1)", [
      [userId, other],
    ]);
  });

  const item = (n) => ({
    id: `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`,
    kind: "user",
    createdAt: new Date(n * 1000).toISOString(),
    text: `m${n}`,
  });

  it("returns an empty thread for an unknown id", async () => {
    assert.deepEqual(await listMessages(userId, thread(9)), []);
  });

  it("creates the project and the thread on first append", async () => {
    await appendMessages(userId, on(1), [item(1)]);
    const items = await listMessages(userId, thread(1));
    assert.equal(items.length, 1);
    assert.equal(items[0].text, "m1");
  });

  it("is idempotent, so a repeated dump changes nothing", async () => {
    await appendMessages(userId, on(1), [item(1), item(2)]);
    await appendMessages(userId, on(1), [item(1), item(2)]);
    assert.equal((await listMessages(userId, thread(1))).length, 2);
  });

  it("orders by creation time, then id", async () => {
    await appendMessages(userId, on(1), [item(3), item(1), item(2)]);
    const items = await listMessages(userId, thread(1));
    assert.deepEqual(
      items.map((i) => i.text),
      ["m1", "m2", "m3"]
    );
  });

  it("does not leak another user's thread", async () => {
    await appendMessages(userId, on(1), [item(1)]);
    assert.deepEqual(await listMessages(other, thread(1)), []);
  });

  it("refuses to append to a thread id that is somebody else's", async () => {
    await appendMessages(userId, on(1), [item(1)]);

    await assert.rejects(
      () => appendMessages(other, on(1), [item(2)]),
      NotYours
    );
    // And the owner's thread is untouched by the attempt
    assert.equal((await listMessages(userId, thread(1))).length, 1);
  });

  describe("a project holding more than one thread", () => {
    it("keeps them apart", async () => {
      await appendMessages(userId, on(1), [item(1)]);
      await appendMessages(userId, on(2), [item(2)]);

      assert.equal((await listMessages(userId, thread(1))).length, 1);
      assert.equal((await listMessages(userId, thread(2))).length, 1);
    });

    it("lists them newest first, without their messages", async () => {
      await appendMessages(userId, on(1), [item(1)]);
      await appendMessages(userId, on(2), [item(2)]);

      const threads = await listThreads(userId, "p1");
      assert.deepEqual(
        threads.map((t) => t.id),
        [thread(2), thread(1)]
      );
      assert.ok(!("items" in threads[0]));
    });

    it("lists nobody else's", async () => {
      await appendMessages(userId, on(1), [item(1)]);
      assert.deepEqual(await listThreads(other, "p1"), []);
    });
  });

  describe("the parameters a thread was created with", () => {
    const params = {
      provider: "anthropic",
      model: "claude-opus-5",
      effort: "high",
    };

    it("are stored on the thread", async () => {
      await appendMessages(userId, on(1, { params }), [item(1)]);

      const stored = await getThread(userId, thread(1));
      assert.equal(stored.provider, "anthropic");
      assert.equal(stored.model, "claude-opus-5");
      assert.equal(stored.effort, "high");
      assert.equal(stored.baseUrl, null);
    });

    it("are null when the client had no backend to name", async () => {
      await appendMessages(userId, on(1), [item(1)]);

      const stored = await getThread(userId, thread(1));
      assert.equal(stored.provider, null);
      assert.equal(stored.model, null);
    });

    it("keep the endpoint for an OpenAI-compatible backend", async () => {
      await appendMessages(
        userId,
        on(1, {
          params: {
            provider: "openai",
            model: "gpt-5.1",
            baseUrl: "https://api.openai.com/v1",
          },
        }),
        [item(1)]
      );

      const stored = await getThread(userId, thread(1));
      assert.equal(stored.baseUrl, "https://api.openai.com/v1");
    });

    it("describe creation, so a later push does not rewrite them", async () => {
      await appendMessages(userId, on(1, { params }), [item(1)]);
      await appendMessages(
        userId,
        on(1, { params: { provider: "gemini", model: "gemini-3.6-flash" } }),
        [item(2)]
      );

      const stored = await getThread(userId, thread(1));
      assert.equal(stored.provider, "anthropic");
      assert.equal(stored.model, "claude-opus-5");
    });

    it("are refused by the database when the provider is not one we serve", async () => {
      await assert.rejects(() =>
        appendMessages(userId, on(1, { params: { provider: "hotmail" } }), [
          item(1),
        ])
      );
    });
  });

  it("stores the backend each reply came from, inside the message", async () => {
    const reply = {
      id: "00000000-0000-4000-8000-0000000000aa",
      kind: "assistant",
      createdAt: new Date(2000).toISOString(),
      text: "hello",
      origin: { provider: "default", model: "some-model" },
    };
    await appendMessages(userId, on(1), [reply]);

    const [stored] = await listMessages(userId, thread(1));
    assert.deepEqual(stored.origin, {
      provider: "default",
      model: "some-model",
    });
  });

  // Ids are minted by the client, so two threads holding the same one is a
  // thing the server has to survive rather than a thing it can rule out. Under
  // the original global `messages.id` primary key the second insert hit
  // `on conflict do nothing` and was dropped -- while the route still reported
  // success, so the message was lost with nothing said about it.
  it("keeps the same client-minted id in two of one user's threads", async () => {
    await appendMessages(userId, on(1), [item(1)]);
    await appendMessages(userId, on(2), [item(1)]);

    assert.equal((await listMessages(userId, thread(1))).length, 1);
    assert.equal((await listMessages(userId, thread(2))).length, 1);
  });

  // The same collision across accounts, which is the reachable half: one user
  // can choose an id another user already posted. Both messages survive, and
  // the count returned for the second write is 1 -- it must not double as an
  // answer to "does this id exist in somebody else's thread".
  it("keeps the same client-minted id across two accounts", async () => {
    // Two threads, because a thread id is global: pushing into somebody
    // else's is `NotYours`, which is a different test. What is shared here is
    // the *message* id, which is the one a client actually chooses.
    assert.equal(await appendMessages(userId, on(1), [item(1)]), 1);
    assert.equal(
      await appendMessages(other, { threadId: thread(2), projectId: "p1" }, [
        item(1),
      ]),
      1
    );

    assert.equal((await listMessages(userId, thread(1))).length, 1);
    assert.equal((await listMessages(other, thread(2))).length, 1);
  });
});
