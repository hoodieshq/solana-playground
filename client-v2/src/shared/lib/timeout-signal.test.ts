import { timeoutSignal } from "./timeout-signal";

describe("timeoutSignal", () => {
  const original = Object.getOwnPropertyDescriptor(AbortSignal, "timeout");
  const setTimeoutFn = (value: unknown) =>
    Object.defineProperty(AbortSignal, "timeout", {
      value,
      configurable: true,
      writable: true,
    });

  afterEach(() => {
    if (original) Object.defineProperty(AbortSignal, "timeout", original);
    else delete (AbortSignal as { timeout?: unknown }).timeout;
  });

  it("is undefined where the browser cannot make one", () => {
    setTimeoutFn(undefined);
    expect(timeoutSignal(15_000)).toBeUndefined();
  });

  it("asks the browser for a signal that times out", () => {
    const signal = new AbortController().signal;
    const timeout = vi.fn(() => signal);
    setTimeoutFn(timeout);

    expect(timeoutSignal(15_000)).toBe(signal);
    expect(timeout).toHaveBeenCalledWith(15_000);
  });
});
