import { SYNC_LOCK, timeoutSignal, withSyncLock } from "./sync-lock";

const setLocks = (locks: unknown) =>
  Object.defineProperty(navigator, "locks", {
    value: locks,
    configurable: true,
  });

afterEach(() => setLocks(undefined));

describe("withSyncLock", () => {
  it("runs directly where the browser has no Web Locks", async () => {
    setLocks(undefined);
    expect(await withSyncLock(async () => 7)).toBe(7);
  });

  it("asks for the one shared lock by name", async () => {
    const request = jest.fn((_name: string, fn: () => Promise<unknown>) =>
      fn()
    );
    setLocks({ request });

    expect(await withSyncLock(async () => "done")).toBe("done");
    expect(request).toHaveBeenCalledWith(SYNC_LOCK, expect.any(Function));
  });

  it("serializes holders, which is the whole point", async () => {
    let tail: Promise<unknown> = Promise.resolve();
    setLocks({
      request: (_name: string, fn: () => Promise<unknown>) => {
        const run = tail.then(fn);
        tail = run.catch(() => {});
        return run;
      },
    });

    const order: string[] = [];
    let release!: () => void;
    const first = withSyncLock(async () => {
      order.push("first:start");
      await new Promise<void>((done) => (release = done));
      order.push("first:end");
    });
    const second = withSyncLock(async () => {
      order.push("second");
    });
    await Promise.resolve();
    release();
    await Promise.all([first, second]);

    expect(order).toEqual(["first:start", "first:end", "second"]);
  });
});

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
    const timeout = jest.fn(() => signal);
    setTimeoutFn(timeout);

    expect(timeoutSignal(15_000)).toBe(signal);
    expect(timeout).toHaveBeenCalledWith(15_000);
  });
});
