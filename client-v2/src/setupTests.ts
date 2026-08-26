// jsdom ships no Web Crypto. Browsers all do, so the app uses it directly and
// the gap is the test environment's, not the code's - polyfill rather than add
// a weaker fallback to production.
import { webcrypto } from "crypto";
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
