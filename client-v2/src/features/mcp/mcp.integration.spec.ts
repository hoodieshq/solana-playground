// @vitest-environment node
import handler from "../../../api/mcp.mjs";
import { jsonBody, postJson } from "../../test/api-handler";

/** Whether the auth slice sees a signed-in caller; a case sets it itself */
const session = vi.hoisted(() => ({ signedIn: false }));

vi.mock("../auth/server.mjs", async (importOriginal) => {
  const real = await importOriginal<typeof import("../auth/server.mjs")>();
  return {
    isAllowedOrigin: real.isAllowedOrigin,
    requireUser: async () => (session.signedIn ? { id: "user-1" } : null),
  };
});

/**
 * The Explorer upstream forwards our protection bypass, so only a signed-in
 * caller on our own origin is offered it. The public Solana upstream stays
 * open to everyone.
 */
describe("GET /api/mcp with the Explorer bypass configured", () => {
  beforeEach(() => {
    vi.stubEnv("MCP_EXPLORER_BYPASS", "bypass-secret");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  const serverIds = async (headers: Record<string, string> = {}) => {
    const res = await postJson(handler, "", { method: "GET", headers });
    return jsonBody<{ servers: Array<{ id: string }> }>(res).servers.map(
      (s) => s.id
    );
  };

  it("hides Explorer from a signed-in caller on another site", async () => {
    session.signedIn = true;
    vi.stubEnv("AUTH_BASE_URL", "https://app.test");
    expect(await serverIds({ origin: "https://elsewhere.test" })).toEqual([
      "solana",
    ]);
  });

  it("hides Explorer from a signed-out caller", async () => {
    session.signedIn = false;
    expect(await serverIds()).toEqual(["solana"]);
  });

  it("offers Explorer to a signed-in caller", async () => {
    session.signedIn = true;
    expect(await serverIds()).toEqual(["solana", "explorer"]);
  });
});

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
