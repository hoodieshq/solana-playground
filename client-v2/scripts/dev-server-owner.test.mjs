import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import fs from "node:fs";
import http from "node:http";
import os from "node:os";
import path from "node:path";
import { test } from "node:test";

import {
  DEV_SERVER_ROOT_HEADER,
  decideDevServer,
  foreignServerMessage,
  whoseServer,
  whoseServerSync,
} from "./dev-server-owner.mjs";

const ROOT = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), "owner-")));
const OTHER_ROOT = "/somewhere/else/client-v2";

/** A server on a free port; `handler` decides the answer. Closed with the test. */
const serve = async (t, handler) => {
  const server = http.createServer(handler);
  await new Promise((resolve) => server.listen(0, resolve));
  t.after(() => {
    server.closeAllConnections();
    server.close();
  });
  return server.address().port;
};

const sendRoot = (value) => (req, res) => {
  res.writeHead(200, value === null ? {} : { [DEV_SERVER_ROOT_HEADER]: value });
  res.end();
};

const freePort = async () => {
  const server = http.createServer();
  await new Promise((resolve) => server.listen(0, resolve));
  const { port } = server.address();
  await new Promise((resolve) => server.close(resolve));
  return port;
};

/** The same kind of server in another process, so the parent's event loop
 * may block on `whoseServerSync` without starving it. */
const serveInChild = async (t, value) => {
  const child = spawn(
    process.execPath,
    [
      "-e",
      `const s = require("node:http").createServer((q, r) => {
         r.writeHead(200, { ${JSON.stringify(
           DEV_SERVER_ROOT_HEADER
         )}: ${JSON.stringify(value)} });
         r.end();
       });
       s.listen(0, () => console.log(s.address().port));`,
    ],
    { stdio: ["ignore", "pipe", "inherit"] }
  );
  t.after(() => child.kill());
  return new Promise((resolve, reject) => {
    child.once("error", reject);
    // A child that dies before printing its port must fail the test, not hang it.
    child.once("exit", (code) =>
      reject(new Error(`server child exited (${code}) before printing a port`))
    );
    child.stdout.once("data", (data) => resolve(Number(data.toString())));
  });
};

test("a port nobody listens on is free", async () => {
  const port = await freePort();
  assert.deepEqual(await whoseServer({ port, root: ROOT }), { kind: "free" });
});

test("a server naming this root is ours", async (t) => {
  const port = await serve(t, sendRoot(ROOT));
  assert.deepEqual(await whoseServer({ port, root: ROOT }), { kind: "ours" });
});

test("a server naming this root through a symlink is ours", async (t) => {
  const link = path.join(os.tmpdir(), `owner-link-${process.pid}`);
  fs.symlinkSync(ROOT, link);
  t.after(() => fs.rmSync(link));
  const port = await serve(t, sendRoot(link));
  assert.deepEqual(await whoseServer({ port, root: ROOT }), { kind: "ours" });
});

test("a server naming another root is foreign, with that root", async (t) => {
  const port = await serve(t, sendRoot(OTHER_ROOT));
  assert.deepEqual(await whoseServer({ port, root: ROOT }), {
    kind: "foreign",
    root: OTHER_ROOT,
  });
});

test("a server without the header is foreign, root unknown", async (t) => {
  const port = await serve(t, sendRoot(null));
  assert.deepEqual(await whoseServer({ port, root: ROOT }), {
    kind: "foreign",
    root: null,
  });
});

test("a server that never answers is foreign, root unknown", async (t) => {
  const port = await serve(t, () => {});
  assert.deepEqual(await whoseServer({ port, root: ROOT, timeoutMs: 200 }), {
    kind: "foreign",
    root: null,
  });
});

test("whoseServerSync gives the same answers from a child process", async (t) => {
  const ours = await serveInChild(t, ROOT);
  const other = await serveInChild(t, OTHER_ROOT);
  assert.deepEqual(whoseServerSync({ port: ours, root: ROOT }), {
    kind: "ours",
  });
  assert.deepEqual(whoseServerSync({ port: other, root: ROOT }), {
    kind: "foreign",
    root: OTHER_ROOT,
  });
});

test("decideDevServer starts on a free port", async () => {
  const port = await freePort();
  assert.equal(decideDevServer({ port, root: ROOT }), "start");
});

test("decideDevServer reuses our own server", async (t) => {
  const port = await serveInChild(t, ROOT);
  assert.equal(decideDevServer({ port, root: ROOT }), "reuse");
});

test("decideDevServer refuses a foreign server, naming port, root and remedy", async (t) => {
  const port = await serveInChild(t, OTHER_ROOT);
  assert.throws(
    () => decideDevServer({ port, root: ROOT }),
    (error) =>
      error.message.includes(String(port)) &&
      error.message.includes(OTHER_ROOT) &&
      error.message.includes("PORT=")
  );
});

test("foreignServerMessage with an unknown root says it is no dev server of this worktree", () => {
  const message = foreignServerMessage({ port: 3000, root: null });
  assert.match(message, /3000/);
  assert.match(message, /not a client-v2 dev server of this worktree/);
  assert.match(message, /PORT=/);
});
