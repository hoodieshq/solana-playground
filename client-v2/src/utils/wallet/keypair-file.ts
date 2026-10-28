import { PgWeb3 } from "../web3";

/** A chosen file that does not hold a keypair; its message is for the user */
export class KeypairFileError extends Error {
  constructor() {
    super(
      "That file is not a keypair. Choose a keypair file: a JSON array of 64 numbers."
    );
    this.name = "KeypairFileError";
  }
}

/**
 * Read a keypair file's text, the format `solana-keygen` writes.
 *
 * @throws `KeypairFileError` for anything else
 */
export const parseKeypairFile = (text: string): PgWeb3.Keypair => {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new KeypairFileError();
  }
  if (!Array.isArray(parsed) || parsed.length !== 64) {
    throw new KeypairFileError();
  }
  try {
    // Checks that the second half is the first half's public key
    return PgWeb3.Keypair.fromSecretKey(Uint8Array.from(parsed));
  } catch {
    throw new KeypairFileError();
  }
};

if (import.meta.vitest) {
  const { describe, expect, it } = import.meta.vitest;

  describe("utils/wallet/keypair-file", () => {
    it("parseKeypairFile reads a keypair file", () => {
      const keypair = PgWeb3.Keypair.generate();
      const text = JSON.stringify(Array.from(keypair.secretKey));
      expect(parseKeypairFile(text).publicKey.equals(keypair.publicKey)).toBe(
        true
      );
    });

    it.each([
      ["text that is not JSON", "hello"],
      ["JSON that is not an array", '{"key":"value"}'],
      ["an array of the wrong length", "[1,2,3]"],
      ["64 bytes that are not a keypair", JSON.stringify(Array(64).fill(1))],
    ])("parseKeypairFile rejects %s with a message for the user", (_, text) => {
      expect(() => parseKeypairFile(text)).toThrow(KeypairFileError);
      expect(() => parseKeypairFile(text)).toThrow(/not a keypair/);
    });
  });
}
