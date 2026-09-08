/** @jest-environment node */
// `api/` is plain ESM outside the TS build (see api/health.mjs); jest
// resolves it by relative path, as the other api specs do.
import handler from "../../../api/mcp.mjs";
import { jsonBody, postJson } from "../../test/api-handler";

/**
 * The MCP gateway carried the same defect M3 named on `/api/agent`: a
 * body of `null` was destructured (`const { id, method, params } = body`)
 * outside the try that wraps parsing, so the route answered 500 with no
 * JSON-RPC envelope and an MCP client saw a transport failure instead of
 * a message it could show. Both rails read a body through the same
 * `readJson` now; this pins that the fix reaches this one.
 */
describe("POST /api/mcp body validation", () => {
  const notObjects: Array<[label: string, raw: string]> = [
    ["null", "null"],
    ["a number", "42"],
    ["a string", '"hello"'],
    ["an array", "[]"],
  ];

  for (const [label, raw] of notObjects) {
    it(`answers 400, not 500, to a streamed body that is ${label}`, async () => {
      const res = await postJson(handler, raw);
      expect(res.statusCode).toBe(400);
      expect(jsonBody(res).error).toMatch(/JSON object/);
    });
  }

  // A pre-parsed string stays ambiguous -- the platform hands raw text
  // over the same way -- so it is parsed rather than refused
  for (const [label, raw] of notObjects.filter(([l]) => l !== "a string")) {
    it(`answers 400, not 500, to a pre-parsed body that is ${label}`, async () => {
      const res = await postJson(handler, raw, { preparsed: true });
      expect(res.statusCode).toBe(400);
      expect(jsonBody(res).error).toMatch(/JSON object/);
    });
  }

  it("still answers 400 to malformed JSON", async () => {
    const res = await postJson(handler, "{not json");
    expect(res.statusCode).toBe(400);
  });

  it("takes a well-formed notification, which expects no body back", async () => {
    const res = await postJson(
      handler,
      '{"jsonrpc":"2.0","method":"notifications/initialized"}'
    );
    expect(res.statusCode).toBe(202);
  });
});
