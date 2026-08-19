import type { Disposable } from "../../../utils";

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
  | { kind: "error"; id: string; text: string };

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

  static get apiKey() {
    return PgAssistant._apiKey;
  }

  static get hasKey() {
    return !!PgAssistant._apiKey;
  }

  /** Set the key for this tab. Not written anywhere. */
  static setApiKey(key: string) {
    PgAssistant._apiKey = key.trim() || null;
    PgAssistant._emit();
  }

  static setStatus(status: AssistantStatus) {
    PgAssistant._status = status;
    PgAssistant._emit();
  }

  static addUserMessage(text: string) {
    PgAssistant._items.push({ kind: "user", id: makeId(), text });
    PgAssistant._emit();
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
    PgAssistant._items.push({ kind: "approval", id, request, status: "pending" });
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
  private static _apiKey: string | null = null;
  private static readonly _pending = new Map<
    string,
    (allowed: boolean) => void
  >();
  private static readonly _listeners = new Set<() => void>();

  private static _emit() {
    for (const cb of PgAssistant._listeners) cb();
  }
}
