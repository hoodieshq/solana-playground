/** @jest-environment node */
// `api/` is plain ESM outside the TS build (see api/health.mjs); jest
// resolves it by relative path, as the other api specs do.
import handler from "../../../api/mcp.mjs";
import { jsonBody, postJson } from "../../test/api-handler";

/**
 * `/api/mcp` refuses a body that is not a JSON object with a 400 and an
 * error that says what it wanted, whether the body arrives as a raw
 * stream or pre-parsed by the platform. `api/agent.mjs` reads its body
 * through the same `readJson`, and its spec pins the same contract.
 */
describe("POST /api/mcp body validation", () => {
  const notObjects: Array<[label: string, raw: string]> = [
    ["null", "null"],
    ["a number", "42"],
    ["a string", '"hello"'],
    ["an array", "[]"],
  ];

  for (const [label, raw] of notObjects) {
    it(`refuses a streamed body that is ${label}`, async () => {
      const res = await postJson(handler, raw);
      expect(res.statusCode).toBe(400);
      expect(jsonBody(res).error).toMatch(/JSON object/);
    });
  }

  // A pre-parsed string stays ambiguous -- the platform hands raw text
  // over the same way -- so it is parsed rather than refused
  for (const [label, raw] of notObjects.filter(([l]) => l !== "a string")) {
    it(`refuses a pre-parsed body that is ${label}`, async () => {
      const res = await postJson(handler, raw, { preparsed: true });
      expect(res.statusCode).toBe(400);
      expect(jsonBody(res).error).toMatch(/JSON object/);
    });
  }

  it("refuses malformed JSON", async () => {
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
