// The Build stage drawn from props: which surface says what, which action
// is the brand one, and that the action row closes every surface.
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import BaseBuild from "./BaseBuild";
import type { BaseBuildProps } from "./BaseBuild";
import type { BuildSurface } from "./build-surface";
import type { DiagnosticView } from "./build-view";

const typeError = (prompt: string): DiagnosticView => ({
  code: "E0308",
  title: "Wrong type",
  explanation: "The value is a different type. Rustc says: expected u32.",
  label: "expected u32",
  file: "src/lib.rs",
  lines: [
    { num: 4, text: "fn f() {", failing: false },
    { num: 5, text: '    let x: u32 = "no";', failing: true },
    { num: 6, text: "}", failing: false },
  ],
  excerpt: "",
  prompt,
});

/** Every prop, named; each test changes the ones it is about */
const props = (
  surface: BuildSurface,
  diagnostics: DiagnosticView[] = [],
  building = false
): BaseBuildProps => ({
  surface,
  building,
  host: "api.solpg.io",
  ms: 2900,
  diagnostics,
  errorCount: diagnostics.length,
  raw: "error[E0308]: mismatched types\nwarning: unused",
  onBuild: vi.fn(() => Promise.resolve()),
  onContinue: vi.fn(),
  onExport: vi.fn(() => Promise.resolve()),
  onFix: vi.fn(),
  onOpenFile: vi.fn(),
  idlActions: null,
});

const brandButtons = (container: HTMLElement) =>
  container.querySelectorAll('[data-slot="brand-button"]');

/** The action row is the stage's last element, so a phone can pin it */
const lastIsActions = (container: HTMLElement) => {
  const stage = container.querySelector('[data-slot="stage-empty"]');
  return stage?.lastElementChild?.getAttribute("data-slot");
};

