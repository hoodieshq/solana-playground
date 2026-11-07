import { describe, expect, it } from "vitest";

import { proposesChange } from "./proposes-change";

/** A fenced block of `body`, labelled `lang` */
const fence = (lang: string, body: string) =>
  "```" + lang + "\n" + body + "\n```";

describe("proposesChange", () => {
  it("a reply with a block of project code proposes a change", () => {
    for (const lang of [
      "rust",
      "rs",
      "ts",
      "typescript",
      "js",
      "toml",
      "json",
    ]) {
      expect(
        proposesChange(`Change it to:\n\n${fence(lang, "let x = 1;")}\n`)
      ).toBe(true);
    }
  });

  it("an explanation without code proposes nothing", () => {
    expect(
      proposesChange(
        "This account holds 2.5 SOL and is owned by the System Program."
      )
    ).toBe(false);
  });

  it("inline code alone proposes nothing", () => {
    expect(
      proposesChange("Call `initialize` with the `counter` account.")
    ).toBe(false);
  });

  it("a command or an output block proposes nothing", () => {
    for (const lang of ["bash", "sh", "shell", "console", "text", "txt"]) {
      expect(proposesChange(`Run:\n\n${fence(lang, "build")}\n`)).toBe(false);
    }
  });

  it("an unlabelled block proposes nothing", () => {
    expect(proposesChange(`The address:\n\n${fence("", "9xQe…")}\n`)).toBe(
      false
    );
  });

  it("an unlabelled block that names a project file proposes a change", () => {
    expect(proposesChange(fence("", "// src/lib.rs\nfn a() {}"))).toBe(true);
    expect(proposesChange(fence("", "# Cargo.toml\n[dependencies]"))).toBe(
      true
    );
    expect(proposesChange(fence("", "// a note\nfn a() {}"))).toBe(false);
  });

  it("a closing fence is not read as an unlabelled block", () => {
    expect(
      proposesChange("```bash\nbuild\n```\n# src/lib.rs is where it lives")
    ).toBe(false);
    expect(proposesChange("```text\nout\n```\n```rust\nfn a() {}\n```")).toBe(
      true
    );
  });

  it("one code block among command blocks is enough", () => {
    expect(
      proposesChange(
        `${fence("bash", "build")}\n\nthen\n\n${fence("rust", "let x = 1;")}`
      )
    ).toBe(true);
  });

  it("a tilde fence and an indented fence count too", () => {
    expect(proposesChange("~~~rust\nfn a() {}\n~~~")).toBe(true);
    expect(proposesChange("1. Edit:\n   ```rust\n   fn a() {}\n   ```")).toBe(
      true
    );
  });

  it("a block still streaming counts once its language is out", () => {
    expect(proposesChange("Change it to:\n\n```rust\nfn ma")).toBe(true);
  });

  it("the language is read before any fence attributes", () => {
    expect(proposesChange("```rust title=lib.rs\nfn a() {}\n```")).toBe(true);
    expect(proposesChange("```Rust\nfn a() {}\n```")).toBe(true);
  });
});
