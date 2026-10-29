import { beforeEach, describe, expect, it, vi } from "vitest";

import { PgProgramInfo, PgServer } from "../../utils";
import { estimateDeployCost } from "./estimate";

// Rent is one lamport per byte here, so each case reads as arithmetic
vi.mock("../../utils", () => ({
  PgConnection: {
    current: { getMinimumBalanceForRentExemption: async (len: number) => len },
  },
  PgProgramInfo: {},
  PgServer: { deploy: vi.fn() },
  PgWeb3: {
    BpfLoaderUpgradeableProgram: {
      getBufferAccountSize: (len: number) => len + 37,
      getProgramDataAccountSize: (len: number) => len + 45,
      MINIMUM_EXTEND_PROGRAM_BYTES: 100,
    },
  },
}));

const fees = (writes: number) => (writes + 3) * 5000;

beforeEach(() => {
  vi.clearAllMocks();
  Object.assign(PgProgramInfo, {
    uuid: "u",
    importedProgram: null,
    onChain: { deployed: false, programDataLen: 0 },
  });
});

describe("estimateDeployCost", () => {
  it("counts the buffer's rent and the writes of a first deploy", async () => {
    vi.mocked(PgServer.deploy).mockResolvedValue(new Uint8Array(2500));

    expect(await estimateDeployCost()).toBe(2537 + fees(3));
  });

  it("counts only a larger program data account and the fees of an upgrade", async () => {
    Object.assign(PgProgramInfo, {
      importedProgram: { bytes: new Uint8Array(2500) },
      onChain: { deployed: true, programDataLen: 2000 },
    });

    expect(await estimateDeployCost()).toBe(545 + fees(3));
    expect(PgServer.deploy).not.toHaveBeenCalled();
  });

  it("gives no estimate when the binary cannot be fetched", async () => {
    vi.mocked(PgServer.deploy).mockRejectedValue(new Error("offline"));

    expect(await estimateDeployCost()).toBeNull();
  });

  it("gives no estimate before the chain was read", async () => {
    Object.assign(PgProgramInfo, { onChain: undefined });

    expect(await estimateDeployCost()).toBeNull();
  });
});
