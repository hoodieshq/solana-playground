import { PgServerError } from "@/utils/server-error";

/** Why a binary download failed, as the user is told it */
export type DownloadFailure = "not-built" | "server";

/** What the build server says when the build's directory is gone */
const NOT_BUILT = "Program is not built";

/**
 * Classifies a failed `PgServer.deploy`. Only the server's own "not built"
 * answer asks for a rebuild; a 404 is not one, because on the public host it
 * means the route is missing and building again would not help.
 */
export const downloadFailure = (error: unknown): DownloadFailure =>
  error instanceof PgServerError &&
  error.status === 500 &&
  error.body.trim() === NOT_BUILT
    ? "not-built"
    : "server";

/** A name in the snake_case Anchor gives its program files */
const snake = (name: string) =>
  name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");

/**
 * The name the program's files go by: `<name>.so` and `<name>-keypair.json`,
 * as Anchor names them after the crate. The IDL carries it (`metadata.name`
 * since Anchor 0.30, `name` before); a project without an IDL falls back to
 * its workspace name.
 */
export const programName = (p: {
  idlName: string | null | undefined;
  workspace: string | null | undefined;
}) => snake(p.idlName ?? "") || snake(p.workspace ?? "") || "program";

if (import.meta.vitest) {
  const { describe, it, expect } = import.meta.vitest;

  describe("features/cli-deploy/model/program", () => {
    it("asks for a rebuild only on the server's 'not built' answer", () => {
      const url = "http://server.test/deploy/u";
      expect(
        downloadFailure(new PgServerError(url, 500, "Program is not built"))
      ).toBe("not-built");
      expect(downloadFailure(new PgServerError(url, 500, "disk full"))).toBe(
        "server"
      );
      expect(
        downloadFailure(new PgServerError(url, 404, "Program is not built"))
      ).toBe("server");
      expect(downloadFailure(new PgServerError(url, null, "offline"))).toBe(
        "server"
      );
      expect(downloadFailure(new Error("Program is not built"))).toBe("server");
    });

    it("names the program after the IDL, then the workspace", () => {
      expect(programName({ idlName: "hello_anchor", workspace: "X" })).toBe(
        "hello_anchor"
      );
      expect(programName({ idlName: null, workspace: "My Counter!" })).toBe(
        "my_counter"
      );
      expect(programName({ idlName: undefined, workspace: "  " })).toBe(
        "program"
      );
    });
  });
}
