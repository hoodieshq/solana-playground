import {
  createTransactionSigner,
  getWalletsRegistry,
  ready,
  type WalletStandardAccount,
  type WalletStandardWallet,
} from "@solana/connector";

import { createLogger } from "@/shared/lib/logger";
import { PublicKey } from "@solana/web3.js";
import type {
  AnyTransaction,
  StandardWallet,
  StandardWalletEvents,
} from "../../../utils/wallet/types";

const log = createLogger("external-wallet:bridge");

/** The Wallet Standard features the bridge calls, as their specs declare them */
interface ConnectFeature {
  connect(): Promise<{ accounts: readonly WalletStandardAccount[] }>;
}
interface DisconnectFeature {
  disconnect(): Promise<void>;
}
interface EventsFeature {
  on(
    event: "change",
    fn: (properties: { accounts?: readonly WalletStandardAccount[] }) => void
  ): () => void;
}
interface SignMessageFeature {
  signMessage(
    ...inputs: { account: WalletStandardAccount; message: Uint8Array }[]
  ): Promise<{ signature: Uint8Array }[]>;
}

const feature = <T>(
  wallet: WalletStandardWallet,
  name: `${string}:${string}`
) => wallet.features[name] as T | undefined;

const isSolanaChain = (chain: string) => chain.startsWith("solana:");

/** A wallet the app can use: it speaks Solana and can connect */
const isSolanaWallet = (wallet: WalletStandardWallet) =>
  wallet.chains.some(isSolanaChain) && !!wallet.features["standard:connect"];

const firstSolanaAccount = (accounts: readonly WalletStandardAccount[]) =>
  accounts.find((account) => account.chains.some(isSolanaChain)) ?? null;

/** The chain hint a wallet signs with; `undefined` signs without one */
export interface SigningCluster {
  id: `solana:${string}`;
  label: string;
  url: string;
}

export interface WatchOptions {
  /** Read at each signature, so a cluster change applies to the next one */
  signingCluster: () => SigningCluster | undefined;
}

/**
 * One Wallet Standard wallet in the shape `PgWallet` reads. It connects through
 * the wallet's own `standard:connect`, not through a ConnectorKit session,
 * because the app lets several wallets be connected at once (design.md,
 * Decision 1).
 */
class BridgedWallet {
  readonly readyState = "Installed" as const;
  connecting = false;
  signTransaction?: <T extends AnyTransaction>(tx: T) => Promise<T>;
  signAllTransactions?: <T extends AnyTransaction>(txs: T[]) => Promise<T[]>;
  signMessage?: (message: Uint8Array) => Promise<Uint8Array>;

  private account: WalletStandardAccount | null = null;
  private pending: Promise<void> | null = null;
  private listeners: {
    [E in keyof StandardWalletEvents]: Set<StandardWalletEvents[E]>;
  } = { connect: new Set(), disconnect: new Set() };

  constructor(
    private readonly wallet: WalletStandardWallet,
    private readonly opts: WatchOptions
  ) {
    feature<EventsFeature>(wallet, "standard:events")?.on("change", (props) =>
      this.onChange(props.accounts)
    );

    if (wallet.features["solana:signTransaction"]) {
      this.signTransaction = async (tx) =>
        (await this.signer().signTransaction(tx)) as typeof tx;
      this.signAllTransactions = async (txs) =>
        (await this.signer().signAllTransactions(txs)) as typeof txs;
    }

    const signMessage = feature<SignMessageFeature>(
      wallet,
      "solana:signMessage"
    );
    if (signMessage) {
      this.signMessage = async (message) => {
        const [{ signature }] = await signMessage.signMessage({
          account: this.connectedAccount(),
          message,
        });
        return signature;
      };
    }
  }

  get name() {
    return this.wallet.name;
  }

  get icon() {
    return this.wallet.icon;
  }

  get connected() {
    return !!this.account;
  }

  get publicKey() {
    return this.account ? new PublicKey(this.account.publicKey) : null;
  }

  /** Asks the wallet once; a second call while it asks waits on the same answer */
  connect() {
    if (this.account) return Promise.resolve();
    this.pending ??= this.requestConnect().finally(() => {
      this.pending = null;
      this.connecting = false;
    });
    return this.pending;
  }

  async disconnect() {
    await feature<DisconnectFeature>(
      this.wallet,
      "standard:disconnect"
    )?.disconnect();
    this.setAccount(null);
  }

  on<E extends keyof StandardWalletEvents>(
    event: E,
    fn: StandardWalletEvents[E]
  ) {
    this.listeners[event].add(fn);
  }

  off<E extends keyof StandardWalletEvents>(
    event: E,
    fn: StandardWalletEvents[E]
  ) {
    this.listeners[event].delete(fn);
  }

