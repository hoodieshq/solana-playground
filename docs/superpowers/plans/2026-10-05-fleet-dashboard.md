# Fleet Dashboard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A live Artifact page over every Claude Code session in solana-playground, fed by sessions checking themselves in and by Dispatcher reconciling them against reality.

**Architecture:** Pure logic lives in small ES modules under `~/.claude/fleet/lib/`, tested with `node --test`. A build script inlines them into one Artifact page that reads the artifact db live. A scan script gathers the registry, transcripts, gh and git into one JSON patch that Dispatcher writes with `ArtifactData`. Two user-level skills, `fleet-checkin` and `fleet-reconcile`, carry the protocol.

**Tech Stack:** Node 22 (`node --test`, no npm deps), POSIX sh, plain browser JS, Artifact `db` + `user` capabilities, `ArtifactData`, `gh`, `git`.

**Spec:** `docs/superpowers/specs/2026-10-05-fleet-dashboard-design.md` (context-archive, `2aed5b37`)

## Global Constraints

- All code lives in `~/.claude/fleet/` (its own local git repo, no remote) and `~/.claude/skills/fleet-checkin/`, `~/.claude/skills/fleet-reconcile/`. Nothing goes into the solana-playground repo except this plan and the spec.
- No npm dependencies. Node 22 built-ins only.
- Page copy is Russian; code, comments, commit messages and skills are English.
- Commits in `~/.claude/fleet` carry no co-author trailer and no mention of AI (Slava is sole author).
- Statuses: `not_started | in_progress | in_review | blocked | done` → не начато / идёт / ждёт ревью / заблокировано / готово.
- Names: `HOO-xxxx - Label` before a PR, `#PR - HOO-xxxx - Label` after; no ticket → plain label.
- Field ownership: sessions write only `sessions/<id>.reported`, their asks (except `answer`, `notified_at`) and resource claims; Dispatcher writes only `observed`, `work/*`, `asks/*.notified_at`, `resources/*.orphaned`, `meta/dispatcher`; the page writes only `asks/<id>.answer`.
- `ArtifactData` writes to an existing document need `if_version` from a read; on a version conflict, re-read and redo, never drop the pin.
- `update` merges nested objects recursively and replaces arrays; so `reported` is always written with every key present (null when empty).
- Thresholds: stale 60 min idle without check-in; busy_silent 3 h; hung 2 h in `dialog open`; Dispatcher pulse red after 45 min.
- Dispatcher never merges, pushes, kills or closes anything.
- Page: Solana-dark single theme, works at 400 px, no horizontal page scroll, every PR/ticket/artifact/spec is an `<a href>`, every copyable line is a copy button with a select-text fallback.
- Links: PR `https://github.com/hoodieshq/solana-playground/pull/<n>`; ticket `https://linear.app/foundation/issue/<HOO-n>`; spec on context-archive `https://github.com/hoodieshq/solana-playground/blob/context-archive/<path>`.

## Review Focus

1. **A session's first check-in when no document exists yet** — `update` rejects a missing document; the skill must `set` on a miss and must not clobber an `observed` field Dispatcher created a moment earlier (it re-reads and updates on a version conflict). Pinned in Task 7 (protocol) and the dry run in Task 9.
2. **Registry files of dead pids and of other projects** — `~/.claude/sessions` holds every project's sessions and stale files; only live pids whose `cwd` is inside solana-playground count. Pinned in Task 4 tests.
3. **A session with no ticket, or a ticket and no label** — the expected name must not render as `undefined - …`. Pinned in Task 2 tests.
4. **An epic with a dependency cycle or a dep on an unknown node** — the layout must not loop or throw; it places the node and drops the bad edge. Pinned in Task 3 tests.
5. **The db empty or `claude.use("db")` null** — the page shows the designed empty / signed-out state, not a blank or a stack trace. Pinned in Task 5 (render tests for empty input) and the preview in Task 6.

---

## File Structure

```
~/.claude/fleet/
  lib/status.js        status enum, Russian labels, link builders
  lib/names.js         expectedName(), renameLine()
  lib/now.js           buildNow(): counters + ordered "ждёт тебя" items
  lib/epic-layout.js   layoutEpic(): columns by depth, rows by stream
  lib/render.js        HTML string builders for each page block (pure)
  lib/scan.js          scan(): pure reconcile from gathered inputs
  bin/whoami.sh        prints {"sessionId","name","pid"} of the calling session
  bin/gather.mjs       reads registry, transcripts, gh, git; runs scan(); prints the patch
  bin/build-page.mjs   inlines lib/*.js into page/index.html → dist/fleet.html
  page/index.html      shell: tokens, styles, boot code (db subscriptions, clicks)
  test/*.test.mjs      node --test
~/.claude/skills/fleet-checkin/SKILL.md
~/.claude/skills/fleet-reconcile/SKILL.md
```

---

### Task 1: Repo, status and link helpers

**Files:**
- Create: `~/.claude/fleet/lib/status.js`, `~/.claude/fleet/test/status.test.mjs`, `~/.claude/fleet/package.json`, `~/.claude/fleet/.gitignore`

**Interfaces:**
- Produces: `STATUSES: string[]`, `statusLabel(s: string): string`, `prUrl(n: number): string`, `ticketUrl(t: string): string`, `specUrl(path: string): string`, `esc(s: unknown): string` (HTML-escape, null → "").

- [ ] **Step 1: Init the repo**

```bash
mkdir -p ~/.claude/fleet/{lib,bin,page,test,dist} && cd ~/.claude/fleet && git init -q
printf 'dist/\nnode_modules/\n' > .gitignore
printf '{ "name": "fleet", "private": true, "type": "module", "scripts": { "test": "node --test test/" } }\n' > package.json
```

- [ ] **Step 2: Write the failing test** `test/status.test.mjs`

```js
import { test } from "node:test";
import assert from "node:assert/strict";
import { STATUSES, statusLabel, prUrl, ticketUrl, specUrl, esc } from "../lib/status.js";

test("five statuses with Russian labels", () => {
  assert.deepEqual(STATUSES, ["not_started", "in_progress", "in_review", "blocked", "done"]);
  assert.equal(statusLabel("in_review"), "ждёт ревью");
  assert.equal(statusLabel("weird"), "weird");
});
test("links", () => {
  assert.equal(prUrl(45), "https://github.com/hoodieshq/solana-playground/pull/45");
  assert.equal(ticketUrl("HOO-1850"), "https://linear.app/foundation/issue/HOO-1850");
  assert.equal(specUrl("docs/a.md"), "https://github.com/hoodieshq/solana-playground/blob/context-archive/docs/a.md");
});
test("esc", () => {
  assert.equal(esc('<a href="x">&'), "&lt;a href=&quot;x&quot;&gt;&amp;");
  assert.equal(esc(null), "");
});
```

- [ ] **Step 3: Run it to verify it fails**

Run: `cd ~/.claude/fleet && node --test test/status.test.mjs`
Expected: FAIL, cannot find module `../lib/status.js`.

- [ ] **Step 4: Implement** `lib/status.js`

```js
export const STATUSES = ["not_started", "in_progress", "in_review", "blocked", "done"];
const LABELS = {
  not_started: "не начато", in_progress: "идёт", in_review: "ждёт ревью",
  blocked: "заблокировано", done: "готово",
};
export const statusLabel = (s) => LABELS[s] ?? String(s);
const REPO = "https://github.com/hoodieshq/solana-playground";
export const prUrl = (n) => `${REPO}/pull/${n}`;
export const ticketUrl = (t) => `https://linear.app/foundation/issue/${t}`;
export const specUrl = (p) => `${REPO}/blob/context-archive/${p}`;
export const esc = (s) => s == null ? "" : String(s)
  .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
```

- [ ] **Step 5: Run to verify it passes**

Run: `node --test test/status.test.mjs` → PASS (3 tests).

- [ ] **Step 6: Commit**

```bash
git add -A && git commit -qm "Add status labels and link helpers"
```

---

### Task 2: Expected session names

**Files:**
- Create: `~/.claude/fleet/lib/names.js`, `~/.claude/fleet/test/names.test.mjs`

**Interfaces:**
- Produces: `expectedName(reported: {pr?, ticket?, label?} | null, fallback: string): string`, `renameLine(name: string): string` (→ `"/rename " + name`), `nameMismatch(session: {reported, observed}): string | null` (expected name when it differs from `observed.registry_name`, else null).

- [ ] **Step 1: Write the failing test** `test/names.test.mjs`

```js
import { test } from "node:test";
import assert from "node:assert/strict";
import { expectedName, renameLine, nameMismatch } from "../lib/names.js";

