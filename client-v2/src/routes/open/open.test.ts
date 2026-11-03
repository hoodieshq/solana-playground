// `@types/mocha` also declares a global `it`, without `each`
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  initTelemetry,
  memoryProvider,
  resetTelemetry,
} from "@/shared/lib/telemetry";
import { encodeDocsLink, PgDocsLink } from "@/features/docs-link";

const common = vi.hoisted(() => ({
  handleRoute: vi.fn(() => ({ dispose: () => {} })),
}));
vi.mock("../common", () => common);
vi.mock("../../utils", () => ({
  PgRouter: { create: <T>(route: T) => route, navigate: vi.fn() },
  PgExplorer: { PATHS: { CLIENT_DIRNAME: "client" } },
}));

import { open } from "./open";

const QUICKSTART = {
  name: "quickstart.ts",
  code: 'console.log("Step 1: Check a balance");',
  title: "Quickstart",
  from: "https://solana.com/docs/quickstart",
  sol: 0.02,
};

let sent: ReturnType<typeof memoryProvider>;

/** Routes a test opened, closed after it so no listener outlives it */
const opened: Array<{ dispose: () => void }> = [];

const visit = (fragment: string) => {
  window.location.hash = fragment;
  // The route reads the fragment, not its path parameters, and answers
  // synchronously with its disposable
  const route = open.handle({} as never) as { dispose: () => void };
  opened.push(route);
  return route;
};

/** What the route asked `handleRoute` for */
const routeArg = () =>
  (
    common.handleRoute.mock.calls.at(-1) as unknown as [
      {
        getExplorerInitArg?: () => { files: [string, string][] };
        main?: () => Promise<unknown>;
      }
    ]
  )[0];

beforeEach(() => {
  sent = memoryProvider();
  initTelemetry({ providers: [sent] });
  common.handleRoute.mockClear();
});

afterEach(() => {
  opened.splice(0).forEach((route) => route.dispose());
  resetTelemetry();
  PgDocsLink.set(null);
  window.location.hash = "";
});

describe("/open", () => {
  it("opens the link's file as a client project", () => {
    visit(encodeDocsLink(QUICKSTART));

    const { files } = routeArg().getExplorerInitArg!();
    expect(files).toEqual([["client/quickstart.ts", QUICKSTART.code]]);
    expect(PgDocsLink.opened).toEqual(QUICKSTART);
    expect(sent.events).toEqual([
      {
        name: "docs_link_opened",
        params: { host: "solana.com", bytes: QUICKSTART.code.length },
      },
    ]);
  });

  it("shows a broken link instead of opening anything", () => {
    visit("v=1&name=a.ts");

    expect(routeArg().getExplorerInitArg).toBeUndefined();
    expect(routeArg().main).toBeInstanceOf(Function);
    expect(PgDocsLink.opened).toBeNull();
    expect(PgDocsLink.broken).toBe(true);
    expect(sent.events).toEqual([
      { name: "docs_link_failed", params: { reason: "missing" } },
    ]);
  });

  it("clears the broken state once another route takes over", () => {
    const route = visit("v=1&name=a.ts");
    route.dispose();
    expect(PgDocsLink.broken).toBe(false);
  });

  it("names no host for a link without a source", () => {
    visit(
      encodeDocsLink({
        name: "hello.ts",
        code: "console.log(1)",
        from: null,
        sol: null,
      })
    );
    routeArg().getExplorerInitArg!();
    expect(sent.events.at(-1)?.params).toMatchObject({ host: "none" });
  });

  it("reloads when a new link replaces the fragment", () => {
    const reload = vi.fn();
    vi.spyOn(window, "location", "get").mockReturnValue({
      hash: `#${encodeDocsLink(QUICKSTART)}`,
      reload,
    } as unknown as Location);
    const route = open.handle({} as never) as { dispose: () => void };

    window.dispatchEvent(new HashChangeEvent("hashchange"));
    route.dispose();
    window.dispatchEvent(new HashChangeEvent("hashchange"));

    expect(reload).toHaveBeenCalledTimes(1);
    vi.restoreAllMocks();
  });

  it("forgets the link once another route takes over", () => {
    const route = visit(encodeDocsLink(QUICKSTART));
    routeArg().getExplorerInitArg!();

    route.dispose();

    expect(PgDocsLink.opened).toBeNull();
  });
});