  private async requestConnect() {
    this.connecting = true;
    const connect = feature<ConnectFeature>(this.wallet, "standard:connect");
    if (!connect) throw new Error(`${this.name} cannot connect`);
    const { accounts } = await connect.connect();
    const account = firstSolanaAccount(accounts);
    if (!account) throw new Error(`${this.name} has no Solana account`);
    this.setAccount(account);
  }

  /** The wallet reported new accounts: a switch inside it, or a revoke */
  private onChange(accounts: readonly WalletStandardAccount[] | undefined) {
    // Only a connected wallet follows its accounts; a wallet that reports
    // accounts unasked has not been approved by this app
    if (!accounts || !this.account) return;
    const next = firstSolanaAccount(accounts);
    if (next?.address === this.account.address) return;
    this.setAccount(next);
  }

  private setAccount(account: WalletStandardAccount | null) {
    const was = this.account;
    this.account = account;
    if (account) this.listeners.connect.forEach((fn) => fn());
    else if (was) this.listeners.disconnect.forEach((fn) => fn());
  }

  private connectedAccount() {
    if (!this.account) throw new Error(`${this.name} is not connected`);
    return this.account;
  }

  private signer() {
    const signer = createTransactionSigner({
      wallet: this.wallet,
      account: this.connectedAccount(),
      cluster: this.opts.signingCluster(),
    });
    if (!signer) throw new Error(`${this.name} cannot sign transactions`);
    return signer;
  }
}

/** One bridged object per wallet, so listeners on it survive a new list */
const bridged = new WeakMap<WalletStandardWallet, BridgedWallet>();

const bridge = (wallet: WalletStandardWallet, opts: WatchOptions) => {
  let found = bridged.get(wallet);
  if (!found) {
    found = new BridgedWallet(wallet, opts);
    bridged.set(wallet, found);
  }
  return found as unknown as StandardWallet;
};

/**
 * Call `onChange` with every installed Solana wallet now, once ConnectorKit's
 * registry is ready, and whenever a wallet registers or unregisters.
 *
 * @returns a function that stops watching
 */
export const watchExternalWallets = (
  onChange: (wallets: StandardWallet[]) => void,
  opts: WatchOptions
): (() => void) => {
  const registry = getWalletsRegistry();
  let stopped = false;
  const publish = () => {
    if (stopped) return;
    onChange(
      registry
        .get()
        .filter(isSolanaWallet)
        .map((w) => bridge(w, opts))
    );
  };

  publish();
  ready.then(publish).catch((error: unknown) => {
    log.error(error, { report: true, context: { step: "registry ready" } });
  });
  const offRegister = registry.on("register", publish);
  const offUnregister = registry.on("unregister", publish);

  return () => {
    stopped = true;
    offRegister();
    offUnregister();
  };
};

