import { useEffect, useReducer, useRef, useState } from "react";

import { pushThread } from "../../../effects/chat-thread/push-thread";
import { report } from "../../../features/persistence/model/diagnostics";
import { toReplayMessages } from "../../../features/persistence/model/replay";
import { createProvider } from "../../../views/sidebar/assistant/model";
import { isDefaultBackendRemembered } from "../../../views/sidebar/assistant/model/remembered-backend";
import type { Provider } from "../../../views/sidebar/assistant/model/types";
import { PgAssistant } from "../../../views/sidebar/assistant/store";
import type {
  Connection,
  PromptRequest,
} from "../../../views/sidebar/assistant/store";
import { probeDefaultBackend } from "./default-backend";
import { assistantTelemetry } from "./telemetry";

/** Where Connect a model was opened from */
export type ConnectVia = "menu" | "model" | "send";

/**
 * One assistant turn at a time, shared by the thread and the composer.
 *
 * Called once by the panel and handed to both: two calls would hold two
 * providers, two histories and two Stop buttons for one conversation.
 */
export interface Turn {
  /** Send a prompt; with nothing connected, connect the default or open Connect */
  send(text: string): Promise<void>;
  /** Abort the turn in flight and deny whatever it is waiting on */
  stop(): void;
  busy: boolean;
  /** What is in the composer */
  input: string;
  setInput(value: string): void;
  openConnect(via: ConnectVia): void;
  /** A requested prompt waits in the composer for a backend to be connected */
  promptWaiting: boolean;
  /** Bumped whenever the composer's input should take focus */
  focusRequest: number;
}

const DEFAULT_CONNECTION: Connection = { id: "default", apiKey: "" };

/**
 * Connect the deployment's default when it has one; `null` when it has none,
 * for the caller to ask the user.
 */
const connectDefault = async (): Promise<Connection | null> => {
  const backend = await probeDefaultBackend();
  if (backend.state !== "present") return null;
  // Another caller may have connected while the probe was out
  if (!PgAssistant.connection) PgAssistant.connect(DEFAULT_CONNECTION);
  return PgAssistant.connection;
};

