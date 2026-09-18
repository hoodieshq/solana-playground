import {
  defaultServerEndpoint,
  FOUNDATION_ENDPOINT,
  SAME_ORIGIN_ENDPOINT,
  SERVER_ENDPOINT_OPTIONS,
  SOLPG_ENDPOINT,
} from "./default-endpoint";

const LOCAL = "http://localhost:8080";

describe("SERVER_ENDPOINT_OPTIONS", () => {
  it("offers upstream's api.solpg.io as a labelled choice, after Solana's", () => {
    const names = SERVER_ENDPOINT_OPTIONS.map((o) => o.name);
    const solpg = SERVER_ENDPOINT_OPTIONS.find(
      (o) => o.value === SOLPG_ENDPOINT
    );
    expect(SOLPG_ENDPOINT).toBe("https://api.solpg.io");
    expect(solpg?.name).toBe("SolPg (original backend)");
    expect(names.indexOf("Solana Foundation")).toBeLessThan(
      names.indexOf("SolPg (original backend)")
    );
    expect(
      SERVER_ENDPOINT_OPTIONS.find((o) => o.name === "Solana Foundation")?.value
    ).toBe(FOUNDATION_ENDPOINT);
  });

  it("never defaults to api.solpg.io (D30)", () => {
    for (const env of ["production", "development", "test"]) {
      expect(
        defaultServerEndpoint({ NODE_ENV: env }, { local: LOCAL })
      ).not.toBe(SOLPG_ENDPOINT);
    }
  });
});

describe("defaultServerEndpoint", () => {
  it("is the same-origin proxy in production", () => {
    expect(
      defaultServerEndpoint({ NODE_ENV: "production" }, { local: LOCAL })
    ).toBe(SAME_ORIGIN_ENDPOINT);
  });

  it("stays the local server in development and test", () => {
    expect(
      defaultServerEndpoint({ NODE_ENV: "development" }, { local: LOCAL })
    ).toBe(LOCAL);
    expect(defaultServerEndpoint({ NODE_ENV: "test" }, { local: LOCAL })).toBe(
      LOCAL
    );
  });

  it("lets REACT_APP_SERVER_URL win, but not an empty one", () => {
    expect(
      defaultServerEndpoint(
        { NODE_ENV: "production", REACT_APP_SERVER_URL: "https://x.example" },
        { local: LOCAL }
      )
    ).toBe("https://x.example");
    expect(
      defaultServerEndpoint(
        { NODE_ENV: "production", REACT_APP_SERVER_URL: "" },
        { local: LOCAL }
      )
    ).toBe(SAME_ORIGIN_ENDPOINT);
  });
});