test("ticket and PR", () => {
  assert.equal(expectedName({ pr: 45, ticket: "HOO-1850", label: "React 19" }, "x"), "#45 - HOO-1850 - React 19");
});
test("ticket, no PR", () => {
  assert.equal(expectedName({ pr: null, ticket: "HOO-1802", label: "Token bridge" }, "x"), "HOO-1802 - Token bridge");
});
test("no ticket keeps the plain label", () => {
  assert.equal(expectedName({ ticket: null, label: "Dispatcher" }, "x"), "Dispatcher");
});
test("missing label falls back, never 'undefined'", () => {
  assert.equal(expectedName({ ticket: "HOO-1", label: null }, "solana-playground-6d"), "HOO-1 - solana-playground-6d");
  assert.equal(expectedName(null, "Fleet dashboard"), "Fleet dashboard");
});
test("mismatch", () => {
  const s = { reported: { pr: 46, ticket: "HOO-1715", label: "Vitest" }, observed: { registry_name: "solana-playground-6d" } };
  assert.equal(nameMismatch(s), "#46 - HOO-1715 - Vitest");
  assert.equal(renameLine("#46 - HOO-1715 - Vitest"), "/rename #46 - HOO-1715 - Vitest");
  assert.equal(nameMismatch({ reported: { ticket: null, label: "Dispatcher" }, observed: { registry_name: "Dispatcher" } }), null);
  assert.equal(nameMismatch({ reported: null, observed: { registry_name: "a" } }), null);
});
```

- [ ] **Step 2: Run** `node --test test/names.test.mjs` → FAIL (module missing).

- [ ] **Step 3: Implement** `lib/names.js`

```js
export function expectedName(reported, fallback) {
  const label = reported?.label || fallback;
  if (!reported?.ticket) return label;
  const base = `${reported.ticket} - ${label}`;
  return reported.pr ? `#${reported.pr} - ${base}` : base;
}
export const renameLine = (name) => `/rename ${name}`;
export function nameMismatch(session) {
  if (!session?.reported) return null; // never checked in: nothing to compute from
  const current = session.observed?.registry_name ?? "";
  const want = expectedName(session.reported, current);
  return want === current ? null : want;
}
```

- [ ] **Step 4: Run** → PASS (5 tests).

- [ ] **Step 5: Commit** `git add -A && git commit -qm "Compute expected session names"`

---

### Task 3: Epic layout

**Files:**
- Create: `~/.claude/fleet/lib/epic-layout.js`, `~/.claude/fleet/test/epic-layout.test.mjs`

**Interfaces:**
- Consumes: an `epics/<id>` body: `{streams: [{id,title,order}], nodes: [{id,label,sub,stream,ref,deps,critical,status}], gates: [{date,label}]}`.
- Produces: `layoutEpic(epic, statusOf: (node) => string): {width, height, lanes: [{id,title,y,h}], nodes: [{...node, x, y, w, h, status}], edges: [{from,to,critical,d}], gates: [{x,label}]}`. Constants: column width 150, node 128×44, lane height 70, left gutter 110.

- [ ] **Step 1: Write the failing test** `test/epic-layout.test.mjs`

```js
import { test } from "node:test";
import assert from "node:assert/strict";
import { layoutEpic } from "../lib/epic-layout.js";

const epic = {
  streams: [{ id: "tools", title: "Инструменты", order: 1 }, { id: "rules", title: "Правила", order: 0 }],
  nodes: [
    { id: "spike", label: "Спайк", stream: "tools", deps: [], status: "done" },
    { id: "r19", label: "React 19", stream: "tools", deps: ["spike"], critical: true, ref: "pr-45" },
    { id: "rules", label: "Правила", stream: "rules", deps: [] },
    { id: "shell", label: "Shell", stream: "tools", deps: ["r19", "rules"], critical: true },
  ],
  gates: [],
};

test("columns follow dependency depth, rows follow stream order", () => {
  const L = layoutEpic(epic, (n) => n.status ?? "not_started");
  const by = Object.fromEntries(L.nodes.map((n) => [n.id, n]));
  assert.equal(by.spike.x, by.rules.x);
  assert.ok(by.r19.x > by.spike.x);
  assert.ok(by.shell.x > by.r19.x);
  assert.ok(by.rules.y < by.spike.y, "rules lane (order 0) above tools");
  assert.equal(L.lanes[0].id, "rules");
});
test("critical edges are marked only when both ends are critical", () => {
  const L = layoutEpic(epic, () => "not_started");
  const e = L.edges.find((x) => x.from === "r19" && x.to === "shell");
  assert.equal(e.critical, true);
  assert.equal(L.edges.find((x) => x.from === "spike").critical, false);
});
test("cycles and unknown deps neither throw nor loop", () => {
  const bad = { streams: [{ id: "s", title: "S", order: 0 }], gates: [],
    nodes: [{ id: "a", stream: "s", deps: ["b"] }, { id: "b", stream: "s", deps: ["a", "ghost"] }] };
  const L = layoutEpic(bad, () => "not_started");
  assert.equal(L.nodes.length, 2);
  assert.ok(L.edges.every((e) => e.from !== "ghost"));
});
test("node with unknown stream goes to an 'Другое' lane", () => {
  const L = layoutEpic({ streams: [], gates: [], nodes: [{ id: "x", stream: "nope", deps: [] }] }, () => "done");
  assert.equal(L.lanes.at(-1).title, "Другое");
});
```

- [ ] **Step 2: Run** → FAIL (module missing).

- [ ] **Step 3: Implement** `lib/epic-layout.js`

```js
const COL = 150, NW = 128, NH = 44, LANE = 70, LEFT = 110, TOP = 30;

export function layoutEpic(epic, statusOf) {
  const nodes = epic?.nodes ?? [];
  const ids = new Set(nodes.map((n) => n.id));
  const byId = new Map(nodes.map((n) => [n.id, n]));
  // depth = longest known-dep chain; a node on the current DFS path counts 0 (breaks cycles)
  const depth = new Map(), onPath = new Set();
  const depthOf = (id) => {
    if (depth.has(id)) return depth.get(id);
    if (onPath.has(id)) return 0;
    onPath.add(id);
    const deps = (byId.get(id).deps ?? []).filter((d) => ids.has(d));
    const d = deps.length ? 1 + Math.max(...deps.map(depthOf)) : 0;
    onPath.delete(id);
    depth.set(id, d);
    return d;
  };
  const streams = [...(epic?.streams ?? [])].sort((a, b) => a.order - b.order);
  const known = new Set(streams.map((s) => s.id));
  if (nodes.some((n) => !known.has(n.stream))) streams.push({ id: "__other", title: "Другое" });
  const laneOf = (n) => (known.has(n.stream) ? n.stream : "__other");
  const lanes = streams.map((s, i) => ({ id: s.id, title: s.title, y: TOP + i * LANE, h: LANE }));
  const laneY = new Map(lanes.map((l) => [l.id, l.y]));
  // nodes sharing a lane and a column stack inside the lane
  const slot = new Map();
  const placed = nodes.map((n) => {
    const col = depthOf(n.id), lane = laneOf(n), key = `${lane}:${col}`;
    const k = slot.get(key) ?? 0; slot.set(key, k + 1);
    return { ...n, x: LEFT + col * COL, y: laneY.get(lane) + 13 + k * (NH + 6), w: NW, h: NH, status: statusOf(n) };
  });
  const at = new Map(placed.map((n) => [n.id, n]));
  const edges = [];
  for (const n of placed) for (const d of n.deps ?? []) {
    const a = at.get(d); if (!a || depth.get(d) >= depth.get(n.id)) continue; // unknown or back edge
    const x1 = a.x + NW, y1 = a.y + NH / 2, x2 = n.x - 2, y2 = n.y + NH / 2, mx = x1 + 10;
    edges.push({ from: d, to: n.id, critical: !!(a.critical && n.critical),
      d: `M${x1} ${y1}H${mx}V${y2}H${x2}` });
  }
  const maxCol = Math.max(0, ...placed.map((n) => depth.get(n.id)));
  const width = LEFT + (maxCol + 1) * COL + 40;
  const gates = (epic?.gates ?? []).map((g) => ({ ...g, x: width - 20 }));
  return { width: width + 20, height: TOP + lanes.length * LANE + 10, lanes, nodes: placed, edges, gates };
}
```

- [ ] **Step 4: Run** → PASS (4 tests).

- [ ] **Step 5: Commit** `git add -A && git commit -qm "Lay out an epic's network diagram"`

---

### Task 4: Reconcile scan (pure)

**Files:**
- Create: `~/.claude/fleet/lib/scan.js`, `~/.claude/fleet/test/scan.test.mjs`

**Interfaces:**
- Consumes (one object):
  - `now: number` (ms)
  - `projectRoot: string`
  - `registry: [{pid, sessionId, name, nameSource, status, waitingFor, statusUpdatedAt, cwd, procStart, alive}]`
  - `titles: {[sessionId]: string}`
  - `prs: [{number, title, url, baseRefName, headRefName, reviewDecision, state, reviews?, reviewRequests?}]`
  - `worktrees: string[]`
  - `docs: {sessions: {[id]: body}, asks: {[id]: body}, resources: {[id]: body}}`
- Produces: `scan(input) → {sessions: {[sessionId]: observed}, work: {[id]: body}, resources: {[id]: {orphaned: boolean}}, notify: [{session, ask}], meta: {last_loop_at, ok, note}}`. Flags exactly as in the spec: `ghost, name_collision, stale, busy_silent, hung, never_checked_in, worktree_missing`.

- [ ] **Step 1: Write the failing test** `test/scan.test.mjs`

```js
import { test } from "node:test";
import assert from "node:assert/strict";
import { scan } from "../lib/scan.js";

const ROOT = "/r/solana-playground";
const NOW = Date.parse("2026-10-05T12:00:00+05:00");
const min = (m) => NOW - m * 60_000;
const reg = (o) => ({ cwd: ROOT, alive: true, status: "idle", nameSource: "derived", statusUpdatedAt: min(1), procStart: "Mon Oct  5 09:00:00 2026", waitingFor: null, ...o });
const base = (o = {}) => ({ now: NOW, projectRoot: ROOT, registry: [], titles: {}, prs: [], worktrees: [], docs: { sessions: {}, asks: {}, resources: {} }, ...o });

