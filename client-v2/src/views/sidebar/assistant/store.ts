import {
  DEFAULT_SKILL_IDS,
  listGatewayServers,
  listTools,
  LOCAL_MCP_SERVERS,
} from "./grounding";
import type { Disposable } from "../../../utils";
import type { McpServerEntry, McpTool } from "./grounding";
import type { Effort, ProviderId } from "./model/types";

/** A change the assistant wants to make, waiting on the user */
export interface PatchApproval {
  type: "patch";
  path: string;
  /** Current content, or `null` when the file does not exist yet */
  before: string | null;
  after: string;
}

/** A command the assistant wants to run, waiting on the user */
export interface CommandApproval {
  type: "command";
  name: "build" | "deploy";
  /** Plain-language description of what running it will do */
  effect: string;
}

export type ApprovalRequest = PatchApproval | CommandApproval;

export type ApprovalStatus = "pending" | "allowed" | "denied";

export type ChatItem =
  | { kind: "user"; id: string; text: string }
  | { kind: "assistant"; id: string; text: string }
  | { kind: "tool"; id: string; label: string }
  | {
      kind: "approval";
      id: string;
      request: ApprovalRequest;
      status: ApprovalStatus;
      /** Set once the tool has actually run */
      outcome?: string;
    }
  | { kind: "error"; id: string; text: string }
  /** Something the panel did, not the model — e.g. the user stopped the turn */
  | { kind: "notice"; id: string; text: string };

/** Which backend the panel is talking to, and what it needs to reach it */
export interface Connection {
  id: ProviderId;
  apiKey: string;
  endpoint?: { baseUrl: string; model: string };
  /** Model and effort, for backends that pick them without a base URL */
  settings?: { model: string; effort: Effort };
}

/** What the panel is doing right now */
export type AssistantStatus =
  /** Waiting for the user to type */
  | "idle"
  /** A turn is in flight */
  | "running"
  /** A turn is in flight but blocked on an approval */
  | "awaiting";

let nextId = 0;
const makeId = () => `i${++nextId}`;

const isSame = (a: Connection | null, b: Connection) =>
  !!a &&
  a.id === b.id &&
  a.apiKey === b.apiKey &&
  a.endpoint?.baseUrl === b.endpoint?.baseUrl &&
  a.endpoint?.model === b.endpoint?.model &&
  a.settings?.model === b.settings?.model &&
  a.settings?.effort === b.settings?.effort;

/**
 * Everything the panel renders.
 *
 * Deliberately in memory only, including the API key — see
 * `docs/decisions.md` -> D3 for why the key is not in `localStorage` yet.
 * Conversation history is not persisted either; a reload starts fresh.
 */
export class PgAssistant {
  static get items(): readonly ChatItem[] {
    return PgAssistant._items;
  }

  static get status() {
    return PgAssistant._status;
  }

  /** Which backend is selected, and its key. Never written anywhere. */
  static get connection() {
    return PgAssistant._connection;
  }

  static get isConnected() {
    return !!PgAssistant._connection;
  }

  /** Whether the backend picker is open on top of an existing connection */
  static get isPickingBackend() {
    return PgAssistant._pickingBackend;
  }

  /**
   * Choose a backend for this tab.
   *
   * Re-picking the current one is a no-op beyond closing the picker; anything
   * else starts a new conversation, because the history lives inside the
   * provider and the new one cannot see the old transcript.
   *
   * @param connection which provider, its key, and whatever it needs to be
   * reached — a base URL and model, or a model and effort
   */
  static connect(connection: Connection) {
    const next: Connection = {
      ...connection,
      apiKey: connection.apiKey.trim(),
    };
    if (!PgAssistant.isCurrent(next)) {
      PgAssistant.clear();
      PgAssistant._connection = next;
    }
    PgAssistant._pickingBackend = false;
    PgAssistant._emit();
  }

  /** Whether connecting with these settings would keep the conversation */
  static isCurrent(next: Connection) {
    return isSame(PgAssistant._connection, next);
  }

  /** Reopen the picker, keeping the conversation in case the user comes back */
  static pickBackend() {
    PgAssistant._pickingBackend = true;
    PgAssistant._emit();
  }

  /** Close the picker without changing anything */
  static keepBackend() {
    PgAssistant._pickingBackend = false;
    PgAssistant._emit();
  }

  /** Drop the backend and the key, and clear the conversation with it */
  static disconnect() {
    PgAssistant._connection = null;
    PgAssistant._pickingBackend = false;
    PgAssistant.clear();
  }

  /** Which skills the model may load this session */
  static get enabledSkillIds(): readonly string[] {
    return PgAssistant._enabledSkillIds;
  }

  static setSkillEnabled(id: string, enabled: boolean) {
    const ids = PgAssistant._enabledSkillIds.filter((i) => i !== id);
    PgAssistant._enabledSkillIds = enabled ? [...ids, id] : ids;
    PgAssistant._emit();
  }

