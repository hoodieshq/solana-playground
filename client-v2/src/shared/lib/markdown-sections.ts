import GithubSlugger from "github-slugger";

/** A heading of a Markdown page, with the id the page gives it */
export interface MarkdownSection {
  title: string;
  id: string;
}

/** A fence opens or closes a code block, inside which a `#` is not a heading */
const FENCE = /^\s{0,3}(`{3,}|~{3,})/;
/** An ATX heading: `## Title`, with or without closing hashes */
const HEADING = /^\s{0,3}(#{1,6})\s+(.*?)(?:\s+#+)?\s*$/;

/**
 * A heading's text as it renders: link syntax and emphasis stripped outside
 * inline code, the code's own text kept as written (`token::*`), which is
 * what the heading's id is made from
 */
const headingText = (raw: string): string =>
  raw
    .split(/(`[^`]*`)/)
    .map((part, i) =>
      i % 2 === 1
        ? part.slice(1, -1)
        : part.replace(/!?\[([^\]]*)\]\([^)]*\)/g, "$1").replace(/\*+/g, "")
    )
    .join("")
    .trim();

/**
 * A Markdown page's sections: every heading below its title (level 2 and
 * down), with the id `rehype-slug` gives it when the page renders, the
 * GitHub scheme the docs sites use. The title is fed to the slugger too, so
 * a heading that repeats it gets the same `-1` suffix it gets on the page.
 * Fenced code is skipped
 */
export const sectionsOf = (markdown: string): MarkdownSection[] => {
  const slugger = new GithubSlugger();
  const sections: MarkdownSection[] = [];
  let fence: string | undefined;
  for (const line of markdown.split("\n")) {
    const opened = FENCE.exec(line);
    if (opened) {
      if (fence === undefined) fence = opened[1];
      else if (
        opened[1].startsWith(fence[0]) &&
        opened[1].length >= fence.length
      )
        fence = undefined;
      continue;
    }
    if (fence !== undefined) continue;
    const heading = HEADING.exec(line);
    if (!heading) continue;
    const title = headingText(heading[2]);
    const id = slugger.slug(title);
    if (heading[1].length > 1) sections.push({ title, id });
  }
  return sections;
};

if (import.meta.vitest) {
  const { describe, it, expect } = import.meta.vitest;

  describe("shared/lib/markdown-sections", () => {
    it("gives the sections the ids their site gives them", () => {
      const page = [
        "# Program Structure",
        "",
        "## Example Program",
        "",
        "```rust",
        "# not a heading",
        "```",
        "",
        "## declare_id! macro",
        "## #[program] attribute",
        "### Instruction Context",
        "## #[derive(Accounts)] macro",
        "## `#[account(has_one = target)]`",
        "## [Account](https://example.com) **Validation** ##",
        "## Example Program",
      ].join("\n");
      // The ids anchor-lang.com gives these headings, read 9 Nov 2026
      expect(sectionsOf(page)).toEqual([
        { title: "Example Program", id: "example-program" },
        { title: "declare_id! macro", id: "declare_id-macro" },
        { title: "#[program] attribute", id: "program-attribute" },
        { title: "Instruction Context", id: "instruction-context" },
        { title: "#[derive(Accounts)] macro", id: "deriveaccounts-macro" },
        {
          title: "#[account(has_one = target)]",
          id: "accounthas_one--target",
        },
        { title: "Account Validation", id: "account-validation" },
        { title: "Example Program", id: "example-program-1" },
      ]);
    });

    it("lists no section for a page with its title alone, and counts the title's slug", () => {
      expect(sectionsOf("# Programs\n\nSome text.")).toEqual([]);
      expect(sectionsOf("# Programs\n\n## Programs")).toEqual([
        { title: "Programs", id: "programs-1" },
      ]);
    });
  });
}