export const useTurn = (): Turn => {
  const [, render] = useReducer((n: number) => n + 1, 0);
  useEffect(() => PgAssistant.onDidChange(render).dispose, []);

  const [input, setInput] = useState("");
  const [focusRequest, focus] = useReducer((n: number) => n + 1, 0);
  // A prompt that arrived with no backend waits in the composer. Saying so is
  // the panel's job, not the conversation's: a notice item would outlive the
  // connect and be stored with the thread
  const [promptWaiting, setPromptWaiting] = useState(false);

  const provider = useRef<{
    connection: Connection;
    instance: Provider;
  } | null>(null);
  const turn = useRef<AbortController | null>(null);
  // Set from the first `send` until its turn starts, so a second send in the
  // meantime (a double Enter, a suggestion clicked twice) cannot start another
  // while the first is still finding a backend
  const starting = useRef(false);

  const status = PgAssistant.status;
  // A stopped turn still has to unwind, and `cancelPending` drops the status to
  // idle before it does; the controller is what says a turn is really over
  const busy = status !== "idle" || !!turn.current;

  const connection = PgAssistant.connection;
  // Connecting answers the hint; a later disconnect must not bring it back
  useEffect(() => {
    if (connection) setPromptWaiting(false);
  }, [connection]);

  // `Connect` reconnects a remembered default when it mounts, but it mounts
  // only when the picker is asked for now; this is the same rule for a panel
  // that opens on the thread and the composer. Only a default the user picked
  // before, only once the probe confirms this deployment still serves it, and
  // never under an open picker, where it would throw away a choice mid-edit.
  useEffect(() => {
    let live = true;
    void probeDefaultBackend().then((backend) => {
      if (!live || backend.state !== "present") return;
      if (PgAssistant.connection || PgAssistant.isPickingBackend) return;
      if (!isDefaultBackendRemembered()) return;
      PgAssistant.connect(DEFAULT_CONNECTION);
    });
    return () => {
      live = false;
    };
  }, []);

  const openConnect = (via: ConnectVia) => {
    assistantTelemetry.track("assistant_connect_opened", { via });
    PgAssistant.pickBackend();
  };

  /** Whether a turn, or a send still finding its backend, is under way */
  const occupied = () =>
    starting.current || !!turn.current || PgAssistant.status !== "idle";

  /**
   * @returns `false` when the send was refused because another one is under
   * way, so a caller holding text the user never typed can keep it
   */
  const start = async (text: string): Promise<boolean> => {
    const trimmed = text.trim();
    if (!trimmed) return true;
    if (occupied()) return false;

    // Only a send with nothing connected waits, so a connected one has started
    // its turn by the time it first yields
    let current = PgAssistant.connection;
    if (!current) {
      starting.current = true;
      try {
        current = await connectDefault();
      } finally {
        starting.current = false;
      }
      // A turn may have started while the probe was out
      if (occupied()) return false;
    }
    if (!current) {
      // Nothing to send to: the prompt stays where the user can send it once
      // a backend is connected
      setInput(text);
      openConnect("send");
      return true;
    }

    // One provider per connection; it owns the conversation history. The store
    // keeps the same object while the settings are unchanged, so identity is
    // enough to catch a switched key or model as well as a switched provider.
    if (provider.current?.connection !== current) {
      provider.current = {
        connection: current,
        // Seeded from what is rendered, so reopening a stored thread gives the
        // model the conversation rather than amnesia behind a full transcript
        instance: createProvider(current, toReplayMessages(PgAssistant.items)),
      };
    }
    const instance = provider.current.instance;

    const controller = new AbortController();
    turn.current = controller;
    setInput("");
    PgAssistant.addUserMessage(trimmed);
    PgAssistant.setStatus("running");

    try {
      await instance.send(trimmed, controller.signal);
    } catch (e) {
      // Stopping is the user's own doing; `stop` already said so
      if (!controller.signal.aborted) {
        PgAssistant.addError(e instanceof Error ? e.message : String(e));
      }
    } finally {
      if (turn.current === controller) turn.current = null;
      PgAssistant.setStatus("idle");
      focus();

      // End of turn is the natural commit point: the exchange is complete and
      // the user is reading rather than typing. Deliberately not awaited --
      // a slow or failed upload must not hold up the panel, and the local
      // copy is already written either way.
      const threadId = PgAssistant.threadId;
      if (threadId) {
        void pushThread(threadId).catch((e) => report("push turn", e));
      }
    }
    return true;
  };
  const send = async (text: string) => {
    await start(text);
  };
  // Bridges `onDidRequestPrompt`, which subscribes once, to this render's `start`
  const startRef = useRef(start);
  startRef.current = start;

  /**
   * Aborting the request is not enough on its own: a tool waiting on an
   * approval holds the agent loop open, so deny whatever is pending too.
   *
   * A stopped turn stays busy until its provider unwinds; a second Stop in
   * that window has nothing left to stop and must not say so twice.
   */
  const stop = () => {
    if (!turn.current || turn.current.signal.aborted) return;
    turn.current.abort();
    PgAssistant.cancelPending();
    PgAssistant.addNotice("Stopped.");
    assistantTelemetry.track("assistant_turn_stopped", {});
  };

  // "Fix with assistant" and similar callers outside the panel ask for a
  // prompt to be sent through `PgAssistant.requestPrompt`; this is the only
  // place that turns the request into an actual send
  useEffect(() => {
    /** A prompt the user did not type gets one look before it costs a turn */
    const place = (text: string) => {
      setInput(text);
      focus();
    };
    /**
     * With a backend to run it: send, or leave it for a look first. A send
     * refused because another is under way leaves it in the composer rather
     * than dropping a prompt the user never typed and cannot retype.
     */
    const run = ({ text, send }: PromptRequest) => {
      if (!send) {
        place(text);
        return;
      }
      void startRef.current(text).then((started) => {
        if (!started) place(text);
      });
    };
    return PgAssistant.onDidRequestPrompt(
      (request) => {
        if (PgAssistant.isConnected) {
          run(request);
          return;
        }
        void probeDefaultBackend().then((backend) => {
          // Connected while the probe was out, or the default can be
          if (PgAssistant.isConnected || backend.state === "present") {
            if (!PgAssistant.isConnected) {
              PgAssistant.connect(DEFAULT_CONNECTION);
            }
            run(request);
            return;
          }
          setInput(request.text);
          setPromptWaiting(true);
          openConnect("send");
        });
      },
      { sends: true }
    ).dispose;
    // `openConnect`, `place` and `run` only touch the store, state setters and
    // `startRef`
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    send,
    stop,
    busy,
    input,
    setInput,
    openConnect,
    promptWaiting,
    focusRequest,
  };
};