test("dead pids and other projects are ignored", () => {
  const out = scan(base({ registry: [reg({ pid: 1, sessionId: "a", name: "x", alive: false }), reg({ pid: 2, sessionId: "b", name: "y", cwd: "/other" })] }));
  assert.deepEqual(Object.keys(out.sessions), []);
});
test("worktree cwd inside the project counts", () => {
  const out = scan(base({ registry: [reg({ pid: 3, sessionId: "c", name: "z", cwd: ROOT + "/.claude/worktrees/hoo-1715" })] }));
  assert.ok(out.sessions.c);
});
test("ghost: one sessionId, two live pids; older procStart listed first", () => {
  const out = scan(base({ registry: [
    reg({ pid: 27432, sessionId: "g", name: "sp-46", procStart: "Wed Sep 23 10:00:00 2026" }),
    reg({ pid: 13313, sessionId: "g", name: "sp-26", procStart: "Tue Sep 22 12:46:45 2026" }),
  ] }));
  assert.ok(out.sessions.g.flags.includes("ghost"));
  assert.equal(out.sessions.g.pids[0].pid, 13313);
  assert.equal(out.sessions.g.registry_name, "sp-46", "the newest pid's name is the live address");
});
test("name collision across sessionIds", () => {
  const out = scan(base({ registry: [reg({ pid: 1, sessionId: "a", name: "sp-46" }), reg({ pid: 2, sessionId: "b", name: "sp-46" })] }));
  assert.ok(out.sessions.a.flags.includes("name_collision"));
  assert.ok(out.sessions.b.flags.includes("name_collision"));
});
test("stale, busy_silent, hung, never_checked_in", () => {
  const out = scan(base({
    registry: [
      reg({ pid: 1, sessionId: "s", name: "s" }),
      reg({ pid: 2, sessionId: "b", name: "b", status: "busy" }),
      reg({ pid: 3, sessionId: "h", name: "h", status: "waiting", waitingFor: "dialog open", statusUpdatedAt: min(150) }),
      reg({ pid: 4, sessionId: "n", name: "n" }),
      reg({ pid: 5, sessionId: "f", name: "f" }),
    ],
    docs: { asks: {}, resources: {}, sessions: {
      s: { reported: { at: new Date(min(61)).toISOString() } },
      b: { reported: { at: new Date(min(181)).toISOString() } },
      h: { reported: { at: new Date(min(5)).toISOString() } },
      f: { reported: { at: new Date(min(5)).toISOString() } },
    } },
  }));
  assert.ok(out.sessions.s.flags.includes("stale"));
  assert.ok(out.sessions.b.flags.includes("busy_silent"));
  assert.ok(out.sessions.h.flags.includes("hung"));
  assert.ok(out.sessions.n.flags.includes("never_checked_in"));
  assert.deepEqual(out.sessions.f.flags, []);
});
test("worktree_missing", () => {
  const out = scan(base({ registry: [reg({ pid: 1, sessionId: "w", name: "w" })], worktrees: [ROOT],
    docs: { asks: {}, resources: {}, sessions: { w: { reported: { at: new Date(min(1)).toISOString(), worktree: ROOT + "/.claude/worktrees/gone" } } } } }));
  assert.ok(out.sessions.w.flags.includes("worktree_missing"));
});
test("title: custom over ai, carried from titles map", () => {
  const out = scan(base({ registry: [reg({ pid: 1, sessionId: "t", name: "t" })], titles: { t: "Fleet dashboard" } }));
  assert.equal(out.sessions.t.title, "Fleet dashboard");
});
test("work: stacked_on from base == another PR's head; pr_state copied to the session", () => {
  const out = scan(base({
    registry: [reg({ pid: 1, sessionId: "v", name: "v" })],
    docs: { asks: {}, resources: {}, sessions: { v: { reported: { at: new Date(min(1)).toISOString(), pr: 46 } } } },
    prs: [
      { number: 45, title: "React 19", url: "u45", baseRefName: "master-2.0", headRefName: "hoo-1850", reviewDecision: "REVIEW_REQUIRED", state: "OPEN" },
      { number: 46, title: "vitest", url: "u46", baseRefName: "hoo-1850", headRefName: "hoo-1715", reviewDecision: "", state: "OPEN" },
    ],
  }));
  assert.equal(out.work["pr-46"].stacked_on, 45);
  assert.equal(out.work["pr-45"].stacked_on, null);
  assert.equal(out.sessions.v.pr_state, "OPEN");
});
test("orphaned resource and answered-ask notifications", () => {
  const out = scan(base({
    registry: [reg({ pid: 1, sessionId: "alive", name: "a" })],
    docs: { sessions: {},
      resources: { "playwright-profile": { holder: "dead-one" }, port: { holder: "alive" }, free: { holder: null } },
      asks: { q1: { session: "alive", answer: { value: ":root" } }, q2: { session: "alive", answer: { value: "x" }, notified_at: "t" }, q3: { session: "alive", answer: { value: "y" }, closed_at: "t" } } },
  }));
  assert.equal(out.resources["playwright-profile"].orphaned, true);
  assert.equal(out.resources.port.orphaned, false);
  assert.equal(out.resources.free.orphaned, false);
  assert.deepEqual(out.notify, [{ session: "alive", ask: "q1" }]);
});
```

- [ ] **Step 2: Run** → FAIL (module missing).

- [ ] **Step 3: Implement** `lib/scan.js`

```js
const MIN = 60_000;
const inside = (cwd, root) => cwd === root || cwd?.startsWith(root + "/");
const t = (v) => (v == null ? null : typeof v === "number" ? v : Date.parse(v));

export function scan({ now, projectRoot, registry, titles, prs, worktrees, docs }) {
  const live = registry.filter((r) => r.alive && inside(r.cwd, projectRoot));
  const bySession = new Map();
  for (const r of live) (bySession.get(r.sessionId) ?? bySession.set(r.sessionId, []).get(r.sessionId)).push(r);
  const nameCount = new Map();
  for (const [, rs] of bySession) for (const n of new Set(rs.map((r) => r.name))) nameCount.set(n, (nameCount.get(n) ?? 0) + 1);
  const prByNumber = new Map(prs.map((p) => [p.number, p]));
  const wt = new Set(worktrees);
  const sessions = {};
  for (const [id, rs] of bySession) {
    rs.sort((a, b) => t(a.procStart) - t(b.procStart));
    const newest = rs.at(-1), reported = docs.sessions[id]?.reported ?? null;
    const flags = [];
    if (rs.length > 1) flags.push("ghost");
    if (nameCount.get(newest.name) > 1) flags.push("name_collision");
    const since = reported?.at ? now - t(reported.at) : Infinity;
    if (!reported) flags.push("never_checked_in");
    else if (newest.status === "idle" && since > 60 * MIN) flags.push("stale");
    else if (newest.status === "busy" && since > 180 * MIN) flags.push("busy_silent");
    if (newest.status === "waiting" && /dialog/.test(newest.waitingFor ?? "") && now - t(newest.statusUpdatedAt) > 120 * MIN) flags.push("hung");
    if (reported?.worktree && !wt.has(reported.worktree)) flags.push("worktree_missing");
    sessions[id] = {
      registry_name: newest.name, name_source: newest.nameSource, title: titles[id] ?? null,
      pids: rs.map((r) => ({ pid: r.pid, alive: true, status: r.status, waiting_for: r.waitingFor ?? null,
        since: new Date(t(r.statusUpdatedAt)).toISOString() })),
      flags, pr_state: reported?.pr ? prByNumber.get(reported.pr)?.state ?? null : null,
      at: new Date(now).toISOString(),
    };
  }
  const headToPr = new Map(prs.map((p) => [p.headRefName, p.number]));
  const work = {};
  for (const p of prs) work[`pr-${p.number}`] = {
    kind: "pr", number: p.number, title: p.title, url: p.url, base: p.baseRefName, head: p.headRefName,
    stacked_on: headToPr.get(p.baseRefName) ?? null, state: p.state,
    review: { decision: p.reviewDecision || null,
      approved_by: (p.reviews ?? []).filter((r) => r.state === "APPROVED").map((r) => r.author?.login),
      requested: (p.reviewRequests ?? []).map((r) => r.login ?? r.name) },
  };
  const resources = {};
  for (const [id, r] of Object.entries(docs.resources)) resources[id] = { orphaned: !!r.holder && !bySession.has(r.holder) };
  const notify = Object.entries(docs.asks)
    .filter(([, a]) => a.answer && !a.notified_at && !a.closed_at)
    .map(([ask, a]) => ({ session: a.session, ask }));
  return { sessions, work, resources, notify, meta: { last_loop_at: new Date(now).toISOString(), ok: true, note: null } };
}
```

- [ ] **Step 4: Run** `node --test test/scan.test.mjs` → PASS (9 tests).

- [ ] **Step 5: Commit** `git add -A && git commit -qm "Reconcile sessions against the registry and gh"`

---

### Task 5: Page blocks (pure renderers) and "Now"

**Files:**
- Create: `~/.claude/fleet/lib/now.js`, `~/.claude/fleet/lib/render.js`, `~/.claude/fleet/test/now.test.mjs`, `~/.claude/fleet/test/render.test.mjs`

**Interfaces:**
- Consumes: `expectedName`, `nameMismatch`, `renameLine` (Task 2); `layoutEpic` (Task 3); `statusLabel`, `prUrl`, `ticketUrl`, `specUrl`, `esc` (Task 1).
- Produces:
  - `buildNow(state, now) → {counts: {in_progress, in_review, blocked, stale, ghost, unnamed}, items: [{kind: "permission"|"decision"|"ghost"|"name", id, session, text, since, copy?, options?}]}`, items oldest first. `state = {sessions: {[id]: doc}, asks: {[id]: doc}, work, epics, resources, links, meta}`.
  - `render.js`: `header(state, now)`, `nowBlock(nowModel)`, `streams(state)`, `epicBlock(epic, state)`, `queue(state)`, `sessionsList(state, now)`, `resourcesList(state)`, `linksList(state)`, `emptyState(kind: "empty"|"signed_out")` — each returns an HTML string. Copy buttons are `<button class="copy" data-copy="...">`; decision options are `<button class="opt" data-ask="<id>" data-value="...">`.

- [ ] **Step 1: Write the failing test** `test/now.test.mjs`

```js
import { test } from "node:test";
import assert from "node:assert/strict";
import { buildNow } from "../lib/now.js";

