import assert from "node:assert/strict";
import { before, beforeEach, describe, it } from "node:test";

import { query } from "./db.mjs";
import { appendMessages, listMessages } from "./conversations.mjs";

// `yarn test-api` loads `.env`; without a database this suite skips rather
// than fails, which is what lets the unit suites run on their own.
const DB = process.env.DATABASE_URL;

describe("conversations", { skip: !DB && "DATABASE_URL not set" }, () => {
  const userId = "test-user";
  // A second account, needed by the cases below that write as somebody else.
  // A read can name a user that does not exist; a write cannot, because
  // `projects.user_id` is a foreign key into "user".
  const otherUserId = "test-user-2";

  before(async () => {
    await query(
      `insert into "user" (id, name, email, "emailVerified", "createdAt", "updatedAt")
       values ($1, 'Test', 'test@example.com', false, now(), now()),
              ($2, 'Other', 'other@example.com', false, now(), now())
       on conflict (id) do nothing`,
      [userId, otherUserId]
    );
  });

  beforeEach(async () => {
    await query("delete from projects where user_id = any($1)", [
      [userId, otherUserId],
    ]);
  });

  const item = (n) => ({
    id: `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`,
    kind: "user",
    createdAt: new Date(n * 1000).toISOString(),
    text: `m${n}`,
  });

  it("returns an empty thread for an unknown project", async () => {
    assert.deepEqual(await listMessages(userId, "nope"), []);
  });

  it("creates the project and conversation on first append", async () => {
    await appendMessages(userId, "p1", [item(1)]);
    const items = await listMessages(userId, "p1");
    assert.equal(items.length, 1);
    assert.equal(items[0].text, "m1");
  });

  it("is idempotent, so a repeated dump changes nothing", async () => {
    await appendMessages(userId, "p1", [item(1), item(2)]);
    await appendMessages(userId, "p1", [item(1), item(2)]);
    assert.equal((await listMessages(userId, "p1")).length, 2);
  });

  it("orders by creation time, then id", async () => {
    await appendMessages(userId, "p1", [item(3), item(1), item(2)]);
    const items = await listMessages(userId, "p1");
    assert.deepEqual(
      items.map((i) => i.text),
      ["m1", "m2", "m3"]
    );
  });

  it("does not leak another user's thread", async () => {
    await appendMessages(userId, "p1", [item(1)]);
    assert.deepEqual(await listMessages("someone-else", "p1"), []);
  });

  // Ids are minted by the client, so two threads holding the same one is a
  // thing the server has to survive rather than a thing it can rule out. Under
  // the original global `messages.id` primary key the second insert hit
  // `on conflict do nothing` and was dropped -- while the route still reported
  // success, so the message was lost with nothing said about it.
  it("keeps the same client-minted id in two of one user's threads", async () => {
    await appendMessages(userId, "p1", [item(1)]);
    await appendMessages(userId, "p2", [item(1)]);

    assert.equal((await listMessages(userId, "p1")).length, 1);
    assert.equal((await listMessages(userId, "p2")).length, 1);
  });

  // The same collision across accounts, which is the reachable half: one user
  // can choose an id another user already posted. Both messages survive, and
  // the count returned for the second write is 1 -- it must not double as an
  // answer to "does this id exist in somebody else's thread".
  it("keeps the same client-minted id across two accounts", async () => {
    assert.equal(await appendMessages(userId, "p1", [item(1)]), 1);
    assert.equal(await appendMessages(otherUserId, "p1", [item(1)]), 1);

    assert.equal((await listMessages(userId, "p1")).length, 1);
    assert.equal((await listMessages(otherUserId, "p1")).length, 1);
  });
});