describe("BaseBuild", () => {
  it("offers a first build with no brand button", () => {
    const p = props({ kind: "empty" });
    const { container } = render(<BaseBuild {...p} />);

    expect(
      screen.getByRole("heading", { name: "Nothing built yet" })
    ).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Build" }));
    expect(p.onBuild).toHaveBeenCalled();
    expect(brandButtons(container)).toHaveLength(0);
    expect(lastIsActions(container)).toBe("stage-empty-actions");
  });

  it("says where a first build runs while it runs", () => {
    render(<BaseBuild {...props({ kind: "empty" }, [], true)} />);

    expect(screen.getByRole("heading", { name: "Building..." })).toBeTruthy();
    expect(screen.getByText(/Compiling on api\.solpg\.io/)).toBeTruthy();
    const busy = screen.getByRole("button", { name: /Building/ });
    expect(busy).toHaveProperty("disabled", true);
    expect(busy.getAttribute("aria-busy")).toBe("true");
  });

  it("offers Deploy as the one brand button after a build", () => {
    const p = props({ kind: "succeeded" });
    const { container } = render(<BaseBuild {...p} />);

    expect(
      screen.getByRole("heading", { name: "Build succeeded" })
    ).toBeTruthy();
    expect(screen.getByText(/2\.9s/)).toBeTruthy();
    expect(brandButtons(container)).toHaveLength(1);
    fireEvent.click(screen.getByRole("button", { name: "Continue to Deploy" }));
    expect(p.onContinue).toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "Export project" })).toBeTruthy();
    expect(lastIsActions(container)).toBe("stage-empty-actions");
  });

  it("names the build server when the compiler was never reached", () => {
    const p = props({ kind: "unreached" });
    render(<BaseBuild {...p} />);

    expect(screen.getByRole("heading", { name: "Build failed" })).toBeTruthy();
    expect(
      screen.getByText(/could not be reached: api\.solpg\.io/)
    ).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Retry build" }));
    expect(p.onBuild).toHaveBeenCalled();
  });

  it("says a failed build happened before the reload", () => {
    const { container } = render(
      <BaseBuild {...props({ kind: "restored", failed: true })} />
    );

    expect(
      screen.getByRole("heading", { name: "Last build failed" })
    ).toBeTruthy();
    expect(brandButtons(container)).toHaveLength(0);
  });

  it("offers Deploy over a build from before the reload", () => {
    render(<BaseBuild {...props({ kind: "restored", failed: false })} />);

    expect(screen.getByRole("heading", { name: "Built earlier" })).toBeTruthy();
    expect(
      screen.getByRole("button", { name: "Continue to Deploy" })
    ).toBeTruthy();
  });

  it("marks the faulty line of a failed build", () => {
    const p = props({ kind: "failed", stderr: "" }, [typeError("fix it")]);
    const { container } = render(<BaseBuild {...p} />);

    expect(screen.getByRole("heading", { name: "Build failed" })).toBeTruthy();
    expect(container.querySelectorAll('[data-slot="diagnostic"]')).toHaveLength(
      1
    );
    expect(
      container.querySelector('[data-slot="diagnostic-code"]')?.textContent
    ).toBe("E0308");
    const fault = container.querySelector("[data-fault]");
    expect(fault?.textContent).toContain("let x");
    expect(fault?.textContent).toContain("expected u32");

    fireEvent.click(screen.getByRole("button", { name: "Fix with assistant" }));
    expect(p.onFix).toHaveBeenCalledWith("fix it");
    fireEvent.click(screen.getByRole("button", { name: "Open in editor" }));
    expect(p.onOpenFile).toHaveBeenCalledWith("src/lib.rs");
    fireEvent.click(screen.getByRole("button", { name: "Rebuild" }));
    expect(p.onBuild).toHaveBeenCalled();
    expect(lastIsActions(container)).toBe("stage-empty-actions");
  });

  it("keeps the brand button for the first error only", () => {
    const { container } = render(
      <BaseBuild
        {...props({ kind: "failed", stderr: "" }, [
          typeError("first"),
          typeError("second"),
        ])}
      />
    );

    expect(brandButtons(container)).toHaveLength(1);
    expect(
      screen.getAllByRole("button", { name: "Fix with assistant" })
    ).toHaveLength(2);
  });

  it("shows rustc's excerpt when the source cannot be read", () => {
    const view: DiagnosticView = {
      code: "E0308",
      title: "Wrong type",
      explanation: "",
      label: null,
      file: null,
      lines: null,
      excerpt: "5 | let x: u32 = 1;",
      prompt: "fix",
    };
    const { container } = render(
      <BaseBuild {...props({ kind: "failed", stderr: "" }, [view])} />
    );

    expect(
      container.querySelector('[data-slot="diagnostic-source"]')?.textContent
    ).toBe("5 | let x: u32 = 1;");
    expect(screen.queryByRole("button", { name: "Open in editor" })).toBeNull();
  });

  /** The stepper's badge counted errors the parser could not split */
  it("keeps the stepper's count when no error could be parsed", () => {
    const p: BaseBuildProps = {
      surface: { kind: "failed", stderr: "boom" },
      building: false,
      host: "h",
      ms: null,
      diagnostics: [],
      errorCount: 2,
      raw: "boom",
      onBuild: vi.fn(),
      onContinue: vi.fn(),
      onExport: vi.fn(),
      onFix: vi.fn(),
      onOpenFile: vi.fn(),
      idlActions: null,
    };
    render(<BaseBuild {...p} />);

    expect(screen.getByText("2 errors · h")).toBeTruthy();
    expect(screen.getByText("Unparsed compiler error")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Fix with assistant" }));
    expect(p.onFix).toHaveBeenCalledWith(
      "Explain this build failure and propose a fix:\nboom"
    );
  });

  it("folds the compiler's output away until asked", () => {
    render(
      <BaseBuild
        {...props({ kind: "failed", stderr: "" }, [typeError("fix")])}
      />
    );

    const toggle = screen.getByRole("button", {
      name: /Show compiler output/,
    });
    expect(toggle.getAttribute("aria-expanded")).toBe("false");
    expect(toggle.textContent).toContain("1 warning");
    expect(screen.queryByText(/warning: unused/)).toBeNull();

    fireEvent.click(toggle);
    expect(
      screen
        .getByRole("button", { name: /Hide compiler output/ })
        .getAttribute("aria-expanded")
    ).toBe("true");
    expect(screen.getByText(/warning: unused/)).toBeTruthy();
  });
});
