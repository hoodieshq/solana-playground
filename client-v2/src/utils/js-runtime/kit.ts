import type { CompilerOptions } from "typescript";
import { ScriptTarget } from "typescript";

/**
 * How scripts are transpiled. ES2020, not ES5: ES5 turns `for...of` over a
 * `Map` or `Set` into an index loop that reads `.length` and silently runs
 * zero times, and Kit's own examples iterate maps.
 */
export const TRANSPILE_OPTIONS: CompilerOptions = {
  target: ScriptTarget.ES2020,
  removeComments: true,
};

/** Globals a script must not reach, hidden behind parameters of its wrapper */
const HIDDEN_GLOBALS = ["eval", "Function"];

/**
 * Wrap a script so that it:
 * - runs inside a class method, so `this` never reaches the window;
 * - may use top-level `await`;
 * - reports an uncaught error through `__fail`, then ends with `endCode`.
 *
 * `eval` and `Function` are shadowed by the outer function's parameters.
 * The blacklist used to assign `undefined` to them inside the method, and
 * assigning to `eval` there is a syntax error: a class body is strict code,
 * and ES5 output only hid that by turning the class into a plain function.
 *
 * @param code the script, imports already taken out
 * @param endCode what signals the end of the run
 * @returns the code to transpile
 */
export const wrapScript = (
  code: string,
  endCode: string
) => `(async function (${HIDDEN_GLOBALS.join(", ")}) {
  class __Pg { async __run() {\n${code}\n} }
  const __pg = new __Pg();
  try { await __pg.__run(); }
  catch (e) { __fail(String(e?.message ?? e)); console.log("Uncaught error:", e?.message ?? e); }
  finally { ${endCode} }
})()`;

/**
 * Write BigInt arguments as Node's console does (`2000n`): the browser's
 * `util.format` prints them as `{}`, and Kit returns every amount as one.
 *
 * @param args what the script logged
 * @returns the arguments to format
 */
export const showBigInts = (args: unknown[]) =>
  args.map((arg) => (typeof arg === "bigint" ? `${arg}n` : arg));

/**
 * The message of whatever a script rejected with. Read by shape, not by
 * `instanceof Error`: an error built inside the iframe has the iframe's own
 * `Error`, which the page's does not match.
 *
 * @param reason the rejection's reason: an error, a string, anything
 * @returns its message, or its text
 */
export const reasonMessage = (reason: unknown): string => {
  const message = (reason as { message?: unknown } | undefined)?.message;
  if (typeof message === "string") return message;
  try {
    return String(reason);
  } catch {
    // An object with no prototype has no `toString` to call
    return "a value that cannot be printed";
  }
};

/** What `signerFromFile` says when the current wallet has no keypair to read */
export const SIGNER_NEEDS_PG_WALLET =
  "signerFromFile uses your Playground wallet. Switch to it to run this script.";

/** The parts of the current wallet `pgSignerFromFile` reads */
type WalletLike =
  | { isPg: true; keypair: { secretKey: Uint8Array } }
  | { isPg?: false }
  | null;

/** What `pgSignerFromFile` needs from Kit, passed in to keep Kit lazy */
interface KitSignerDeps {
  createKeyPairSignerFromBytes: (bytes: Uint8Array) => Promise<any>;
  signer: (signer: any) => (client: any) => any;
}

/** A Kit client plugin: takes the client, resolves to it with more on it */
type KitPlugin = <T extends object>(client: T) => Promise<any>;

/**
 * Replace `@solana/kit-plugin-signer`'s `signerFromFile`, which reads a
 * keypair file from disk, with one that uses the Playground wallet: a docs
 * script's `wallet.json` is the wallet the user already has here.
 *
 * @param getWallet the current wallet
 * @param deps Kit's signer factory and the plugin's `signer`
 * @returns a `signerFromFile` that ignores its path
 */
export const pgSignerFromFile =
  (
    getWallet: () => WalletLike,
    deps: KitSignerDeps
  ): ((path: string) => KitPlugin) =>
  // The path the docs pass is their file name; Playground has one wallet
  () =>
  async <T extends object>(client: T) => {
    const wallet = getWallet();
    if (!wallet?.isPg) throw new Error(SIGNER_NEEDS_PG_WALLET);

    const kitSigner = await deps.createKeyPairSignerFromBytes(
      Uint8Array.from(wallet.keypair.secretKey)
    );
    return deps.signer(kitSigner)(client);
  };