const NOW = Date.parse("2026-10-05T12:00:00Z");
const state = {
  sessions: {
    a: { reported: { status: "in_review", pr: 46, ticket: "HOO-1715", label: "Vitest", at: "2026-10-05T11:50:00Z" },
         observed: { registry_name: "solana-playground-6d", flags: [], pids: [{ pid: 40492 }] } },
    g: { reported: { status: "in_progress", ticket: null, label: "X", at: "2026-10-05T11:00:00Z" },
         observed: { registry_name: "X", flags: ["ghost", "stale"], pids: [{ pid: 13313, since: "2026-09-22T07:46:45Z" }, { pid: 27432 }] } },
  },
  asks: {
    q1: { kind: "decision", session: "a", question: ":root или @theme?", options: [":root", "@theme"], created_at: "2026-10-05T11:30:00Z" },
    q2: { kind: "permission", session: "a", question: "Мержить #45?", reply: "да, мержи #45", created_at: "2026-10-05T10:00:00Z" },
    q3: { kind: "decision", session: "a", question: "old", options: ["x"], created_at: "2026-10-04T10:00:00Z", answer: { value: "x" } },
    q4: { kind: "decision", session: "a", question: "closed", options: ["x"], created_at: "2026-10-04T10:00:00Z", closed_at: "t" },
  },
};

test("counts", () => {
  const m = buildNow(state, NOW);
  assert.deepEqual(m.counts, { in_progress: 1, in_review: 1, blocked: 0, stale: 1, ghost: 1, unnamed: 1 });
});
test("items: open, unanswered asks plus derived ghost and name prompts, oldest first", () => {
  const m = buildNow(state, NOW);
  assert.deepEqual(m.items.map((i) => i.kind), ["ghost", "permission", "decision", "name"]);
  assert.equal(m.items.find((i) => i.kind === "ghost").copy, "kill 13313");
  assert.equal(m.items.find((i) => i.kind === "name").copy, "/rename #46 - HOO-1715 - Vitest");
  assert.equal(m.items.find((i) => i.kind === "permission").copy, "да, мержи #45");
});
test("empty state model", () => {
  assert.deepEqual(buildNow({ sessions: {}, asks: {} }, NOW).items, []);
});
```

- [ ] **Step 2: Write the failing test** `test/render.test.mjs`

```js
import { test } from "node:test";
import assert from "node:assert/strict";
import * as R from "../lib/render.js";
import { buildNow } from "../lib/now.js";

test("nowBlock renders copy buttons and option buttons, escaped", () => {
  const html = R.nowBlock({ counts: { in_progress: 0, in_review: 0, blocked: 0, stale: 0, ghost: 0, unnamed: 0 },
    items: [{ kind: "decision", id: "q1", session: "s", text: "<b>?", since: "2026-10-05T11:00:00Z", options: [":root"] },
            { kind: "name", id: "n:s", session: "s", text: "t", since: null, copy: "/rename A - B" }] });
  assert.match(html, /data-ask="q1" data-value=":root"/);
  assert.match(html, /data-copy="\/rename A - B"/);
  assert.match(html, /&lt;b&gt;\?/);
});
test("queue links every PR", () => {
  const html = R.queue({ work: { "pr-45": { kind: "pr", number: 45, title: "React 19", state: "OPEN", stacked_on: null, review: { decision: "REVIEW_REQUIRED", approved_by: [], requested: [] }, merge_order: 1 } } });
  assert.match(html, /href="https:\/\/github.com\/hoodieshq\/solana-playground\/pull\/45"/);
});
test("links are anchors; specs use the context-archive blob URL", () => {
  const html = R.linksList({ links: { a: { kind: "spec", title: "Spec", url: "docs/x.md" }, b: { kind: "artifact", title: "Roadmap", url: "https://claude.ai/artifact/D98" } } });
  assert.match(html, /href="https:\/\/github.com\/hoodieshq\/solana-playground\/blob\/context-archive\/docs\/x.md"/);
  assert.match(html, /href="https:\/\/claude.ai\/artifact\/D98"/);
});
test("empty and signed-out states", () => {
  assert.match(R.emptyState("empty"), /fleet-checkin/);
  assert.match(R.emptyState("signed_out"), /войди/i);
});
test("every block survives an empty state object", () => {
  const s = { sessions: {}, asks: {}, work: {}, epics: {}, resources: {}, links: {}, meta: null };
  for (const f of [R.header, R.streams, R.queue, R.sessionsList, R.resourcesList, R.linksList]) assert.equal(typeof f(s, Date.now()), "string");
  assert.equal(typeof R.nowBlock(buildNow(s, Date.now())), "string");
});
```

- [ ] **Step 3: Run** `node --test test/now.test.mjs test/render.test.mjs` → FAIL (modules missing).

- [ ] **Step 4: Implement** `lib/now.js`

```js
import { nameMismatch, renameLine } from "./names.js";

export function buildNow(state, now) {
  const sessions = Object.entries(state.sessions ?? {});
  const counts = { in_progress: 0, in_review: 0, blocked: 0, stale: 0, ghost: 0, unnamed: 0 };
  const items = [];
  for (const [id, s] of sessions) {
    const st = s.reported?.status; if (st in counts) counts[st]++;
    const flags = s.observed?.flags ?? [];
    if (flags.includes("stale")) counts.stale++;
    if (flags.includes("ghost")) {
      counts.ghost++;
      const old = s.observed.pids[0];
      items.push({ kind: "ghost", id: `g:${id}`, session: id, since: old.since ?? null, copy: `kill ${old.pid}`,
        text: `${s.observed.registry_name}: одна сессия, ${s.observed.pids.length} pid. Старый ${old.pid} не получает сообщений.` });
    }
    if (s.observed?.name_source === "derived") counts.unnamed++;
    const want = nameMismatch(s);
    if (want) {
      if (s.observed?.name_source !== "derived") counts.unnamed++;
      items.push({ kind: "name", id: `n:${id}`, session: id, since: s.reported?.at ?? null, copy: renameLine(want),
        text: `${s.observed.registry_name} должна называться «${want}»` });
    }
  }
  for (const [id, a] of Object.entries(state.asks ?? {})) {
    if (a.closed_at || a.answer) continue;
    items.push({ kind: a.kind, id, session: a.session, since: a.created_at ?? null, text: a.question,
      ...(a.kind === "permission" ? { copy: a.reply } : { options: a.options ?? [] }) });
  }
  const ts = (i) => (i.since ? Date.parse(i.since) : now);
  items.sort((x, y) => ts(x) - ts(y));
  return { counts, items };
}
```

Note for the implementer: the test fixture's session `a` has `name_source` absent, so `unnamed` counts it through the mismatch branch; `g` has a matching name. Re-run the test after any change to the counting rule.

- [ ] **Step 5: Implement** `lib/render.js`

```js
import { esc, statusLabel, prUrl, ticketUrl, specUrl } from "./status.js";
import { layoutEpic } from "./epic-layout.js";

const ago = (iso, now) => {
  if (!iso) return "";
  const m = Math.max(0, Math.round((now - Date.parse(iso)) / 60000));
  return m < 60 ? `${m} мин` : m < 1440 ? `${Math.round(m / 60)} ч` : `${Math.round(m / 1440)} дн`;
};
const chip = (cls, text) => `<span class="chip ${cls}">${esc(text)}</span>`;
const STATUS_CLS = { not_started: "c-n", in_progress: "c-a", in_review: "c-r", blocked: "c-x", done: "c-d" };
const copyBtn = (text) => `<button class="copy" data-copy="${esc(text)}">${esc(text)} <span aria-hidden="true">⧉</span></button>`;
const prLink = (n) => `<a href="${prUrl(n)}">#${n}</a>`;
const ticketLink = (t) => (t ? `<a href="${ticketUrl(t)}">${esc(t)}</a>` : "");
const nameOf = (state, id) => state.sessions?.[id]?.observed?.registry_name ?? id.slice(0, 8);

