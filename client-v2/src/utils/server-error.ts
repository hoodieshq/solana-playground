/**
 * A request to the build server that failed. `status` is the HTTP status of
 * a refused request and `body` what the server answered; with no answer
 * (offline, CORS, abort), `status` is `null` and `body` is the network
 * error's message. Kept apart so a caller can tell one refusal from another.
 */
export class PgServerError extends Error {
  constructor(
    readonly url: string,
    readonly status: number | null,
    readonly body: string,
    options?: { cause?: unknown }
  ) {
    super(`Server request failed (${url}): ${body}`);
    this.name = "PgServerError";
    if (options && "cause" in options) {
      Object.defineProperty(this, "cause", { value: options.cause });
    }
  }
}
