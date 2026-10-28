/**
 * A request to the build server that failed. `status` is the HTTP status of
 * a refused request, `null` when no answer came; `body` is what the server
 * said, so a caller can tell one refusal from another.
 */
export class PgServerError extends Error {
  constructor(
    url: string,
    readonly status: number | null,
    readonly body: string
  ) {
    super(`Server request failed (${url}): ${body}`);
    this.name = "PgServerError";
  }
}
