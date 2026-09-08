import { PgServer } from "./server";

const settings = {
  server: { endpoint: "http://server.test" },
  experimental: { unstable: false },
};

jest.mock("./settings", () => ({
  get PgSettings() {
    return settings;
  },
}));

const mockFetch = jest.fn();
global.fetch = mockFetch as unknown as typeof fetch;

const respond = (body: unknown) => {
  mockFetch.mockResolvedValue({
    ok: true,
    status: 200,
    json: async () => body,
    text: async () => String(body),
    arrayBuffer: async () => new Uint8Array([1, 2, 3]).buffer,
  });
};

const requestedUrl = () => mockFetch.mock.calls[0][0] as string;
const requestInit = () => mockFetch.mock.calls[0][1] as RequestInit;

beforeEach(() => {
  mockFetch.mockReset();
  settings.experimental.unstable = false;
});

describe("PgServer routes", () => {
  it("posts a build to /build on the chosen server", async () => {
    respond({ stderr: "", uuid: "u", idl: null });
    await PgServer.build({ files: [] });

    expect(requestedUrl()).toBe("http://server.test/build");
    expect(requestInit().method).toBe("POST");
  });

  it("gets the program from /deploy/:uuid", async () => {
    respond(null);
    const bytes = await PgServer.deploy("abc");

    expect(requestedUrl()).toBe("http://server.test/deploy/abc");
    expect(Array.from(bytes)).toEqual([1, 2, 3]);
  });

  it("posts the manifest and lock to /bundle and returns the files", async () => {
    const answer = {
      bundle: [["a/bundle.js", "export {}"]],
      types: [["a/types.json", "[]"]],
      manifest: "{}",
      lock: "",
    };
    respond(answer);
    const result = await PgServer.bundle({ manifest: "{}", lock: null });

    expect(requestedUrl()).toBe("http://server.test/bundle");
    expect(requestInit().method).toBe("POST");
    expect(JSON.parse(requestInit().body as string)).toEqual({
      manifest: "{}",
      lock: null,
    });
    expect(result).toEqual(answer);
  });

  // The server in this tree has no such routes; a client that still asked
  // for them would be a scheduled break against any server built from it
  it("has no packages or types routes any more", () => {
    const server = PgServer as unknown as Record<string, unknown>;
    expect(server.packages).toBeUndefined();
    expect(server.types).toBeUndefined();
  });
});

describe("the unstable switch", () => {
  beforeEach(() => {
    settings.experimental.unstable = true;
  });

  it("prefixes build with /unstable", async () => {
    respond({ stderr: "", uuid: null, idl: null });
    await PgServer.build({ files: [] });
    expect(requestedUrl()).toBe("http://server.test/unstable/build");
  });

  it("prefixes deploy with /unstable", async () => {
    respond(null);
    await PgServer.deploy("abc");
    expect(requestedUrl()).toBe("http://server.test/unstable/deploy/abc");
  });

  it("prefixes bundle with /unstable", async () => {
    respond({ bundle: [], types: [], manifest: "", lock: "" });
    await PgServer.bundle({ manifest: "{}" });
    expect(requestedUrl()).toBe("http://server.test/unstable/bundle");
  });

  it("leaves the share routes alone: they have no sandbox to pick", async () => {
    respond("share-id");
    await PgServer.shareNew({ explorer: { files: {} } });
    expect(requestedUrl()).toBe("http://server.test/new");
  });
});