export function header(state, now) {
  const last = state.meta?.last_loop_at, late = !last || now - Date.parse(last) > 45 * 60000;
  const when = new Date(now).toLocaleString("ru-RU", { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Asia/Yekaterinburg" });
  const beat = last ? `сверка Dispatcher ${ago(last, now)} назад` : "Dispatcher ещё не сверял";
  return `<header class="top"><b>Флот · solana-playground</b><span class="eb">${esc(when)}</span>` +
    `<span class="beat${late ? " bad" : ""}">● ${esc(beat)}${late ? " · метки stale могут врать" : ""}</span></header>`;
}

const KIND = { permission: ["c-w", "допуск"], decision: ["c-a", "решение"], ghost: ["c-x", "призрак"], name: ["c-n", "имя"] };
export function nowBlock(m, state = {}, now = Date.now()) {
  const c = m.counts;
  const counts = [["c-a", `идёт ${c.in_progress}`], ["c-r", `ждёт ревью ${c.in_review}`], ["c-x", `заблокировано ${c.blocked}`],
    ["c-x", `stale ${c.stale}`], ["c-x", `призрак ${c.ghost}`], ["c-n", `без имени ${c.unnamed}`]].map(([k, t]) => chip(k, t)).join("");
  const items = m.items.map((i) => {
    const [cls, label] = KIND[i.kind] ?? ["c-n", i.kind];
    const act = i.copy ? copyBtn(i.copy)
      : `<span class="btns">${(i.options ?? []).map((o) => `<button class="opt" data-ask="${esc(i.id)}" data-value="${esc(o)}">${esc(o)}</button>`).join("")}</span>`;
    return `<li>${chip(cls, label)}<span><span class="q">${esc(i.text)}</span>` +
      `<span class="who">${esc(state.sessions ? nameOf(state, i.session) : i.session)}${i.since ? " · " + ago(i.since, now) : ""}</span>${act}</span></li>`;
  }).join("");
  return `<section class="now" id="now"><div class="rule"><span class="eb warn">Сейчас · ждёт тебя · ${m.items.length}</span></div>` +
    `<div class="counts">${counts}</div>${items ? `<ul class="asks">${items}</ul>` : `<p class="calm">Ничего не ждёт тебя.</p>`}</section>`;
}

function card(state, id, s) {
  const r = s.reported ?? {}, cls = (s.observed?.flags ?? []).length ? " bad" : r.waiting_on_slava ? " w" : "";
  return `<span class="card sess${cls}"><b>${esc(nameOf(state, id))}</b><small>${esc(statusLabel(r.status))}${r.phase ? " · " + esc(r.phase) : ""}</small></span>`;
}
export function streams(state) {
  const sessions = Object.entries(state.sessions ?? {});
  const lanes = [];
  for (const [eid, e] of Object.entries(state.epics ?? {})) {
    lanes.push(`<div class="rule"><span class="eb">Потоки · ${esc(e.title)}</span><span class="h">сессия → PR → дальше</span></div>`);
    for (const st of [...(e.streams ?? [])].sort((a, b) => a.order - b.order)) {
      const mine = sessions.filter(([, s]) => s.reported?.epic === eid && s.reported?.stream === st.id);
      lanes.push(lane(state, st.title, mine, true));
    }
  }
  const outside = sessions.filter(([, s]) => !s.reported?.epic && s.reported);
  if (outside.length) lanes.push(`<div class="rule"><span class="eb">Вне эпика</span></div>`, lane(state, "—", outside, false));
  return `<section class="lanes">${lanes.join("") || `<p class="calm">Эпиков пока нет.</p>`}</section>`;
}
function lane(state, title, mine, needsSession) {
  const chains = mine.map(([id, s]) => {
    const r = s.reported;
    return [card(state, id, s), r.pr ? `<span class="arr">→</span><span class="card"><b>${prLink(r.pr)}</b><small>${esc(state.work?.["pr-" + r.pr]?.review?.decision ?? s.observed?.pr_state ?? "")}</small></span>` : "",
      r.next ? `<span class="arr">→</span><span class="card nxt"><b>дальше</b><small>${esc(r.next)}</small></span>` : ""].join("");
  }).join("");
  const empty = needsSession && !mine.length ? `<span class="card bad"><b>сессии нет</b><small>поток без живой сессии</small></span>` : "";
  return `<div class="lane"><span class="ln">${esc(title)}</span><div class="chain">${chains}${empty}</div></div>`;
}

const STROKE = { done: "var(--done)", in_review: "var(--review)", in_progress: "var(--active)", blocked: "var(--alarm)", not_started: "var(--line-2)" };
export function epicBlock(epic, state) {
  const statusOf = (n) => {
    if (!n.ref) return n.status ?? "not_started";
    const w = state.work?.[n.ref];
    if (!w) return n.status ?? "not_started";
    return w.state === "MERGED" ? "done" : w.state === "OPEN" ? "in_review" : n.status ?? "not_started";
  };
  const L = layoutEpic(epic, statusOf);
  const lanes = L.lanes.map((l, i) => `<rect x="0" y="${l.y}" width="${L.width}" height="${l.h}" class="${i % 2 ? "band-alt" : "band"}"/><text class="lane-label" x="8" y="${l.y + 38}">${esc(l.title.toUpperCase())}</text>`).join("");
  const edges = L.edges.map((e) => `<path class="edge${e.critical ? " crit" : ""}" d="${e.d}" marker-end="url(#${e.critical ? "mc" : "m"})"/>`).join("");
  const nodes = L.nodes.map((n) => {
    const href = n.ref?.startsWith("pr-") ? prUrl(n.ref.slice(3)) : /^HOO-\d+$/.test(n.ref ?? "") ? ticketUrl(n.ref) : null;
    const box = `<g class="node${n.critical ? " crit" : ""}${n.status === "not_started" ? " after" : ""}"><rect x="${n.x}" y="${n.y}" width="${n.w}" height="${n.h}" rx="8" style="stroke:${STROKE[n.status] ?? STROKE.not_started}"/>` +
      `<text x="${n.x + 9}" y="${n.y + 18}">${esc(n.label)}</text><text class="sub" x="${n.x + 9}" y="${n.y + 33}">${esc(statusLabel(n.status))}${n.sub ? " · " + esc(n.sub) : ""}</text></g>`;
    return href ? `<a href="${href}">${box}</a>` : box;
  }).join("");
  const gates = L.gates.map((g) => `<line class="gate" x1="${g.x}" y1="10" x2="${g.x}" y2="${L.height}"/><text class="gate-label" x="${g.x - 6}" y="20" text-anchor="end">${esc(g.label)}</text>`).join("");
  return `<section class="epic"><div class="rule"><span class="eb">Сетевая диаграмма · ${esc(epic.title)}</span><span class="h">критическая цепь выделена</span></div>` +
    `<div class="frame"><svg viewBox="0 0 ${L.width} ${L.height}" style="min-width:${L.width}px" role="img" aria-label="${esc(epic.title)}">` +
    `<defs><marker id="m" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path class="ah" d="M0,0L10,5L0,10z"/></marker>` +
    `<marker id="mc" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path class="ah-crit" d="M0,0L10,5L0,10z"/></marker></defs>` +
    `${lanes}${gates}${edges}${nodes}</svg></div>` +
    `<div class="legend"><span class="crit">━ критическая цепь</span><span>━ зависит от</span><span>┅ не начато</span><span class="gate-l">┊ фиксированная дата</span></div></section>`;
}

export function queue(state) {
  const prs = Object.values(state.work ?? {}).filter((w) => w.kind === "pr" && w.state === "OPEN")
    .sort((a, b) => (a.merge_order ?? 99) - (b.merge_order ?? 99) || a.number - b.number);
  const rows = prs.map((p) => `<div class="r"><span><span class="ord">${p.merge_order ?? "·"}</span><b>${prLink(p.number)}</b> ${esc(p.title)}` +
    `<small>${p.stacked_on ? `стек на #${p.stacked_on} · ` : ""}${esc(p.review?.decision ?? "")}${p.review?.approved_by?.length ? " · ✓ " + esc(p.review.approved_by.join(", ")) : ""}${p.review?.requested?.length ? " · ждёт " + esc(p.review.requested.join(", ")) : ""}</small></span>` +
    `${chip(p.stacked_on ? "c-n" : "c-r", p.stacked_on ? "ждёт базу" : "ревью")}</div>`).join("");
  return `<div class="box"><div class="eb">Очередь ревью и мерджа</div>${rows || `<p class="calm">Открытых PR нет.</p>`}</div>`;
}

const FLAG = { ghost: "призрак", name_collision: "имя занято", stale: "stale", busy_silent: "молчит, но занята", hung: "висит", never_checked_in: "не отмечалась", worktree_missing: "нет worktree" };
export function sessionsList(state, now) {
  const rows = Object.entries(state.sessions ?? {}).map(([id, s]) => {
    const o = s.observed ?? {}, r = s.reported ?? {};
    const pids = (o.pids ?? []).map((p) => `${p.pid} ${p.status}${p.waiting_for ? ": " + p.waiting_for + " " + ago(p.since, now) : ""}`).join(" + ");
    const flags = (o.flags ?? []).map((f) => chip("c-x", FLAG[f] ?? f)).join("");
    return `<div class="r"><span><b>${esc(o.registry_name ?? id)}</b>${o.title && o.title !== o.registry_name ? `<small>${esc(o.title)}</small>` : ""}` +
      `<small>${esc(pids)}${r.worktree ? " · " + esc(r.worktree.split("/").pop()) : ""} ${ticketLink(r.ticket)} ${r.at ? "· отметка " + ago(r.at, now) : ""}</small></span>` +
      `<span>${flags || chip(STATUS_CLS[r.status] ?? "c-n", statusLabel(r.status ?? "—"))}</span></div>`;
  }).join("");
  return `<div class="box"><div class="eb">Сессии · ${Object.keys(state.sessions ?? {}).length}</div>${rows || `<p class="calm">Сессий нет.</p>`}</div>`;
}

export function resourcesList(state) {
  const rows = Object.entries(state.resources ?? {}).map(([id, r]) => `<div class="r"><span><b>${esc(id)}</b><small>${esc(r.note ?? "")}</small></span>` +
    `${r.orphaned ? chip("c-x", "держатель мёртв") : r.holder ? chip("c-a", nameOf(state, r.holder)) : chip("c-d", "свободен")}</div>`).join("");
  return `<div class="box"><div class="eb">Ресурсы с одним владельцем</div>${rows || `<p class="calm">Ресурсов нет.</p>`}</div>`;
}

export function linksList(state) {
  const rows = Object.values(state.links ?? {}).map((l) => {
    const href = /^https?:/.test(l.url) ? l.url : specUrl(l.url);
    return `<div class="r"><span><a href="${esc(href)}"><b>${esc(l.title)}</b></a><small>${esc(l.kind)}</small></span><span></span></div>`;
  }).join("");
  return `<div class="box"><div class="eb">Ссылки</div>${rows || `<p class="calm">Ссылок нет.</p>`}</div>`;
}

export function emptyState(kind) {
  return kind === "signed_out"
    ? `<p class="calm">Данные флота видны только после входа: войди в claude.ai и открой страницу снова.</p>`
    : `<p class="calm">Сессии ещё не отметились. Запусти fleet-checkin в рабочей сессии или /loop /fleet-reconcile в Dispatcher.</p>`;
}
```

- [ ] **Step 6: Run** `node --test test/` → PASS (all files).

- [ ] **Step 7: Commit** `git add -A && git commit -qm "Render the page blocks and the Now model"`

---

### Task 6: Page shell and build

**Files:**
- Create: `~/.claude/fleet/page/index.html`, `~/.claude/fleet/bin/build-page.mjs`, `~/.claude/fleet/test/build.test.mjs`

**Interfaces:**
- Consumes: every `lib/*.js` export.
- Produces: `dist/fleet.html`, one self-contained page (no `<script src>` of our own) with `<title>Флот</title>`.

- [ ] **Step 1: Write the failing test** `test/build.test.mjs`

```js
import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";

test("build inlines every module and leaves no import/export", () => {
  execFileSync("node", ["bin/build-page.mjs"], { cwd: new URL("..", import.meta.url) });
  const html = readFileSync(new URL("../dist/fleet.html", import.meta.url), "utf8");
  assert.match(html, /<title>Флот<\/title>/);
  for (const fn of ["layoutEpic", "buildNow", "expectedName", "nowBlock"]) assert.match(html, new RegExp(`function ${fn}\\b`));
  const script = html.split("<script>")[1];
  assert.doesNotMatch(script, /^\s*(import|export)\s/m);
  new Function(script.split("</script>")[0]); // parses
});
```

- [ ] **Step 2: Run** → FAIL (`bin/build-page.mjs` missing).

- [ ] **Step 3: Implement** `bin/build-page.mjs`

```js
import { readFileSync, writeFileSync } from "node:fs";
const root = new URL("..", import.meta.url);
const ORDER = ["status", "names", "epic-layout", "now", "render"];
const lib = ORDER.map((m) => readFileSync(new URL(`lib/${m}.js`, root), "utf8")
  .replace(/^import .*$/gm, "")
  .replace(/^export (const|function|let) /gm, "$1 ")).join("\n");
const shell = readFileSync(new URL("page/index.html", root), "utf8");
writeFileSync(new URL("dist/fleet.html", root), shell.replace("/*__LIB__*/", () => lib));
console.log("dist/fleet.html");
```

`render.js` uses `import * as R` nowhere; the shell calls the functions by name, so the flat inline is enough.

- [ ] **Step 4: Write** `page/index.html` (content only; the publish skeleton adds doctype/head/body)

```html
<title>Флот</title>
<style>
/* One reading column; diagrams scroll in their own frame. Solana-dark house look, single theme by choice. */
:root{--ground:#09080c;--surface:#121017;--raised:#1a1721;--line:rgba(236,228,253,.10);--line-2:rgba(236,228,253,.22);
--ink:#ecebf1;--ink-2:#a09cae;--ink-3:#78728a;--done:#14f195;--review:#80ecff;--active:#b57bff;--next:#8a84a0;--waiting:#ffd666;--alarm:#ff4d6a;
--chrome:-apple-system,BlinkMacSystemFont,"Segoe UI",Helvetica,Arial,sans-serif;--mono:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;color-scheme:dark}
*{box-sizing:border-box}
body{background:var(--ground);color:var(--ink-2);font:14px/1.45 var(--chrome);padding-inline:16px;padding-block:20px 48px}
main{max-width:1080px;margin:0 auto;display:grid;gap:22px}
a{color:var(--review);text-decoration:none}a:hover{text-decoration:underline}
button{font:inherit;cursor:pointer}button:focus-visible,a:focus-visible{outline:2px solid var(--active);outline-offset:2px}
.eb{font:500 10.5px var(--mono);letter-spacing:.14em;text-transform:uppercase;color:var(--ink-3)}.eb.warn{color:var(--waiting)}
.rule{display:flex;gap:10px;align-items:baseline}.rule::after{content:"";flex:1;height:1px;background:var(--line)}.rule .h{color:var(--ink-3);font-size:12px}
.top{display:flex;flex-wrap:wrap;gap:6px 16px;align-items:baseline}.top b{color:var(--ink);font-size:18px}
.beat{font:11.5px var(--mono);color:var(--done)}.beat.bad{color:var(--alarm)}
.now{border:1px solid rgba(181,123,255,.55);border-radius:14px;padding:14px 16px;background:linear-gradient(180deg,rgba(153,69,255,.10),rgba(153,69,255,.02) 60%),var(--surface);display:grid;gap:10px}
.counts{display:flex;flex-wrap:wrap;gap:6px}
.chip{display:inline-flex;align-items:center;font:500 10px/1.7 var(--mono);letter-spacing:.06em;text-transform:uppercase;border:1px solid var(--line-2);border-radius:99px;padding:0 8px;white-space:nowrap;color:var(--ink-2)}
.c-w{color:var(--waiting);border-color:rgba(255,214,102,.4)}.c-r{color:var(--review);border-color:rgba(128,236,255,.4)}.c-a{color:var(--active);border-color:rgba(181,123,255,.45)}
.c-d{color:var(--done);border-color:rgba(20,241,149,.4)}.c-x{color:var(--alarm);border-color:rgba(255,77,106,.45)}.c-n{color:var(--next)}
.asks{display:grid;gap:8px;margin:0;padding:0;list-style:none}
.asks li{display:grid;grid-template-columns:92px minmax(0,1fr);gap:10px;align-items:start;border-top:1px solid var(--line);padding-top:8px}
.asks li>span:last-child{min-width:0}.q{color:var(--ink)}.who{display:block;font:11px var(--mono);color:var(--ink-3)}
.btns{display:flex;flex-wrap:wrap;gap:6px;margin-top:6px}
.opt{border:1px solid var(--line-2);border-radius:8px;padding:3px 12px;color:var(--ink);background:var(--raised)}.opt:hover{border-color:var(--active)}
.copy{display:inline-block;max-width:100%;overflow-wrap:anywhere;text-align:left;margin-top:6px;font:11.5px var(--mono);color:var(--review);background:transparent;border:1px dashed rgba(128,236,255,.45);border-radius:8px;padding:3px 9px}
.calm{margin:0;color:var(--ink-3)}
.lanes{display:grid;gap:8px}.lane{display:grid;grid-template-columns:130px minmax(0,1fr);gap:12px;border:1px solid var(--line);border-radius:12px;background:var(--surface);padding:10px 12px}
.ln{font:500 10.5px var(--mono);letter-spacing:.1em;text-transform:uppercase;color:var(--ink-3)}
.chain{display:flex;flex-wrap:wrap;gap:6px;align-items:stretch;min-width:0}
.card{border:1px solid var(--line-2);border-radius:9px;background:var(--raised);padding:5px 9px;min-width:0;max-width:240px}
.card b{display:block;color:var(--ink);font-weight:500;font-size:12.5px;overflow-wrap:anywhere}.card small{display:block;font:10.5px var(--mono);color:var(--ink-3)}
.card.sess{border-color:var(--active)}.card.sess.w{border-color:var(--waiting)}.card.nxt{border-style:dashed;background:transparent}.card.bad{border-color:var(--alarm);border-style:dashed}
.arr{color:var(--ink-3);font:11px var(--mono);align-self:center}
.epic{display:grid;gap:10px;min-width:0}.frame{overflow-x:auto;border:1px solid var(--line);border-radius:14px;background:var(--surface);padding:12px}
.frame svg{display:block;height:auto}
svg .band{fill:rgba(236,228,253,.025)}svg .band-alt{fill:transparent}
.lane-label{font:500 9.5px var(--mono);letter-spacing:.12em;fill:var(--ink-3)}
.node rect{fill:var(--raised);stroke-width:1.2}.node.crit rect{stroke-width:2;fill:rgba(153,69,255,.10)}.node.after rect{stroke-dasharray:4 3;fill:transparent}
.node text{font:500 11.5px var(--chrome);fill:var(--ink)}.node text.sub{font:400 9.5px var(--mono);fill:var(--ink-3)}
.edge{fill:none;stroke:var(--ink-3);stroke-width:1.3}.edge.crit{stroke:var(--active);stroke-width:2}.ah{fill:var(--ink-3)}.ah-crit{fill:var(--active)}
.gate{stroke:var(--alarm);stroke-dasharray:3 4}.gate-label{font:500 9.5px var(--mono);fill:var(--alarm)}
.legend{display:flex;flex-wrap:wrap;gap:6px 16px;font:10.5px var(--mono);color:var(--ink-3)}.legend .crit{color:var(--active)}.legend .gate-l{color:var(--alarm)}
.grid2{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,300px),1fr));gap:12px}
.box{border:1px solid var(--line);border-radius:12px;background:var(--surface);padding:10px 12px;display:grid;gap:4px;min-width:0}
.r{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:8px;border-top:1px solid var(--line);padding:6px 0;align-items:baseline}
.r b{color:var(--ink);font-weight:500}.r small{display:block;color:var(--ink-3);font:10.5px var(--mono);overflow-wrap:anywhere}.ord{font:11px var(--mono);color:var(--ink-3);margin-right:6px}
.bar{position:fixed;top:0;left:0;right:0;padding:calc(env(safe-area-inset-top,0px) + 6px) 16px 6px;background:rgba(9,8,12,.92);border-bottom:1px solid var(--line-2);font:500 11px var(--mono);color:var(--waiting);letter-spacing:.1em;text-transform:uppercase;z-index:5}
.toast{position:fixed;left:50%;bottom:calc(env(safe-area-inset-bottom,0px) + 18px);transform:translateX(-50%);background:var(--raised);border:1px solid var(--line-2);color:var(--ink);padding:6px 14px;border-radius:99px;font-size:12.5px;z-index:6}
@media(max-width:560px){.lane{grid-template-columns:1fr}.asks li{grid-template-columns:1fr;gap:4px}}
</style>
<main id="app"><p class="calm">Загружаю флот…</p></main>
<a class="bar" id="bar" href="#now" hidden></a>
<div class="toast" id="toast" role="status" hidden></div>
<script>
/*__LIB__*/
const COLLECTIONS = ["sessions", "asks", "work", "epics", "resources", "links", "meta"];
const state = Object.fromEntries(COLLECTIONS.map((c) => [c, {}]));
let ready = false, db = null;
const $ = (id) => document.getElementById(id);

