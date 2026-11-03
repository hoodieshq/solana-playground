import { afterEach, describe, expect, it, vi } from "vitest";

import { PgConnection } from "./connection";

// The real settings module reads build-time globals the unit runner lacks
vi.mock("./settings", () => ({
  PgSettings: { connection: { endpoint: "http://localhost:8899" } },
}));

// Playnet pulls in the WASM packages; only its URL check is read here
vi.mock("./playnet", () => ({
  OverridableConnection: class {},
  PgPlaynet: { isUrlPlaynet: (url: string) => url === "http://playnet" },
}));

describe("PgConnection.getCluster", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  // Localnet and Surfpool (default `127.0.0.1:8899`) are the local deploy
  // path: read from the URL alone, never by asking the validator
  it.each([
    "http://localhost:8899",
    "http://127.0.0.1:8899",
    "http://127.0.0.1:18899",
  ])("reads %s as localnet without an RPC call", async (endpoint) => {
    const create = vi.spyOn(PgConnection, "create");

    await expect(PgConnection.getCluster(endpoint)).resolves.toBe("localnet");
    expect(create).not.toHaveBeenCalled();
  });
});