if (import.meta.vitest) {
  const { describe, it, expect, beforeAll, afterEach } = import.meta.vitest;

  describe("entities/external-wallet/model/bridge", () => {
    let registerFakeWallet: typeof import("../../../test-utils/fake-wallet").registerFakeWallet;
    let FAKE_REJECTION: typeof import("../../../test-utils/fake-wallet").FAKE_REJECTION;
    let Keypair: typeof import("@solana/web3.js").Keypair;
    type FakeWallet = import("../../../test-utils/fake-wallet").FakeWallet;

    const fakes: FakeWallet[] = [];
    const disposers: (() => void)[] = [];

    beforeAll(async () => {
      ({ registerFakeWallet, FAKE_REJECTION } = await import(
        "../../../test-utils/fake-wallet"
      ));
      ({ Keypair } = await import("@solana/web3.js"));
    });

    afterEach(() => {
      fakes.splice(0).forEach((f) => f.unregister());
      disposers.splice(0).forEach((d) => d());
    });

    const fake = (opts: Parameters<typeof registerFakeWallet>[0]) => {
      const f = registerFakeWallet(opts);
      fakes.push(f);
      return f;
    };

    /** The latest list the bridge published */
    const watch = () => {
      const seen: { latest: StandardWallet[] } = { latest: [] };
      disposers.push(
        watchExternalWallets(
          (wallets) => {
            seen.latest = wallets;
          },
          { signingCluster: () => undefined }
        )
      );
      return seen;
    };

    const named = (seen: { latest: StandardWallet[] }, name: string) => {
      const wallet = seen.latest.find((w) => w.name === name);
      if (!wallet) throw new Error(`${name} not listed`);
      return wallet;
    };

    const settle = () => new Promise((r) => setTimeout(r, 0));

    it("lists a Solana wallet with its name and icon", async () => {
      fake({ name: "Phantom", accounts: [Keypair.generate()] });
      const seen = watch();
      await settle();

      const phantom = named(seen, "Phantom");
      expect(phantom.icon).toMatch(/^data:image\//);
      expect(phantom.readyState).toBe("Installed");
      expect(phantom.connected).toBe(false);
      expect(phantom.publicKey).toBeNull();
    });

    it("lists a wallet registered after the first list", async () => {
      const seen = watch();
      await settle();
      fake({ name: "Late", accounts: [Keypair.generate()] });

      expect(seen.latest.map((w) => w.name)).toContain("Late");
    });

    it("does not list a wallet without a solana chain", async () => {
      fake({ name: "EvmOnly", chains: ["eip155:1"], accounts: [] });
      const seen = watch();
      await settle();

      expect(seen.latest.map((w) => w.name)).not.toContain("EvmOnly");
    });

    it("drops a wallet that unregisters", async () => {
      const gone = registerFakeWallet({
        name: "Gone",
        accounts: [Keypair.generate()],
      });
      const seen = watch();
      await settle();
      gone.unregister();

      expect(seen.latest.map((w) => w.name)).not.toContain("Gone");
    });

    it("connects, then reports connected with the first account's public key", async () => {
      const kp = Keypair.generate();
      fake({ name: "Phantom", accounts: [kp] });
      const seen = watch();
      await settle();
      const phantom = named(seen, "Phantom");
      let connectEvents = 0;
      phantom.on("connect", () => connectEvents++);

      await phantom.connect();

      expect(phantom.connected).toBe(true);
      expect(phantom.connecting).toBe(false);
      expect(phantom.publicKey?.toBase58()).toBe(kp.publicKey.toBase58());
      expect(connectEvents).toBe(1);
    });

    it("rejects connect when the wallet declines, and is no longer connecting", async () => {
      fake({
        name: "Phantom",
        accounts: [Keypair.generate()],
        reject: "connect",
      });
      const seen = watch();
      await settle();
      const phantom = named(seen, "Phantom");

      await expect(phantom.connect()).rejects.toThrow(FAKE_REJECTION);

      expect(phantom.connected).toBe(false);
      expect(phantom.connecting).toBe(false);
    });

    it("shares one connect while a connect is in flight", async () => {
      const f = fake({ name: "Phantom", accounts: [Keypair.generate()] });
      const seen = watch();
      await settle();
      const phantom = named(seen, "Phantom");

      await Promise.all([phantom.connect(), phantom.connect()]);

      expect(f.connectCalls()).toBe(1);
    });

    it("fires connect and changes publicKey when the account switches", async () => {
      const first = Keypair.generate();
      const second = Keypair.generate();
      const f = fake({ name: "Phantom", accounts: [first, second] });
      const seen = watch();
      await settle();
      const phantom = named(seen, "Phantom");
      await phantom.connect();
      let connectEvents = 0;
      phantom.on("connect", () => connectEvents++);

      f.switchAccount(1);

      expect(phantom.publicKey?.toBase58()).toBe(second.publicKey.toBase58());
      expect(connectEvents).toBe(1);
    });

    it("disconnects when the wallet drops every account", async () => {
      const f = fake({ name: "Phantom", accounts: [Keypair.generate()] });
      const seen = watch();
      await settle();
      const phantom = named(seen, "Phantom");
      await phantom.connect();
      let disconnectEvents = 0;
      phantom.on("disconnect", () => disconnectEvents++);

      f.revokeAll();

      expect(phantom.connected).toBe(false);
      expect(phantom.publicKey).toBeNull();
      expect(disconnectEvents).toBe(1);
    });

    it("disconnects and fires disconnect", async () => {
      fake({ name: "Phantom", accounts: [Keypair.generate()] });
      const seen = watch();
      await settle();
      const phantom = named(seen, "Phantom");
      await phantom.connect();
      let disconnectEvents = 0;
      phantom.on("disconnect", () => disconnectEvents++);

      await phantom.disconnect();

      expect(phantom.connected).toBe(false);
      expect(disconnectEvents).toBe(1);
    });

    it("connecting a second wallet leaves the first connected", async () => {
      fake({ name: "Phantom", accounts: [Keypair.generate()] });
      fake({ name: "Solflare", accounts: [Keypair.generate()] });
      const seen = watch();
      await settle();

      await named(seen, "Phantom").connect();
      await named(seen, "Solflare").connect();

      expect(named(seen, "Phantom").connected).toBe(true);
      expect(named(seen, "Solflare").connected).toBe(true);
    });

    it("keeps the same object for a wallet across lists", async () => {
      fake({ name: "Phantom", accounts: [Keypair.generate()] });
      const seen = watch();
      await settle();
      const before = named(seen, "Phantom");
      fake({ name: "Other", accounts: [Keypair.generate()] });

      expect(named(seen, "Phantom")).toBe(before);
    });

    it("offers no transaction signing when the wallet cannot sign", async () => {
      fake({
        name: "WatchOnly",
        accounts: [Keypair.generate()],
        withoutSigning: true,
      });
      const seen = watch();
      await settle();

      expect(named(seen, "WatchOnly").signTransaction).toBeUndefined();
    });
  });
}
