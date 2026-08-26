/**
 * A one-shot channel to a service that answers in a popup we opened.
 *
 * The service navigates the popup through its own pages and finally posts one
 * message back. The channel owns only the transport: which window may speak,
 * from which origin, and what it means when it closes instead of answering.
 * Deciding whether a payload is meaningful stays with the caller, via `accept`.
 */
export interface PopupChannel {
  /**
   * The first accepted message, or `undefined` when the popup closed without
   * sending one - the user dismissing the window rather than an error.
   */
  receive: () => Promise<unknown>;
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
    new Promise<unknown>((resolve) => {
      let pollInterval: number;
      const broadcast =
        opts.broadcastName && typeof BroadcastChannel !== "undefined"
          ? new BroadcastChannel(opts.broadcastName)
          : undefined;

      const settle = (data: unknown) => {
        window.removeEventListener("message", onMessage);
        broadcast?.close();
        window.clearInterval(pollInterval);
        resolve(data);
      };

      const onMessage = (ev: MessageEvent) => {
        // Origin alone is not enough: same-origin code elsewhere on the page
        // (the project iframe) could post too, so pin it to this window
        if (ev.origin !== window.location.origin) return;
        if (ev.source !== popup) {
          // A dropped message here reads to the user as a cancellation, so say
          // which guard rejected it rather than returning in silence
          console.warn(
            "popup-channel: same-origin message from another window"
          );
          return;
        }
        if (!opts.accept(ev.data)) {
          console.warn("popup-channel: window message rejected by accept()");
          return;
        }
        settle(ev.data);
      };

      window.addEventListener("message", onMessage);

      if (broadcast) {
        broadcast.onmessage = (ev: MessageEvent) => {
          if (!opts.accept(ev.data)) {
            console.warn("popup-channel: broadcast rejected by accept()");
            return;
          }
          settle(ev.data);
        };
      }

      pollInterval = window.setInterval(() => {
        if (popup.closed) {
          console.warn("popup-channel: popup closed before any message landed");
          settle(undefined);
        }
      }, opts.pollMs ?? 500);
    });

  return { receive };
};
