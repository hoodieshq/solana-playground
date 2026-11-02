import type { RunResult } from "../progress";
import type { RunStage } from "../ports";
import { fundForDeploy } from "./fund";
import type { FundingChain } from "./fund";

/** The stages' labels, as the act card shows them */
export const DEPLOY_STAGES = {
  funding: "Funding your wallet",
  building: "Building",
  buffer: "Writing buffer",
  deploying: "Deploying",
  confirming: "Confirming",
} as const;

/** Lamports kept for transaction fees on top of the rent a deploy locks */
export const FEE_HEADROOM = 20_000_000;

/** What the deploy can learn about the program before it runs */
export interface ProgramState {
  /** The program id the workspace's keypair gives; null before any build */
  id: string | null;
  /** Whether a build must run first: none yet, failed, or a `buildDeploy` */
  stale: boolean;
  /** Bytes of the last build's binary, for the funding estimate; null if none */
  length: number | null;
}

/**
 * Everything the deploy touches, so its order and its facts are tested with
 * no chain. The real one (`real-deploy.ts`) wraps the editor's loader calls.
 */
export interface DeployPort {
  /** The Playground wallet's address, or null when there is none */
  wallet(): string | null;
  program(): ProgramState;
  /** Runs the build; a failure stops the deploy with its message */
  build(): Promise<{ ok: true } | { ok: false; message: string }>;
  /** The last build's binary */
  bytes(): Promise<Uint8Array>;
  /** Whether the program is on chain (an upgrade) and its data length */
  onChain(id: string): Promise<{ deployed: boolean; dataLen: number | null }>;
  /** Lamports a deploy of `length` bytes locks in rent, before fees */
  rent(
    length: number,
    onChain: { deployed: boolean; dataLen: number | null }
  ): Promise<number>;
  funding: FundingChain;
  /** The cluster's faucet amount in whole SOL */
  capSol: number;
  /** Creates the buffer and writes the binary; returns the buffer address */
  writeBuffer(bytes: Uint8Array, extendBy: number): Promise<string>;
  /** First deploy from the buffer; returns the signature */
  deploy(buffer: string, length: number): Promise<string>;
  /** Upgrade from the buffer; returns the signature */
  upgrade(buffer: string): Promise<string>;
  /** Instruction names of the IDL the build produced */
  instructions(): string[];
  /** One line in the terminal */
  print(line: string): void;
  now(): number;
}

/** The binary length a deploy estimates with before a build has run */
const DEFAULT_LENGTH = 200_000;

const shortKey = (key: string) => `${key.slice(0, 4)}…${key.slice(-4)}`;
const sol = (lamports: number) =>
  (lamports / 1_000_000_000).toFixed(lamports < 10_000_000 ? 4 : 2);

const failed = (
  act: "deploy" | "buildDeploy",
  started: number,
  now: number,
  reason: "failed" | "no_wallet",
  message: string
): RunResult => ({
  act,
  ok: false,
  seconds: (now - started) / 1000,
  reason,
  message,
});

/**
 * Deploys the workspace's program from the Playground wallet. Stages: Funding
 * your wallet (only when short), Building (only when stale), Writing buffer,
 * Deploying, Confirming; "n of m" counts what shows. A program on chain is
 * upgraded in place, since the workspace keeps its keypair. Every way it can
 * stop is a result, never a throw; a throw from the port is a failed deploy.
 */
