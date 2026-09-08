// The band's wiring, tested without a rendered tree. Mocked at the
// module boundary the same way the other lesson tests mock `../../../utils`
// -- importing it for real reaches generated globals that only exist
// once the app has booted.
jest.mock("../../../utils", () => ({
  PgCommand: {
    build: { execute: jest.fn() },
    connect: { execute: jest.fn() },
    airdrop: { execute: jest.fn() },
  },
  PgSettings: { connection: { endpoint: "http://localhost:8899" } },
  PgTerminal: {
    println: jest.fn(),
    error: (text: string) => `ERROR: ${text}`,
  },
}));

jest.mock("../../../constants", () => ({
  DEFAULT_ENDPOINT: "https://devnet.example/rpc",
}));

jest.mock("../../../features/github-oauth", () => ({
  GithubAuth: { signIn: jest.fn() },
}));

import { remedy } from "./readiness-remedy";
import { GithubAuth } from "../../../features/github-oauth";
import { PgCommand, PgSettings, PgTerminal } from "../../../utils";

const signIn = GithubAuth.signIn as jest.Mock;
const println = PgTerminal.println as jest.Mock;

/** Let the rejection handler attached inside the remedy run */
const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

beforeEach(() => {
  jest.clearAllMocks();
  signIn.mockResolvedValue(undefined);
  PgSettings.connection.endpoint = "http://localhost:8899";
});

describe("remedy", () => {
  it("runs the same build the stage button runs", () => {
    remedy({ kind: "needs-build", running: false })();
    expect(PgCommand.build.execute).toHaveBeenCalledTimes(1);
  });

  it("runs the same connect the header chip runs", () => {
    remedy({ kind: "needs-wallet" })();
    expect(PgCommand.connect.execute).toHaveBeenCalledTimes(1);
  });

  it("switches to the deployment's own devnet, not the public one", () => {
    // A deployment that configures a platform RPC must not have its
    // learners bounced onto the rate-limited public devnet
    remedy({ kind: "needs-cluster", cluster: "localnet" })();
    expect(PgSettings.connection.endpoint).toBe("https://devnet.example/rpc");
  });

  it("airdrops when the learner is already signed in", () => {
    remedy({ kind: "needs-sol", signedIn: true })();
    expect(PgCommand.airdrop.execute).toHaveBeenCalledTimes(1);
    expect(signIn).not.toHaveBeenCalled();
  });

  it("signs in first when the airdrop still needs it", () => {
    remedy({ kind: "needs-sol", signedIn: false })();
    expect(signIn).toHaveBeenCalledTimes(1);
    // One click, one step of the chain: the copy says "sign in, then
    // airdrop", and the airdrop is the learner's next click
    expect(PgCommand.airdrop.execute).not.toHaveBeenCalled();
  });

  it("says so in the terminal when sign-in fails", async () => {
    // A blocked popup rejects; without this the click would do nothing
    // visible at all, which is the unlabelled click one level down
    signIn.mockRejectedValue(new Error("Allow popups for this site"));
    remedy({ kind: "needs-sol", signedIn: false })();
    await flush();

    expect(println).toHaveBeenCalledTimes(1);
    expect(println.mock.calls[0][0]).toContain("Allow popups for this site");
    expect(println.mock.calls[0][0]).toContain("Sign-in failed");
  });

  it("survives a rejection that is not an Error", async () => {
    signIn.mockRejectedValue("nope");
    remedy({ kind: "needs-sol", signedIn: false })();
    await flush();

    expect(println.mock.calls[0][0]).toContain("nope");
  });
});
