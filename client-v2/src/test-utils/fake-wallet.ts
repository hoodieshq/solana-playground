import { Keypair, VersionedTransaction } from "@solana/web3.js";
import * as ed25519 from "@noble/ed25519";

/**
 * A Wallet Standard wallet for tests under jsdom, registered the way an
 * extension registers itself: by dispatching `wallet-standard:register-wallet`.
 * It holds real keypairs, so what it signs verifies.
 *
 * The browser tests in `e2e/` inject their own copy into the page
 * (`e2e/helpers/fake-wallet.ts`); this one cannot cross into a page.
 */

type Listener = (properties: { accounts?: readonly FakeAccount[] }) => void;

interface FakeAccount {
  address: string;
  publicKey: Uint8Array;
  chains: readonly `${string}:${string}`[];
  features: readonly `${string}:${string}`[];
}

export interface FakeWalletOptions {
  name: string;
  /** Defaults to devnet and mainnet */
  chains?: readonly `${string}:${string}`[];
  accounts: Keypair[];
  /** Answer that request with a rejection, as a user pressing "Cancel" does */
  reject?: "connect" | "sign";
  /** Leave out `solana:signTransaction`, as a watch-only wallet does */
  withoutSigning?: boolean;
}

export interface FakeWallet {
  /** How many times `standard:connect` was asked */
  connectCalls(): number;
  /** Change the selected account inside the "extension" */
  switchAccount(index: number): void;
  /** Disconnect from inside the "extension" */
  revokeAll(): void;
  unregister(): void;
}

/** The message a wallet rejects with, as Phantom's `UserRejectedRequestError` */
export const FAKE_REJECTION = "User rejected the request.";

export const registerFakeWallet = (opts: FakeWalletOptions): FakeWallet => {
  const chains = opts.chains ?? ["solana:devnet", "solana:mainnet"];
  const features = ["solana:signTransaction", "solana:signMessage"] as const;
  const toAccount = (kp: Keypair): FakeAccount => ({
    address: kp.publicKey.toBase58(),
    publicKey: kp.publicKey.toBytes(),
    chains,
    features,
  });

  let selected = 0;
  let accounts: FakeAccount[] = [];
  let connects = 0;
  const listeners = new Set<Listener>();
  const emit = () => listeners.forEach((fn) => fn({ accounts }));
  const keypairOf = (address: string) => {
    const kp = opts.accounts.find((a) => a.publicKey.toBase58() === address);
    if (!kp) throw new Error(`Unknown account ${address}`);
    return kp;
  };

  const wallet = {
    version: "1.0.0" as const,
    name: opts.name,
    icon: "data:image/svg+xml;base64,PHN2Zy8+" as const,
    chains,
    get accounts() {
      return accounts;
    },
    features: {
      "standard:connect": {
        version: "1.0.0",
        connect: async () => {
          connects++;
          if (opts.reject === "connect") throw new Error(FAKE_REJECTION);
          accounts = [toAccount(opts.accounts[selected])];
          emit();
          return { accounts };
        },
      },
      "standard:disconnect": {
        version: "1.0.0",
        disconnect: async () => {
          accounts = [];
          emit();
        },
      },
      "standard:events": {
        version: "1.0.0",
        on: (_event: "change", fn: Listener) => {
          listeners.add(fn);
          return () => listeners.delete(fn);
        },
      },
      ...(opts.withoutSigning
        ? {}
        : {
            "solana:signTransaction": {
              version: "1.0.0",
              supportedTransactionVersions: ["legacy", 0],
              signTransaction: async (
                ...inputs: { account: FakeAccount; transaction: Uint8Array }[]
              ) => {
                if (opts.reject === "sign") throw new Error(FAKE_REJECTION);
                return inputs.map(({ account, transaction }) => {
                  const tx = VersionedTransaction.deserialize(transaction);
                  tx.sign([keypairOf(account.address)]);
                  return { signedTransaction: tx.serialize() };
                });
              },
            },
          }),
      "solana:signMessage": {
        version: "1.0.0",
        signMessage: async (
          ...inputs: { account: FakeAccount; message: Uint8Array }[]
        ) => {
          if (opts.reject === "sign") throw new Error(FAKE_REJECTION);
          return Promise.all(
            inputs.map(async ({ account, message }) => ({
              signedMessage: message,
              signature: await ed25519.sign(
                message,
                keypairOf(account.address).secretKey.slice(0, 32)
              ),
            }))
          );
        },
      },
    },
  };

  let unregister: () => void = () => undefined;
  window.dispatchEvent(
    new CustomEvent("wallet-standard:register-wallet", {
      detail: ({ register }: { register: (w: unknown) => () => void }) => {
        unregister = register(wallet);
      },
    })
  );

  return {
    connectCalls: () => connects,
    switchAccount: (index) => {
      selected = index;
      if (!accounts.length) return;
      accounts = [toAccount(opts.accounts[index])];
      emit();
    },
    revokeAll: () => {
      accounts = [];
      emit();
    },
    unregister: () => unregister(),
  };
};
