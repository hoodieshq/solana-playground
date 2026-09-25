import type { TupleFiles } from "../../../utils/explorer/types";

/*
 * Every sample's files, in the Anchor template's layout
 * (`frameworks/anchor/files`): the program, a client that exercises it, and
 * its tests.
 *
 * A module of its own so it can be loaded on demand, in one chunk: only a
 * browser that is actually getting samples needs any of this.
 */

export const counter: TupleFiles = [
  ["src/lib.rs", require("./counter/src/lib.rs")],
  ["client/client.ts", require("./counter/client/client.ts.raw")],
  ["tests/anchor.test.ts", require("./counter/tests/anchor.test.ts.raw")],
];

export const tokenFaucet: TupleFiles = [
  ["src/lib.rs", require("./token-faucet/src/lib.rs")],
  ["client/client.ts", require("./token-faucet/client/client.ts.raw")],
  ["tests/anchor.test.ts", require("./token-faucet/tests/anchor.test.ts.raw")],
];

export const voting: TupleFiles = [
  ["src/lib.rs", require("./voting/src/lib.rs")],
  ["client/client.ts", require("./voting/client/client.ts.raw")],
  ["tests/anchor.test.ts", require("./voting/tests/anchor.test.ts.raw")],
];

export const tipJar: TupleFiles = [
  ["src/lib.rs", require("./tip-jar/src/lib.rs")],
  ["client/client.ts", require("./tip-jar/client/client.ts.raw")],
  ["tests/anchor.test.ts", require("./tip-jar/tests/anchor.test.ts.raw")],
];