export const runDeploy = async (
  port: DeployPort,
  act: "deploy" | "buildDeploy",
  onStage: (stage: RunStage) => void
): Promise<RunResult> => {
  const started = port.now();
  const address = port.wallet();
  if (!address) {
    return failed(act, started, port.now(), "no_wallet", "No wallet");
  }

  try {
    const program = port.program();
    const stale = act === "buildDeploy" || program.stale;
    const estimateLength = program.length ?? DEFAULT_LENGTH;
    const before = await port.funding.balance(address);
    const knownOnChain = program.id
      ? await port.onChain(program.id)
      : { deployed: false, dataLen: null };
    const estimate =
      (await port.rent(estimateLength, knownOnChain)) + FEE_HEADROOM;
    const short = before < estimate;

    const labels: string[] = [];
    if (short) labels.push(DEPLOY_STAGES.funding);
    if (stale) labels.push(DEPLOY_STAGES.building);
    labels.push(
      DEPLOY_STAGES.buffer,
      DEPLOY_STAGES.deploying,
      DEPLOY_STAGES.confirming
    );
    let index = 0;
    const stage = (label: string) =>
      onStage({ label, index: ++index, count: labels.length });

    const fund = async (need: number) => {
      const funded = await fundForDeploy({
        chain: port.funding,
        address,
        need,
        capSol: port.capSol,
        onShort: (amount) => port.print(`Airdropping ${amount} SOL...`),
      });
      if (funded.ok) return null;
      return {
        act,
        ok: false as const,
        seconds: (port.now() - started) / 1000,
        reason: "no_funds" as const,
        message: funded.message,
        balance: funded.balance,
        cost: need,
        address,
      };
    };

    if (short) {
      stage(DEPLOY_STAGES.funding);
      const refused = await fund(estimate);
      if (refused) return refused;
    }

    if (stale) {
      stage(DEPLOY_STAGES.building);
      const built = await port.build();
      if (!built.ok) {
        return failed(act, started, port.now(), "failed", built.message);
      }
    }

    const id = port.program().id;
    if (!id) {
      return failed(
        act,
        started,
        port.now(),
        "failed",
        "The build gave no program id"
      );
    }
    const bytes = await port.bytes();
    const onChain = await port.onChain(id);
    const need = (await port.rent(bytes.length, onChain)) + FEE_HEADROOM;
    // The estimate ran on the last binary; a build can grow it past what came
    if (need > estimate || !short) {
      const refused = await fund(need);
      if (refused) return refused;
    }
    const extendBy =
      onChain.deployed && onChain.dataLen !== null
        ? Math.max(0, bytes.length - onChain.dataLen)
        : 0;

    stage(DEPLOY_STAGES.buffer);
    port.print(`Deploying from ${shortKey(address)} · about ${sol(need)} SOL`);
    const funded = await port.funding.balance(address);
    const buffer = await port.writeBuffer(bytes, extendBy);

    stage(DEPLOY_STAGES.deploying);
    const signature = onChain.deployed
      ? await port.upgrade(buffer)
      : await port.deploy(buffer, bytes.length);

    stage(DEPLOY_STAGES.confirming);
    const after = await port.funding.balance(address);
    return {
      act,
      ok: true,
      seconds: (port.now() - started) / 1000,
      programId: id,
      signature,
      upgraded: onChain.deployed,
      lamports: Math.max(0, funded - after),
      instructions: port.instructions(),
    };
  } catch (e) {
    return failed(
      act,
      started,
      port.now(),
      "failed",
      e instanceof Error ? e.message : String(e)
    );
  }
};