function draw() {
  const now = Date.now();
  const s = { ...state, meta: state.meta.dispatcher ?? null };
  if (!ready) return;
  const model = buildNow(s, now);
  const empty = !Object.keys(s.sessions).length && !Object.keys(s.epics).length;
  $("app").innerHTML = header(s, now) + nowBlock(model, s, now) +
    (empty ? emptyState("empty") : streams(s) + Object.values(s.epics).map((e) => epicBlock(e, s)).join("")) +
    `<section class="grid2">${queue(s)}${sessionsList(s, now)}${resourcesList(s)}${linksList(s)}</section>`;
  $("bar").textContent = `ждёт тебя · ${model.items.length}`;
  watchNow();
}

let io = null;
function watchNow() {
  io?.disconnect();
  const el = $("now"); if (!el || !("IntersectionObserver" in window)) return;
  io = new IntersectionObserver(([e]) => { $("bar").hidden = e.isIntersecting || window.innerWidth > 900; });
  io.observe(el);
}

function toast(text) { const t = $("toast"); t.textContent = text; t.hidden = false; clearTimeout(toast.h); toast.h = setTimeout(() => (t.hidden = true), 1600); }

document.addEventListener("click", async (ev) => {
  const copy = ev.target.closest("[data-copy]");
  if (copy) {
    const text = copy.dataset.copy;
    try { await navigator.clipboard.writeText(text); toast("Скопировано"); }
    catch { const r = document.createRange(); r.selectNodeContents(copy); const sel = getSelection(); sel.removeAllRanges(); sel.addRange(r); toast("Выделено: скопируй вручную"); }
    return;
  }
  const opt = ev.target.closest("[data-ask]");
  if (opt && db) {
    opt.disabled = true;
    try { await db.doc(`asks/${opt.dataset.ask}`).update({ answer: { value: opt.dataset.value, at: new Date().toISOString() } }); toast(`Ответ «${opt.dataset.value}» записан`); }
    catch (e) { opt.disabled = false; toast(e?.code === "invalid_argument" ? "Нет прав на запись" : "Не записалось, попробуй ещё раз"); }
  }
});

