import {
  defaultServerEndpoint,
  SAME_ORIGIN_ENDPOINT,
} from "./default-endpoint";

const LOCAL = "http://localhost:8080";

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
