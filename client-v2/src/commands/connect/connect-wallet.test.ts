// A file of its own: `src/commands/` is a runtime module the UI move rule
// never touches, so its tests stay out of the modules (AGENTS.md)
import { beforeEach, describe, expect, it, vi } from "vitest";

const unmounted = vi.hoisted(() => new Error("The terminal is not open."));
const execute = vi.hoisted(() => vi.fn());
const connectTo = vi.hoisted(() => vi.fn());

vi.mock("../../utils", () => ({
  PgCommand: { connect: { execute } },
  isTerminalUnmounted: (error: unknown) => error === unmounted,
}));
vi.mock("./connect", () => ({ connectTo }));

import { connectWallet } from "./connect-wallet";

beforeEach(() => {
  execute.mockReset();
  connectTo.mockReset();
});

describe("commands/connect/connect-wallet", () => {
  it("runs `connect` in the terminal while one is mounted", async () => {
    execute.mockResolvedValue(undefined);

    await connectWallet();

    expect(execute).toHaveBeenCalledOnce();
    expect(connectTo).not.toHaveBeenCalled();
  });

  it("runs `connect` without a terminal while none is mounted, as under Home", async () => {
    execute.mockRejectedValue(unmounted);
    connectTo.mockResolvedValue(undefined);

    await connectWallet();

    expect(connectTo).toHaveBeenCalledExactlyOnceWith(undefined);
  });

  it("passes the handler's failure on, such as the user closing the setup", async () => {
    const rejected = new Error("Setup rejected.");
    execute.mockRejectedValue(unmounted);
    connectTo.mockRejectedValue(rejected);

    await expect(connectWallet()).rejects.toBe(rejected);
  });

  it("passes any other failure in the terminal on without a second try", async () => {
    const failure = new Error("boom");
    execute.mockRejectedValue(failure);

    await expect(connectWallet()).rejects.toBe(failure);
    expect(connectTo).not.toHaveBeenCalled();
  });
});