(async () => {
  db = await claude.use("db");
  ready = true;
  if (!db) { $("app").innerHTML = header({ meta: null }, Date.now()) + emptyState("signed_out"); return; }
  for (const c of COLLECTIONS) db.collection(c).onSnapshot((snap) => {
    state[c] = Object.fromEntries(snap.docs.map((d) => [d.id, d.data()]));
    draw();
  }, () => { $("app").insertAdjacentHTML("afterbegin", `<p class="calm">Подписка на «${c}» оборвалась. Обнови страницу.</p>`); });
  draw();
  setInterval(draw, 60_000); // keeps "N мин назад" honest; no writes
})();
</script>
```

- [ ] **Step 5: Run** `node --test test/` → PASS (all, including build).

- [ ] **Step 6: Commit** `git add -A && git commit -qm "Build the page from the library modules"`

---

### Task 7: whoami and gather

**Files:**
- Create: `~/.claude/fleet/bin/whoami.sh`, `~/.claude/fleet/bin/gather.mjs`, `~/.claude/fleet/test/whoami.test.mjs`

**Interfaces:**
- Produces:
  - `whoami.sh [start_pid]` → one JSON line `{"pid":N,"sessionId":"…","name":"…"}`, exit 1 with a message on stderr if no ancestor has a registry file. `FLEET_SESSIONS_DIR` overrides `~/.claude/sessions`.
  - `gather.mjs --docs <dir>` → prints the `scan()` output as JSON. `<dir>` holds `sessions/`, `asks/`, `resources/` JSON files as saved by `ArtifactData list … out_dir`. Reads `~/.claude/sessions/*.json`, transcripts under `~/.claude/projects/*solana-playground*/<sessionId>.jsonl`, `gh pr list -R hoodieshq/solana-playground --state open --json number,title,url,baseRefName,headRefName,reviewDecision,state,reviews,reviewRequests`, and `git -C <root> worktree list --porcelain`.

- [ ] **Step 1: Write the failing test** `test/whoami.test.mjs`

```js
import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const bin = new URL("../bin/whoami.sh", import.meta.url).pathname;
test("finds the nearest ancestor with a registry file", () => {
  const dir = mkdtempSync(join(tmpdir(), "fleet-"));
  writeFileSync(join(dir, `${process.pid}.json`), JSON.stringify({ pid: process.pid, sessionId: "abc", name: "Test" }));
  const out = execFileSync("sh", [bin], { env: { ...process.env, FLEET_SESSIONS_DIR: dir } }).toString();
  assert.deepEqual(JSON.parse(out), { pid: process.pid, sessionId: "abc", name: "Test" });
});
test("fails clearly when no ancestor is a session", () => {
  const dir = mkdtempSync(join(tmpdir(), "fleet-"));
  assert.throws(() => execFileSync("sh", [bin], { env: { ...process.env, FLEET_SESSIONS_DIR: dir }, stdio: "pipe" }), /no Claude Code session/);
});
```

- [ ] **Step 2: Run** → FAIL (script missing).

- [ ] **Step 3: Implement** `bin/whoami.sh`

```sh
#!/bin/sh
# Print the registry entry of the Claude Code session this shell runs under.
dir="${FLEET_SESSIONS_DIR:-$HOME/.claude/sessions}"
pid="${1:-$$}"
while [ -n "$pid" ] && [ "$pid" -gt 1 ]; do
  f="$dir/$pid.json"
  if [ -f "$f" ]; then
    node -e 'const r=require(process.argv[1]);console.log(JSON.stringify({pid:r.pid,sessionId:r.sessionId,name:r.name}))' "$f"
    exit 0
  fi
  pid=$(ps -o ppid= -p "$pid" | tr -d ' ')
done
echo "whoami: no Claude Code session among this shell's ancestors" >&2
exit 1
```

`chmod +x bin/whoami.sh`.

- [ ] **Step 4: Run** `node --test test/whoami.test.mjs` → PASS. Then the live check: `~/.claude/fleet/bin/whoami.sh` from this session's Bash tool → prints `sessionId` `57121e2b-…` and name `Fleet dashboard`.

- [ ] **Step 5: Implement** `bin/gather.mjs`

```js
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { homedir } from "node:os";
import { join } from "node:path";
import { scan } from "../lib/scan.js";

const ROOT = join(homedir(), "git/hoodies/solana-playground");
const docsDir = process.argv[process.argv.indexOf("--docs") + 1];
const readDir = (d) => (existsSync(d) ? Object.fromEntries(readdirSync(d).filter((f) => f.endsWith(".json"))
  .map((f) => { const j = JSON.parse(readFileSync(join(d, f), "utf8")); return [f.slice(0, -5), j.data ?? j]; })) : {});
const alive = (pid) => { try { process.kill(pid, 0); return true; } catch (e) { return e.code === "EPERM"; } };

const sdir = join(homedir(), ".claude/sessions");
const registry = readdirSync(sdir).filter((f) => /^\d+\.json$/.test(f)).map((f) => {
  const r = JSON.parse(readFileSync(join(sdir, f), "utf8"));
  return { ...r, procStart: r.procStart, alive: alive(r.pid) };
});

const pdirs = readdirSync(join(homedir(), ".claude/projects")).filter((d) => d.includes("solana-playground"));
const titles = {};
for (const r of registry) for (const d of pdirs) {
  const f = join(homedir(), ".claude/projects", d, `${r.sessionId}.jsonl`);
  if (!existsSync(f)) continue;
  let custom = null, ai = null;
  for (const line of readFileSync(f, "utf8").split("\n")) {
    if (line.includes('"type":"custom-title"')) custom = JSON.parse(line).customTitle;
    else if (line.includes('"type":"ai-title"')) ai = JSON.parse(line).aiTitle;
  }
  titles[r.sessionId] = custom ?? ai;
}

const prs = JSON.parse(execFileSync("gh", ["pr", "list", "-R", "hoodieshq/solana-playground", "--state", "open", "--limit", "100",
  "--json", "number,title,url,baseRefName,headRefName,reviewDecision,state,reviews,reviewRequests"]).toString());
const worktrees = execFileSync("git", ["-C", ROOT, "worktree", "list", "--porcelain"]).toString()
  .split("\n").filter((l) => l.startsWith("worktree ")).map((l) => l.slice(9));

