// @vitest-environment node
// Signing builds web3.js transactions, whose byte checks fail under jsdom
// (its `Uint8Array` is another realm's), so these run in node with the one
// browser global Wallet Standard registration needs. The rest of the bridge's
// tests are in-source, under jsdom.
import { afterEach, beforeAll, describe, expect, it } from "vitest";
import * as ed25519 from "@noble/ed25519";
import { Keypair, SystemProgram, Transaction } from "@solana/web3.js";

import type { StandardWallet } from "../../../utils/wallet/types";

type Bridge = typeof import("./bridge");
type Fakes = typeof import("../../../test-utils/fake-wallet");

describe("entities/external-wallet/model/bridge signing", () => {
  let bridge: Bridge;
  let fakes: Fakes;
  const cleanup: (() => void)[] = [];

  beforeAll(async () => {
    Object.assign(globalThis, {
      window: Object.assign(new EventTarget(), { navigator: {} }),
    });
    bridge = await import("./bridge");
    fakes = await import("../../../test-utils/fake-wallet");
  });

  afterEach(() => cleanup.splice(0).forEach((fn) => fn()));

  /** A connected bridged wallet holding `kp` */
  const connected = async (kp: Keypair) => {
    const fake = fakes.registerFakeWallet({ name: "Phantom", accounts: [kp] });
    cleanup.push(() => fake.unregister());
    const seen: { latest: StandardWallet[] } = { latest: [] };
    cleanup.push(
      bridge.watchExternalWallets(
        (wallets) => {
          seen.latest = wallets;
        },
        { signingCluster: () => undefined }
      )
    );
    const wallet = seen.latest.find((w) => w.name === "Phantom");
    if (!wallet) throw new Error("Phantom not listed");
    await wallet.connect();
    return wallet;
  };

  it("signs a web3.js Transaction with the selected account", async () => {
    const kp = Keypair.generate();
    const wallet = await connected(kp);
    const tx = new Transaction({
      feePayer: kp.publicKey,
      recentBlockhash: Keypair.generate().publicKey.toBase58(),
    }).add(
      SystemProgram.transfer({
        fromPubkey: kp.publicKey,
        toPubkey: Keypair.generate().publicKey,
        lamports: 1,
      })
    );

    const signed = await wallet.signTransaction!(tx);

    expect(signed).toBeInstanceOf(Transaction);
    expect(signed.verifySignatures()).toBe(true);
  });

  it("signs a message that verifies against the account", async () => {
    const kp = Keypair.generate();
    const wallet = await connected(kp);
    const message = new TextEncoder().encode("hello");

    const signature = await wallet.signMessage!(message);

    expect(
      await ed25519.verify(signature, message, kp.publicKey.toBytes())
    ).toBe(true);
  });

  it("rejects signing when the wallet declines", async () => {
    const kp = Keypair.generate();
    const fake = fakes.registerFakeWallet({
      name: "Declines",
      accounts: [kp],
      reject: "sign",
    });
    cleanup.push(() => fake.unregister());
    const seen: { latest: StandardWallet[] } = { latest: [] };
    cleanup.push(
      bridge.watchExternalWallets(
        (wallets) => {
          seen.latest = wallets;
        },
        { signingCluster: () => undefined }
      )
    );
    const wallet = seen.latest.find((w) => w.name === "Declines")!;
    await wallet.connect();

    await expect(
      wallet.signMessage!(new TextEncoder().encode("x"))
    ).rejects.toThrow(fakes.FAKE_REJECTION);
  });
});
