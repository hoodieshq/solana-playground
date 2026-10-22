import { parseBuildReport } from "../stages/build-report";
import { diagnosticPath, rustcFix } from "./rustc-fix";

// What the build server returned for a lib.rs missing the `;` after its
// `use`, as seen on 22.10 (the session uuid already stripped)
const STDERR = `error: expected \`;\`, found \`declare_id\`
 --> ../src/lib.rs:1:28
  |
1 | use anchor_lang::prelude::*
  |                            ^ help: add \`;\` here
2 |
3 | declare_id!("BUq5jM2KN1tArqDq1QdCWbmZbUvg5qT3GKZyhenQAPY8");
  | ---------- unexpected token

error: could not compile \`solpg\` due to previous error`;

const LIB = `use anchor_lang::prelude::*

declare_id!("BUq5jM2KN1tArqDq1QdCWbmZbUvg5qT3GKZyhenQAPY8");
`;

const [missingSemicolon] = parseBuildReport(STDERR).diagnostics;

describe("rustcFix", () => {
  it("reads the path the way the explorer knows it", () => {
    expect(diagnosticPath(missingSemicolon)).toBe("src/lib.rs");
  });

  it("adds what rustc asks for, where its caret points, and nothing else", () => {
    const fix = rustcFix(missingSemicolon, (p) =>
      p === "src/lib.rs" ? LIB : null
    );
    expect(fix).toEqual({
      path: "src/lib.rs",
      line: 1,
      insert: ";",
      content: LIB.replace("prelude::*", "prelude::*;"),
    });
  });

  it("refuses when the file has moved on since the build", () => {
    const edited = `// a comment\n${LIB}`;
    expect(rustcFix(missingSemicolon, () => edited)).toBeNull();
  });

  it("has nothing to offer for an error without an insert", () => {
    const [missingType] =
      parseBuildReport(`error[E0412]: cannot find type \`Hello\` in this scope
 --> ../src/lib.rs:9:32
  |
9 |     pub fn hello(_ctx: Context<Hello>) -> Result<()> {
  |                                ^^^^^ not found in this scope
`).diagnostics;
    expect(rustcFix(missingType, () => LIB)).toBeNull();
  });
});