  /**
   * Every MCP server, enabled or not: the gateway's own, then local additions.
   *
   * Held as two lists because they have different owners. The gateway decides
   * what it serves and the client cannot edit that; a local entry is an
   * addition. Merging them into one editable list would let Apply silently
   * delete a server the gateway still offers.
   */
  static get mcpServers(): readonly McpServerEntry[] {
    return [...PgAssistant._gatewayServers, ...PgAssistant._localServers];
  }

  /** The gateway's own upstreams, as it reported them */
  static get gatewayMcpServers(): readonly McpServerEntry[] {
    return PgAssistant._gatewayServers;
  }

  /** Only the entries the user added, which is what the editor edits */
  static get localMcpServers(): readonly McpServerEntry[] {
    return PgAssistant._localServers;
  }

  /** The servers a turn should actually declare */
  static get enabledMcpServers(): readonly McpServerEntry[] {
    return PgAssistant.mcpServers.filter((s) => s.enabled && s.url.trim());
  }

  /** Replace the local additions — edited as one JSON document */
  static setMcpServers(servers: readonly McpServerEntry[]) {
    PgAssistant._localServers = servers;
    PgAssistant._emit();
  }

  /**
   * Ask the gateway what it serves.
   *
   * Failure is not surfaced: running under a plain `craco start` there is no
   * `/api`, and that should leave the panel working with local additions and
   * skills rather than showing an error nobody can act on.
   */
  static async loadMcpServers() {
    try {
      PgAssistant._gatewayServers = await listGatewayServers();
      PgAssistant._emit();
    } catch {}
  }

  /** Learn what exists, then what it offers. Safe to call on every mount. */
  static async initMcp() {
    await PgAssistant.loadMcpServers();
    await PgAssistant.discoverMcpTools();
  }

  /**
   * Tools discovered from browser-executed servers, by server id.
   *
   * Cached because discovery is a network round trip and `createTools()` is
   * synchronous — a server missing from here contributes no tools this turn
   * rather than blocking it.
   */
  static get mcpTools(): Readonly<Record<string, readonly McpTool[]>> {
    return PgAssistant._mcpTools;
  }

  static setMcpTools(serverId: string, tools: readonly McpTool[]) {
    PgAssistant._mcpTools = { ...PgAssistant._mcpTools, [serverId]: tools };
    PgAssistant._emit();
  }

  /**
   * Discover tools for every enabled browser-executed server.
   *
   * Called when the panel mounts, not only from the Sources tab: `createTools`
   * reads this cache, so a model connected before discovery ran would simply
   * not be offered any MCP tool — with nothing on screen to explain why.
   *
   * Failures are left out rather than raised: a server being unreachable is a
   * fact about that server, and the console is where it gets explained.
   *
   * @param force re-read servers already cached, for when the config changed
   */
  static async discoverMcpTools(force = false) {
    const servers = PgAssistant.enabledMcpServers.filter(
      (server) =>
        server.executor === "browser" &&
        (force || !PgAssistant._mcpTools[server.id])
    );

    await Promise.all(
      servers.map(async (server) => {
        try {
          PgAssistant.setMcpTools(server.id, await listTools(server));
        } catch {}
      })
    );
  }

  static setStatus(status: AssistantStatus) {
    PgAssistant._status = status;
    PgAssistant._emit();
  }

  static addUserMessage(text: string) {
    PgAssistant._items.push({ kind: "user", id: makeId(), text });
    PgAssistant._emit();
  }

  /**
   * Ask the panel to send a prompt on the user's behalf - e.g. "Fix with
   * assistant" on a build error card.
   *
   * The panel itself owns the actual send (its provider lives in a ref
   * inside `Chat`), so this only notifies; it does not append a message
   * itself.
   *
   * `Flow` subscribes here too, only to reopen the panel when it is
   * collapsed - it never sends anything. When it is the only listener
   * (the panel is collapsed, so `Chat` is unmounted), the text would
   * otherwise be lost between this call and `Chat` mounting a moment
   * later, so it is buffered in `_pendingPrompt` for the next subscriber
   * to claim.
   *
   * @param text the prompt to send
   */
  static requestPrompt(text: string) {
    const hasRealListener = PgAssistant._promptListeners.size > 1;
    PgAssistant._pendingPrompt = hasRealListener ? null : text;
    for (const cb of PgAssistant._promptListeners) cb(text);
  }

  /**
   * @param cb runs whenever `requestPrompt` is called. Not called on
   * subscribe with anything new - this is an event, not state, same as
   * `onDidChange` - except a prompt left buffered by `requestPrompt` (see
   * above) is delivered once and cleared, so it still reaches whichever
   * subscriber shows up next.
   * @returns a disposable to clear the event
   */
  static onDidRequestPrompt(cb: (text: string) => void): Disposable {
    PgAssistant._promptListeners.add(cb);
    if (PgAssistant._pendingPrompt !== null) {
      const pending = PgAssistant._pendingPrompt;
      PgAssistant._pendingPrompt = null;
      cb(pending);
    }
    return { dispose: () => PgAssistant._promptListeners.delete(cb) };
  }