const docs = { sessions: readDir(join(docsDir, "sessions")), asks: readDir(join(docsDir, "asks")), resources: readDir(join(docsDir, "resources")) };
console.log(JSON.stringify(scan({ now: Date.now(), projectRoot: ROOT, registry, titles, prs, worktrees, docs }), null, 2));
```

The `j.data ?? j` line handles both a bare body and an `ArtifactData` export that wraps it; check one real `out_dir` file in Task 9 and drop the branch that does not occur.

- [ ] **Step 6: Live check** `node bin/gather.mjs --docs /nonexistent | head -60` → JSON with `sessions` keyed by live solana-playground sessionIds, `90dde410…` flagged `ghost`, `work.pr-46.stacked_on` = 45, every session `never_checked_in`.

- [ ] **Step 7: Commit** `git add -A && git commit -qm "Find the calling session and gather reconcile inputs"`

---

### Task 8: Publish the page and seed it

**Files:**
- Publish: `~/.claude/fleet/dist/fleet.html` (copy to the scratchpad if the Artifact tool requires a path under the working directory or scratchpad)

**Interfaces:**
- Produces: the artifact URL (`FLEET_URL`), written into `~/.claude/fleet/README` and used by Tasks 9–10.

- [ ] **Step 1: Build** `node bin/build-page.mjs`.
- [ ] **Step 2: One preview** of `dist/fleet.html` (ArtifactCheck or the Artifact preview where offered; else skip). Fix what it shows in one pass.
- [ ] **Step 3: Publish** with `Artifact` publish: `file_path` = the built page, `icon: "radar"`, `capabilities: {db: {}, user: {}}`, `description: "Живой пульт над всеми сессиями Claude Code в solana-playground."`. Record `FLEET_URL` in `~/.claude/fleet/README`.
- [ ] **Step 4: Seed links** with one `ArtifactData batch` (creates, no `if_version`):
  - `links/roadmap` `{kind:"artifact", title:"UI Migration Roadmap", url:"https://claude.ai/artifact/D98grDhwfC5CGgXCBTLCbH"}`
  - `links/ui-migration-spec` `{kind:"spec", title:"UI migration design", url:"docs/superpowers/specs/2026-10-01-ui-migration-design.md"}`
  - `links/fleet-spec` `{kind:"spec", title:"Fleet dashboard design", url:"docs/superpowers/specs/2026-10-05-fleet-dashboard-design.md"}`
  - `links/fleet-plan` `{kind:"plan", title:"Fleet dashboard plan", url:"docs/superpowers/plans/2026-10-05-fleet-dashboard.md"}`
  - `resources/playwright-profile` `{holder:null, since:null, note:"таблица Linear → Sheet", orphaned:false}`
- [ ] **Step 5: Seed the UI migration epic** `epics/ui-migration` from the roadmap artifact's diagram (real nodes, no invented ones): streams `rules`, `ds`, `tools`, `foundation`, `screens`; nodes `decisions` (done), `rules` (ref `pr-43`), `layer-ci`, `ds-package` (ref `pr-44`), `registry`, `spike` (done), `r19` (ref `pr-45`, critical), `vitest` (ref `pr-46`), `ts-pin`, `ds-shared` (critical), `browsers`, `tailwind`, `token-bridge` (ref `HOO-1802`), `shell` (ref `HOO-1793`, critical), `panels` (critical), `bp-screens` (critical); deps as drawn in the roadmap; gate `{date:"2026-11-11", label:"11 НОЯ · ЗАМОРОЗКА"}`. Show Slava the node list in chat before writing; he corrects, then write.
- [ ] **Step 6: Functional pass** `ArtifactData list` on `links`, `resources`, `epics` → the seeded documents come back. Open `FLEET_URL`: empty-state lanes plus the epic diagram render.

---

### Task 9: `fleet-checkin` skill and the first check-in

**Files:**
- Create: `~/.claude/skills/fleet-checkin/SKILL.md`

**Interfaces:**
- Consumes: `FLEET_URL`, `~/.claude/fleet/bin/whoami.sh`.

- [ ] **Step 1: Write** `SKILL.md` (use superpowers:writing-skills for the frontmatter and trigger wording)

```markdown
---
name: fleet-checkin
description: Report this session's state to the fleet dashboard. Use at every shift in a solana-playground work session — taking a task, a status or phase change, a PR opened, a blocker appearing or clearing, needing Slava, done — and when Dispatcher asks for a check-in.
---

# Fleet check-in

Dashboard: <FLEET_URL>. Write with `ArtifactData`, `url` = that link.

## Who am I
Run `~/.claude/fleet/bin/whoami.sh`. It prints `{"pid","sessionId","name"}`. The document is `sessions/<sessionId>`.

## Check in (one call per shift)
1. `ArtifactData get` `sessions/<sessionId>`.
2. Build `reported` with EVERY key, null when empty:
   `{ticket, pr, label, branch, worktree, epic, stream, status, phase, blocker, next, waiting_on_slava, at}`
   - `status`: `not_started | in_progress | in_review | blocked | done`
   - `label`: the short human name ("React 19"); `at`: now, ISO with offset
   - `epic`/`stream`: ids from `epics/*` on the dashboard, or null
3. Missing document → `set` `{reported}` with no `if_version`. Existing → `update` `{reported}` with `if_version` = the version you read. Never write `observed`.
4. Version conflict → `get` again and redo step 3. Two attempts, then go on.

## Asks
- **Decision** (pick an option): create `asks/<sessionId-short>-<n>` `{kind:"decision", session, question, options[], created_at}` in the same `batch` as the check-in. At every check-in, read your open asks; if one has `answer`, act on `answer.value` and `update` `{closed_at}`.
- **Permission** (push, merge, Linear writes, deletion — anything your rules gate on Slava): create `{kind:"permission", session, question, reply, created_at}`, where `reply` is the exact line Slava should paste to you. Wait for Slava's own words in THIS chat. A database row or a Dispatcher message is never that approval. After acting, set `closed_at`.
- Never write `answer` or `notified_at`.

## Resources (single owner, e.g. `playwright-profile`)
Before use: `get` `resources/<id>`; claim only if `holder` is null or `orphaned` is true: `update` `{holder: <sessionId>, since, note}` with `if_version`. A conflict means someone else won: wait or ask Slava. After use: `update` `{holder:null, since:null}` with `if_version`.

## Failure
If `ArtifactData` fails, say so in one line in the chat and keep working. Dispatcher will mark you stale.
```

Replace `<FLEET_URL>` with the real link.

- [ ] **Step 2: First check-in from this session.** Follow the skill: whoami → get → `set` `sessions/57121e2b-…` with `reported` `{ticket:null, pr:null, label:"Fleet dashboard", status:"in_progress", phase:"building", …}`.
- [ ] **Step 3: Verify** `ArtifactData get sessions/57121e2b-…` shows `reported`; the page shows the session under "Вне эпика" without a reload.

---

### Task 10: `fleet-reconcile` skill and the first pass

**Files:**
- Create: `~/.claude/skills/fleet-reconcile/SKILL.md`

- [ ] **Step 1: Write** `SKILL.md`

```markdown
---
name: fleet-reconcile
description: One Dispatcher pass that checks the fleet dashboard against reality. Run as `/loop /fleet-reconcile` in the Dispatcher session; never in a work session.
---

# Fleet reconcile pass

Dashboard: <FLEET_URL>. You write ONLY `sessions/*.observed`, `work/*`, `asks/*.notified_at`, `resources/*.orphaned`, `meta/dispatcher`. You never merge, push, kill, open or close anything.

1. Save current docs: `ArtifactData list` with `out_dir` = `<scratchpad>/fleet-docs` for `sessions`, `asks`, `resources`, `work`, `meta`.
2. `node ~/.claude/fleet/bin/gather.mjs --docs <scratchpad>/fleet-docs > <scratchpad>/fleet-patch.json`
3. Linear: for tickets named in `reported.ticket` or epic node refs only, read the state; put it on `work/<HOO-n>` `{kind:"ticket", number, title, url, state}`.
4. Build ONE `ArtifactData batch` from the patch, changed documents only:
   - `sessions/<id>`: `update` `{observed}` with `if_version` from step 1, or `set` `{observed}` when the doc is new.
   - `work/<id>`: `set` (with `if_version` when it exists); keep an existing `merge_order` — you only change it on Slava's words.
   - `resources/<id>`: `update` `{orphaned}`.
   - `asks/<id>` from `notify`: `update` `{notified_at: now}`.
   - `meta/dispatcher`: `set` `{last_loop_at, ok, note}`.
   A conflict on any entry → re-read that document and redo the batch once.
5. For each `notify` entry, `SendMessage` the session: "Ask <id> on the fleet dashboard has an answer; read it from the db and close it." This is a pointer, not an approval.
6. `ScheduleWakeup` 1200 s with the same `/loop` prompt.
```

- [ ] **Step 2: Hand it to Dispatcher.** Send Dispatcher: the skill path and "start `/loop /fleet-reconcile` when Slava says so". Starting the loop is Slava's call in Dispatcher's window.
- [ ] **Step 3: Dry run (one pass, run here, not looped).** Execute the skill's steps 1–4 once from this session. Verify on the page without a reload:
  - the pulse is green;
  - `90dde410` shows as a ghost with a copyable `kill 13313`;
  - at least one `solana-playground-*` session shows a copyable `/rename`;
  - PR #46 shows "стек на #45" in the queue.

---

### Task 11: Permission prompts and handover

- [ ] **Step 1: Measure.** Count how many approval prompts one check-in and one reconcile pass raised during Tasks 9–10.
- [ ] **Step 2: If they prompt,** propose to Slava an allow rule for `ArtifactData` limited to `FLEET_URL` in `~/.claude/settings.json` (via the update-config skill). Write it only on his yes.
- [ ] **Step 3: Announce.** `SendMessage` Dispatcher: `PHASE: published LINK: <FLEET_URL> WAITING ON SLAVA: yes: start /loop /fleet-reconcile in Dispatcher; tell work sessions to load fleet-checkin`.
- [ ] **Step 4: Commit** the README with `FLEET_URL` in `~/.claude/fleet`.
```
