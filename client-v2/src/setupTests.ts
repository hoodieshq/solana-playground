// jsdom ships no Web Crypto. Browsers all do, so the app uses it directly and
// the gap is the test environment's, not the code's - polyfill rather than add
// a weaker fallback to production.
import { webcrypto } from "crypto";
import { readFileSync } from "fs";
import { createRequire } from "module";
import { TextDecoder, TextEncoder } from "util";

if (!globalThis.crypto?.subtle) {
  Object.defineProperty(globalThis, "crypto", {
    value: webcrypto,
    configurable: true,
  });
}

// Same story: standard in browsers, absent from jsdom
if (!globalThis.TextEncoder) {
  Object.assign(globalThis, { TextEncoder, TextDecoder });
}

// jsdom has no IndexedDB, and `PgFs` constructs a lightning-fs store the
// moment it is imported -- so any module that transitively reaches it fails to
// load here, not just the ones that use it. Since chat threads now live in
// `PgFs`, that is most of the assistant.
//
// `fake-indexeddb` does not help: lightning-fs throws bare `DOMException`s
// against it and takes the worker down. So the module is replaced with an
// in-memory one for every test, globally. Nothing under jsdom could use the
// real filesystem anyway; the browser round trip is covered in `e2e/`.
vi.mock("./utils/explorer/fs", async () =>
  (await import("./test-utils/mock-fs")).mockFsModule()
);

// jsdom ships no `fetch` either. Tests install their own with `vi.spyOn`,
// which needs something already on the global to replace, so the stand-in is
// a function that throws: a test that reaches the network without saying what
// it expects back is a bug, and this is how it says so rather than hanging.
// `writable` keeps the older tests that assign `global.fetch` working.
if (!globalThis.fetch) {
  Object.defineProperty(globalThis, "fetch", {
    value: () => {
      throw new Error("fetch is not stubbed in this test");
    },
    configurable: true,
    writable: true,
  });
}

// Webpack loads `.md` as raw text (`asset/source` in `craco.config.js`), and
// the tutorials and lesson paths `require` it lazily. vitest hands `require`
// straight to Node, past `vitest.config.ts`'s plugin, so Node is taught the
// same rule: a `.md` file's export is its text.
createRequire(import.meta.url).extensions[".md"] = (module, filename) => {
  module.exports = readFileSync(filename, "utf8");
};