  /** Start an assistant message and return its id so text can stream into it */
  static startAssistantMessage() {
    const id = makeId();
    PgAssistant._items.push({ kind: "assistant", id, text: "" });
    PgAssistant._emit();
    return id;
  }

  static appendToAssistantMessage(id: string, delta: string) {
    const item = PgAssistant._items.find((i) => i.id === id);
    if (item?.kind === "assistant") {
      item.text += delta;
      PgAssistant._emit();
    }
  }

  /** Drop an assistant message that never received any text */
  static discardIfEmpty(id: string) {
    const index = PgAssistant._items.findIndex((i) => i.id === id);
    const item = PgAssistant._items[index];
    if (item?.kind === "assistant" && !item.text) {
      PgAssistant._items.splice(index, 1);
      PgAssistant._emit();
    }
  }

  static addToolCall(label: string) {
    PgAssistant._items.push({ kind: "tool", id: makeId(), label });
    PgAssistant._emit();
  }

  static addNotice(text: string) {
    PgAssistant._items.push({ kind: "notice", id: makeId(), text });
    PgAssistant._emit();
  }

  static addError(text: string) {
    PgAssistant._items.push({ kind: "error", id: makeId(), text });
    PgAssistant._emit();
  }

  /**
   * Ask the user to approve something.
   *
   * The promise settles when they click, which is what holds the agent loop
   * open — the tool's `run` does not return until then.
   *
   * @param request what needs approving
   * @returns whether the user allowed it
   */
  static requestApproval(request: ApprovalRequest) {
    const id = makeId();
    PgAssistant._items.push({
      kind: "approval",
      id,
      request,
      status: "pending",
    });
    PgAssistant._status = "awaiting";
    PgAssistant._emit();

    return new Promise<boolean>((resolve) => {
      PgAssistant._pending.set(id, resolve);
    });
  }

  /** Resolve a pending approval */
  static resolveApproval(id: string, allowed: boolean) {
    const item = PgAssistant._items.find((i) => i.id === id);
    if (item?.kind !== "approval" || item.status !== "pending") return;

    item.status = allowed ? "allowed" : "denied";
    PgAssistant._status = "running";
    PgAssistant._emit();

    PgAssistant._pending.get(id)?.(allowed);
    PgAssistant._pending.delete(id);
  }

  /** Record what happened after an approved tool actually ran */
  static setApprovalOutcome(id: string, outcome: string) {
    const item = PgAssistant._items.find((i) => i.id === id);
    if (item?.kind === "approval") {
      item.outcome = outcome;
      PgAssistant._emit();
    }
  }

  /** The id of the approval added most recently, for recording its outcome */
  static get lastApprovalId() {
    for (let i = PgAssistant._items.length - 1; i >= 0; i--) {
      const item = PgAssistant._items[i];
      if (item.kind === "approval") return item.id;
    }
    return null;
  }

  /** Deny everything still waiting — used when a turn is abandoned */
  static cancelPending() {
    for (const [id, resolve] of PgAssistant._pending) {
      const item = PgAssistant._items.find((i) => i.id === id);
      if (item?.kind === "approval") item.status = "denied";
      resolve(false);
    }
    PgAssistant._pending.clear();
    PgAssistant._status = "idle";
    PgAssistant._emit();
  }

  static clear() {
    PgAssistant.cancelPending();
    PgAssistant._items = [];
    PgAssistant._status = "idle";
    PgAssistant._emit();
  }

  /**
   * @param cb runs whenever anything changes. Deliberately not called on
   * subscribe: consumers read the getters directly while rendering, and firing
   * synchronously here caused React state updates during mount/unmount.
   * @returns a disposable to clear the event
   */
  static onDidChange(cb: () => void): Disposable {
    PgAssistant._listeners.add(cb);
    return { dispose: () => PgAssistant._listeners.delete(cb) };
  }

  private static _items: ChatItem[] = [];
  private static _status: AssistantStatus = "idle";
  private static _connection: Connection | null = null;
  private static _pickingBackend = false;
  private static _enabledSkillIds: readonly string[] = DEFAULT_SKILL_IDS;
  private static _gatewayServers: readonly McpServerEntry[] = [];
  // Copied, so editing a server in the UI never mutates the registry default
  private static _localServers: readonly McpServerEntry[] =
    LOCAL_MCP_SERVERS.map((server) => ({ ...server }));
  private static _mcpTools: Readonly<Record<string, readonly McpTool[]>> = {};
  private static readonly _pending = new Map<
    string,
    (allowed: boolean) => void
  >();
  private static readonly _listeners = new Set<() => void>();
  private static readonly _promptListeners = new Set<(text: string) => void>();
  // Set by `requestPrompt` when `Chat` is not around to receive it live;
  // claimed and cleared by the next `onDidRequestPrompt` subscriber.
  private static _pendingPrompt: string | null = null;

  private static _emit() {
    for (const cb of PgAssistant._listeners) cb();
  }
}