if (import.meta.vitest) {
  const { describe, it, expect, vi } = import.meta.vitest;

  describe("features/tutorial-conversation/model/runners/deploy", () => {
    const SOL = 1_000_000_000;
    const WALLET = "Wa11et1111111111111111111111111111111111111";
    const PROGRAM = "Prog111111111111111111111111111111111111111";

    interface Fake {
      balances: number[];
      deployed: boolean;
      stale: boolean;
      id: string | null;
      airdrop?: FundingChain["airdrop"];
      build?: DeployPort["build"];
      deployThrows?: string;
    }

    /** A port over a scripted chain: balances are read in order, the last repeating */
    const portOf = (fake: Fake) => {
      const reads = [...fake.balances];
      let id = fake.id;
      const lines: string[] = [];
      const port: DeployPort = {
        wallet: () => WALLET,
        program: () => ({ id, stale: fake.stale, length: 100_000 }),
        build: vi.fn(
          fake.build ??
            (async () => {
              id = PROGRAM;
              return { ok: true as const };
            })
        ),
        bytes: async () => new Uint8Array(120_000),
        onChain: async () => ({
          deployed: fake.deployed,
          dataLen: fake.deployed ? 100_000 : null,
        }),
        rent: async (length) => length * 10_000,
        funding: {
          balance: vi.fn(async () =>
            reads.length > 1 ? reads.shift()! : reads[0]
          ),
          airdrop: vi.fn(fake.airdrop ?? (async () => "airdropSig")),
          confirm: async () => true,
        },
        capSol: 5,
        writeBuffer: vi.fn(async () => "Buffer1111"),
        deploy: vi.fn(async () => {
          if (fake.deployThrows) throw new Error(fake.deployThrows);
          return "deploySig";
        }),
        upgrade: vi.fn(async () => "upgradeSig"),
        instructions: () => ["hello"],
        print: (line) => lines.push(line),
        now: () => 1_000,
      };
      return { port, lines };
    };

    const collect = () => {
      const stages: RunStage[] = [];
      return { stages, onStage: (s: RunStage) => stages.push(s) };
    };

    it("stops before anything runs when there is no wallet", async () => {
      const { port } = portOf({
        balances: [0],
        deployed: false,
        stale: false,
        id: PROGRAM,
      });
      port.wallet = () => null;
      const { stages, onStage } = collect();
      await expect(runDeploy(port, "deploy", onStage)).resolves.toMatchObject({
        ok: false,
        reason: "no_wallet",
      });
      expect(stages).toEqual([]);
      expect(port.funding.balance).not.toHaveBeenCalled();
    });

    it("funds an empty wallet as the first of five stages, then deploys", async () => {
      // first look, funding's look, after the airdrop, the post-build check,
      // before the buffer, after the deploy
      const { port, lines } = portOf({
        balances: [0, 0, 3 * SOL, 3 * SOL, 3 * SOL, 1.7 * SOL],
        deployed: false,
        stale: true,
        id: null,
      });
      const { stages, onStage } = collect();
      const result = await runDeploy(port, "deploy", onStage);
      expect(stages.map((s) => `${s.index}/${s.count} ${s.label}`)).toEqual([
        "1/5 Funding your wallet",
        "2/5 Building",
        "3/5 Writing buffer",
        "4/5 Deploying",
        "5/5 Confirming",
      ]);
      expect(result).toEqual({
        act: "deploy",
        ok: true,
        seconds: 0,
        programId: PROGRAM,
        signature: "deploySig",
        upgraded: false,
        lamports: 1.3 * SOL,
        instructions: ["hello"],
      });
      expect(port.deploy).toHaveBeenCalledWith("Buffer1111", 120_000);
      expect(lines[0]).toMatch(/^Airdropping \d+ SOL\.\.\.$/);
      expect(lines).toContain("Deploying from Wa11…1111 · about 1.22 SOL");
    });

    it("upgrades a program on chain in place, with three stages when funded and built", async () => {
      const { port } = portOf({
        balances: [5 * SOL],
        deployed: true,
        stale: false,
        id: PROGRAM,
      });
      const { stages, onStage } = collect();
      const result = await runDeploy(port, "deploy", onStage);
      expect(stages.map((s) => s.label)).toEqual([
        "Writing buffer",
        "Deploying",
        "Confirming",
      ]);
      expect(stages.every((s) => s.count === 3)).toBe(true);
      expect(result).toMatchObject({
        ok: true,
        programId: PROGRAM,
        signature: "upgradeSig",
        upgraded: true,
      });
      expect(port.deploy).not.toHaveBeenCalled();
      // The new binary is 20 000 bytes longer than the program data
      expect(port.writeBuffer).toHaveBeenCalledWith(
        expect.any(Uint8Array),
        20_000
      );
    });

    it("builds first for a build-and-deploy even when the build is fresh", async () => {
      const { port } = portOf({
        balances: [5 * SOL],
        deployed: true,
        stale: false,
        id: PROGRAM,
      });
      const { stages, onStage } = collect();
      await runDeploy(port, "buildDeploy", onStage);
      expect(stages[0]).toEqual({ label: "Building", index: 1, count: 4 });
      expect(port.build).toHaveBeenCalledTimes(1);
    });

    it("answers a refused airdrop with no_funds, the balance, the cost and the address", async () => {
      const { port } = portOf({
        balances: [0.1 * SOL],
        deployed: false,
        stale: false,
        id: PROGRAM,
        airdrop: async () => {
          throw new Error("429 Too Many Requests");
        },
      });
      const { stages, onStage } = collect();
      await expect(runDeploy(port, "deploy", onStage)).resolves.toEqual({
        act: "deploy",
        ok: false,
        seconds: 0,
        reason: "no_funds",
        message: "429 Too Many Requests",
        balance: 0.1 * SOL,
        cost: 100_000 * 10_000 + FEE_HEADROOM,
        address: WALLET,
      });
      expect(stages.map((s) => s.label)).toEqual(["Funding your wallet"]);
      expect(port.writeBuffer).not.toHaveBeenCalled();
    });

    it("stops on a failed build with its message", async () => {
      const { port } = portOf({
        balances: [5 * SOL],
        deployed: false,
        stale: true,
        id: null,
        build: async () => ({ ok: false, message: "error[E0412]" }),
      });
      await expect(runDeploy(port, "deploy", () => {})).resolves.toMatchObject({
        ok: false,
        reason: "failed",
        message: "error[E0412]",
      });
      expect(port.writeBuffer).not.toHaveBeenCalled();
    });

    it("turns a throw from the chain into a failed deploy", async () => {
      const { port } = portOf({
        balances: [5 * SOL],
        deployed: false,
        stale: false,
        id: PROGRAM,
        deployThrows: "Exceeded maximum amount of retries",
      });
      await expect(runDeploy(port, "deploy", () => {})).resolves.toMatchObject({
        ok: false,
        reason: "failed",
        message: "Exceeded maximum amount of retries",
      });
    });
  });
}
