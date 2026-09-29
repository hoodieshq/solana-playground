import { improveOutput } from "../build";

jest.mock("../../../utils", () => ({
  PgExplorer: { currentWorkspaceName: "my-program" },
  PgProgramInfo: { uuid: "a1b2c3d4" },
  PgSettings: { build: { improveErrors: false } },
  PgTerminal: { success: (text: string) => `<ok>${text}</ok>` },
}));

describe("improveOutput", () => {
  it("should turn the cargo finish line into a success line with the elapsed time", () => {
    const stderr = [
      "   Compiling solpg v0.1.0 (/home/pg/programs/a1b2c3d4)",
      "    Finished release [optimized] target(s) in 1.23s",
      "",
    ].join("\n");

    expect(improveOutput(stderr)).toBe(
      "\n<ok>Build successful. </ok>Completed in 1.23s."
    );
  });

  it("should strip the program path, the rustc hint line, and the solpg name from a failed build", () => {
    const stderr = [
      "   Compiling solpg v0.1.0 (/home/pg/programs/a1b2c3d4)",
      "error[E0425]: cannot find value `x` in this scope",
      " --> /home/pg/programs/a1b2c3d4/src/lib.rs:7:1",
      "  |",
      "7 |     x",
      "  |     ^ not found in this scope",
      "",
      "For more information about this error, try `rustc --explain E0425`.",
      "error: could not compile `solpg` due to previous error",
      "",
    ].join("\n");

    expect(improveOutput(stderr)).toBe(
      [
        "",
        "error[E0425]: cannot find value `x` in this scope",
        " --> src/lib.rs:7:1",
        "  |",
        "7 |     x",
        "  |     ^ not found in this scope",
        "",
        "error: could not compile `my-program` due to previous error",
      ].join("\n")
    );
  });
});
