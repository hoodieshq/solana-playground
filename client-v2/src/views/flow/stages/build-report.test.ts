import { parseBuildReport } from "./build-report";

const STDERR = `Compiling hello v0.1.0
error[E0308]: mismatched types
  --> src/lib.rs:12:18
   |
12 |         let x: u64 = "1";
   |                ---   ^^^ expected \`u64\`, found \`&str\`
   |                |
   |                expected due to this

error: could not compile \`hello\` due to previous error`;

describe("parseBuildReport", () => {
  it("extracts code, title, location and excerpt", () => {
    const r = parseBuildReport(STDERR);
    expect(r.diagnostics).toHaveLength(1);
    const d = r.diagnostics[0];
    expect(d.code).toBe("E0308");
    expect(d.title).toBe("mismatched types");
    expect(d.file).toBe("src/lib.rs");
    expect(d.line).toBe(12);
    expect(d.col).toBe(18);
    expect(d.excerpt).toContain('let x: u64 = "1";');
  });

  it("returns no diagnostics for a clean build", () => {
    expect(parseBuildReport("Compiling hello\nFinished").diagnostics).toEqual(
      []
    );
  });
});
