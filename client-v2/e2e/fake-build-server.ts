import type { Page } from "@playwright/test";

import { PLANNED } from "../src/features/tutorial-conversation/model/build-logs.fixture";

/**
 * The build server for the tutorial specs, answered in the test. A build of
 * Hello Anchor's `lib.rs` fails with the server's real E0412 log while the
 * file has no `struct Hello`, as the step plans, and passes otherwise with an
 * Anchor IDL read off `lib.rs`: `hello`, with a `name: string` argument once
 * its signature takes one. A deploy downloads a few KB of program bytes.
 */
export interface FakeBuildServer {
  /** The `lib.rs` of every build, in order */
  readonly builds: string[];
}

const UUID = "e2e00000-0000-4000-8000-000000000001";
/** Small, so a deploy writes three buffer chunks; the app checks no ELF */
const PROGRAM_BYTES = Buffer.alloc(2600, 7);

const PASSED =
  "   Compiling solpg v0.1.0 (/home/solpg/programs)\n    Finished release [optimized] target(s) in 3.92s\n";

/** Anchor 0.29's IDL of the `hello` that `lib` declares */
const idlOf = (lib: string) => ({
  version: "0.1.0",
  name: "hello_anchor",
  instructions: [
    {
      name: "hello",
      accounts: [],
      args: /fn hello\([^)]*name: String/.test(lib)
        ? [{ name: "name", type: "string" }]
        : [],
    },
  ],
});

export const fakeBuildServer = async (page: Page): Promise<FakeBuildServer> => {
  const builds: string[] = [];
  await page.route("**/build", async (route) => {
    const body = route.request().postDataJSON() as {
      files: [string, string][];
    };
    const lib = body.files.find(([path]) => path.endsWith("src/lib.rs"))?.[1];
    builds.push(lib ?? "");
    const compiles = lib !== undefined && /struct Hello\b/.test(lib);
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify(
        compiles
          ? { stderr: PASSED, uuid: UUID, idl: idlOf(lib) }
          : // eslint-disable-next-line unicorn/no-null -- the server's JSON for a failed build
            { stderr: PLANNED, uuid: null, idl: null }
      ),
    });
  });
  await page.route(`**/deploy/${UUID}`, (route) =>
    route.fulfill({
      contentType: "application/octet-stream",
      body: PROGRAM_BYTES,
    })
  );
  return { builds };
};
