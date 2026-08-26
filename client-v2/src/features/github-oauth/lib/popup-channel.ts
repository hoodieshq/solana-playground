// A one-shot channel to a service that answers in a popup we opened.
//
// The service navigates the popup through its own pages and finally posts one
// message back. The channel owns only the transport: which window may speak,
// from which origin, and what it means when it closes instead of answering.
// Deciding whether a payload is meaningful stays with the caller, via `accept`.

/**
 * Why the channel stopped waiting with nothing delivered.
 *
 * `cancelled` means the popup closed in silence - the user dismissed it.
 * `rejected` means something claiming to be this flow's reply arrived and was
 * turned away. Collapsing the two would tell a user they cancelled a sign-in
 * they never cancelled, and hide a forged or stale message behind it.
 */
export type PopupChannelFailure = "cancelled" | "rejected";

export type PopupReceipt =
  | { delivered: true; data: unknown }
  | { delivered: false; reason: PopupChannelFailure };

export interface PopupChannel {
  /** The first accepted message, or why waiting ended without one */
  receive: () => Promise<PopupReceipt>;
}

interface PopupChannelOptions {
  url: string;
  /** Window name; reusing it re-navigates the same popup rather than opening another */
  name: string;
  features: string;
  /** Payloads this caller considers meaningful; anything else is ignored */
  accept: (data: unknown) => boolean;
  /**
   * Also listen on a same-origin `BroadcastChannel` of this name. Preferred
   * over `window.opener`, which COOP can sever across a cross-origin hop.
   *
   * Note it is same-origin but NOT window-bound: any same-origin context can
   * post here, so `accept` is the only filter on this path.
   */
  broadcastName?: string;
  /** How often to notice a closed popup, in ms */
  pollMs?: number;
}

/**
 * Open `url` in a popup and return a channel to it.
 *
 * Returns `undefined` when the browser blocked the popup, which is a different
 * outcome from the user closing it and deserves different wording upstream.
 *
 * @example Awaiting a provider's answer
 * ```ts
 * const channel = openPopupChannel({
 *   url: "/api/example?action=start",
 *   name: "example-auth",
 *   features: "width=980,height=720",
 *   accept: (data) => isExampleMessage(data),
 * });
 * if (!channel) throw new Error("Allow popups for this site.");
 * const message = await channel.receive();
 * ```
 */
export const openPopupChannel = (
  opts: PopupChannelOptions
): PopupChannel | undefined => {
  const popup = window.open(opts.url, opts.name, opts.features);
  if (!popup) return undefined;

  const receive = () =>
    new Promise<PopupReceipt>((resolve) => {
      let pollInterval: number;
      // Set when a message purporting to be this flow's reply was turned away,
      // so a close afterwards is reported as a rejection, not a cancellation.
      let sawRejected = false;
      const broadcast =
        opts.broadcastName && typeof BroadcastChannel !== "undefined"
          ? new BroadcastChannel(opts.broadcastName)
          : undefined;

      const settle = (receipt: PopupReceipt) => {
        window.removeEventListener("message", onMessage);
        broadcast?.close();
        window.clearInterval(pollInterval);
        resolve(receipt);
      };

      const reject = (why: string) => {
        sawRejected = true;
        console.warn(`popup-channel: ${why}`);
      };

      const onMessage = (ev: MessageEvent) => {
        // Origin alone is not enough: same-origin code elsewhere on the page
        // (the project iframe) could post too, so pin it to this window.
        // A foreign origin is ordinary page noise, so it is not a rejection.
        if (ev.origin !== window.location.origin) return;
        if (ev.source !== popup) {
          return reject("same-origin message from another window");
        }
        if (!opts.accept(ev.data)) {
          return reject("window message rejected by accept()");
        }
        settle({ delivered: true, data: ev.data });
      };

      window.addEventListener("message", onMessage);

      if (broadcast) {
        broadcast.onmessage = (ev: MessageEvent) => {
          if (!opts.accept(ev.data)) {
            return reject("broadcast rejected by accept()");
          }
          settle({ delivered: true, data: ev.data });
        };
      }

      pollInterval = window.setInterval(() => {
        if (popup.closed) {
          settle({
            delivered: false,
            reason: sawRejected ? "rejected" : "cancelled",
          });
        }
      }, opts.pollMs ?? 500);
    });

  return { receive };
};
