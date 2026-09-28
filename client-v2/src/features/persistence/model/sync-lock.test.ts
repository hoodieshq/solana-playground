import { SYNC_LOCK, withSyncLock } from "./sync-lock";

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
