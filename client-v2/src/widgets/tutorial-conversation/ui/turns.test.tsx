import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import type { ActBeat, Ask, TutorialDefinition } from "@/entities/tutorial";
import hello from "../../../tutorials/hello-anchor/tutorial.json";
import BaseActCard from "./BaseActCard";
import BaseIntroCard, { HOW_IT_GOES, INTRO_NOTE } from "./BaseIntroCard";
import BaseResultCard from "./BaseResultCard";
import BaseStepDivider from "./BaseStepDivider";
import BaseWroteCard from "./BaseWroteCard";
import { AskStandIn } from "./stand-ins";

const definition = hello as unknown as TutorialDefinition;
const actOf = (id: string) =>
  definition.steps
    .flatMap((s) => s.beats)
    .find((b): b is ActBeat => b.kind === "act" && b.id === id)!;
const build = () => actOf("s1.build");
const call = () => actOf("s4.call");

describe("BaseIntroCard", () => {
  const intro = (onStart = vi.fn()) =>
    render(
      <BaseIntroCard
        name={definition.name}
        thumbnail={definition.thumbnail}
        minutes={definition.minutes}
        stepCount={definition.steps.length}
        promise={definition.intro.promise}
        log={definition.intro.log}
        onStart={onStart}
      />
    );

  it("says what you build, how it goes, and offers one Start", () => {
    intro();
    expect(screen.getByRole("heading", { name: "Hello Anchor" })).toBeTruthy();
    expect(screen.getByText("10 min · 4 steps")).toBeTruthy();
    expect(screen.getByText(INTRO_NOTE)).toBeTruthy();
    expect(screen.getByText("What you'll build")).toBeTruthy();
    expect(screen.getByText(definition.intro.log)).toBeTruthy();
    expect(screen.getByText(HOW_IT_GOES)).toBeTruthy();
    expect(screen.getAllByRole("button")).toHaveLength(1);
    expect(screen.getByRole("button", { name: /Start step 1/ })).toBeTruthy();
  });

  it("starts on the button, and on Enter while nothing has focus", async () => {
    const onStart = vi.fn();
    intro(onStart);
    await userEvent.click(screen.getByRole("button", { name: /Start step 1/ }));
    expect(onStart).toHaveBeenCalledTimes(1);

    (document.activeElement as HTMLElement | null)?.blur();
    fireEvent.keyDown(document, { key: "Enter" });
    expect(onStart).toHaveBeenCalledTimes(2);
  });
});

describe("BaseStepDivider", () => {
  it("reads the kicker, the title and the objective", () => {
    render(
      <BaseStepDivider
        index={1}
        count={4}
        title="Program"
        objective="Define the hello instruction and log a message"
        done={false}
        took={null}
      />
    );
    expect(screen.getByText("Step 1 of 4")).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Program" })).toBeTruthy();
    expect(screen.queryByLabelText("Passed")).toBeNull();
  });

  it("gets a check and the step's time once passed", () => {
    render(
      <BaseStepDivider
        index={1}
        count={4}
        title="Program"
        objective="o"
        done
        took={41_000}
      />
    );
    expect(screen.getByLabelText("Passed")).toBeTruthy();
    expect(screen.getByText("41 s")).toBeTruthy();
  });
});

describe("BaseWroteCard", () => {
  const lines = [5, 6, 7, 8, 9, 10, 11, 12, 13];

  it("is a button naming the lines, with the first three and the rest counted", async () => {
    const onShow = vi.fn();
    render(
      <BaseWroteCard
        wrote={{ file: "src/lib.rs", lines }}
        failed={false}
        preview={["#[program]", "mod hello_anchor {", "    use super::*;"]}
        onShow={onShow}
      />
    );
    const card = screen.getByRole("button", {
      name: "Show lines 5 to 13 in src/lib.rs",
    });
    expect(card.textContent).toContain("src/lib.rslines 5 to 13+9");
    expect(card.textContent).toContain("#[program]");
    expect(card.textContent).toContain("6 more lines");
    expect(card.textContent).toContain("Show in lib.rs");
    await userEvent.click(card);
    expect(onShow).toHaveBeenCalledWith("src/lib.rs", 5);
  });

  it("names one line as a line", () => {
    render(
      <BaseWroteCard
        wrote={{ file: "src/lib.rs", lines: [9] }}
        failed={false}
        preview={["msg!(x);"]}
        onShow={vi.fn()}
      />
    );
    expect(
      screen.getByRole("button", { name: "Show line 9 in src/lib.rs" })
    ).toBeTruthy();
  });

  it("reads Created with New file for a file the write made", () => {
    render(
      <BaseWroteCard
        wrote={{ file: "client/client.ts", lines: [1, 2], created: true }}
        failed={false}
        preview={[]}
        onShow={vi.fn()}
      />
    );
    expect(screen.getByText("Created client/client.ts")).toBeTruthy();
    expect(screen.getByText("New file")).toBeTruthy();
  });

  it("says the block is not in the file when the write failed", () => {
    render(<BaseWroteCard wrote={null} failed preview={[]} onShow={vi.fn()} />);
    expect(screen.getByRole("status").textContent).toContain(
      "not in your file"
    );
    expect(screen.queryByRole("button")).toBeNull();
  });
});

describe("BaseActCard", () => {
  const card = (over: Partial<Parameters<typeof BaseActCard>[0]> = {}) =>
    render(
      <BaseActCard
        act={over.act ?? build()}
        state={over.state ?? "live"}
        note={over.note ?? null}
        stage={over.stage ?? null}
        took={over.took ?? null}
        disabled={over.disabled ?? false}
        onRun={over.onRun ?? vi.fn()}
      />
    );

  it("offers its button with ⌘↵ while live", async () => {
    const onRun = vi.fn();
    card({ onRun });
    expect(screen.getByText("Build lib.rs")).toBeTruthy();
    expect(
      screen.getByText("Compiles lib.rs on Playground's build server")
    ).toBeTruthy();
    const button = screen.getByRole("button", { name: /Build/ });
    expect(button.textContent).toContain("⌘↵");
    await userEvent.click(button);
    expect(onRun).toHaveBeenCalledWith(undefined);
  });

  it("gives the button way to the stage, n of m and a bar while it runs", () => {
    card({
      state: "running",
      stage: { beatId: "s1.build", label: "Building", index: 1, count: 2 },
    });
    expect(screen.queryByRole("button")).toBeNull();
    expect(screen.getByText("Building")).toBeTruthy();
    expect(screen.getByText("1 of 2")).toBeTruthy();
    expect(screen.getByTestId("act-stage-bar").style.transform).toBe(
      "scaleX(0.5)"
    );
  });

  it("waits while another act runs", () => {
    card({ disabled: true });
    expect(
      (screen.getByRole("button", { name: /Build/ }) as HTMLButtonElement)
        .disabled
    ).toBe(true);
  });

  it("asks for each argument of a call, up to 32 characters, and Enter sends", async () => {
    const onRun = vi.fn();
    card({ act: call(), onRun });
    const send = screen.getByRole("button", { name: /Call hello/ });
    expect((send as HTMLButtonElement).disabled).toBe(true);
    expect(screen.getByText("Type any name")).toBeTruthy();

    const field = screen.getByRole("textbox", { name: "name" });
    expect(field.getAttribute("maxlength")).toBe("32");
    await userEvent.type(field, "Alex{Enter}");
    expect(onRun).toHaveBeenCalledWith({ name: "Alex" });
  });

  it("reads the interrupted line after a reload cut its run", () => {
    card({
      state: "interrupted",
      note: "Interrupted by a reload. Run it again.",
    });
    expect(
      screen.getByText("Interrupted by a reload. Run it again.")
    ).toBeTruthy();
    expect(screen.getByRole("button", { name: /Build/ })).toBeTruthy();
  });

  it("becomes one line with no button once it ran", () => {
    card({ state: "done", took: 1600 });
    expect(screen.getByText("Built in 1.6 s")).toBeTruthy();
    expect(screen.queryByRole("button")).toBeNull();
  });
});

describe("BaseResultCard", () => {
  const failed = {
    act: "build" as const,
    ok: false as const,
    seconds: 1.6,
    log: "",
    error: {
      code: "E0412",
      file: "src/lib.rs",
      line: 9,
      column: 32,
      message: "cannot find type `Contex` in this scope",
    },
  };

  it("heads a passing build with its IDL", () => {
    render(
      <BaseResultCard
        result={{
          act: "build",
          ok: true,
          seconds: 1.6,
          instructions: ["hello"],
        }}
        planned={null}
        open={false}
        onExplain={vi.fn()}
        onFixMyself={vi.fn()}
        onShowLine={vi.fn()}
      />
    );
    expect(screen.getByText("Build successful")).toBeTruthy();
    expect(screen.getByText("IDL: 1 instruction · hello · 1.6 s")).toBeTruthy();
  });

  it("opens a failed build with its line, its location and Explain", async () => {
    const onExplain = vi.fn();
    const onFixMyself = vi.fn();
    const onShowLine = vi.fn();
    render(
      <BaseResultCard
        result={failed}
        planned="The compiler is right: it is spelled `Context`."
        open
        onExplain={onExplain}
        onFixMyself={onFixMyself}
        onShowLine={onShowLine}
      />
    );
    expect(screen.getByText("Build failed")).toBeTruthy();
    expect(screen.getByText("E0412 · line 9")).toBeTruthy();
    await userEvent.click(
      screen.getByRole("button", { name: "--> src/lib.rs:9:32" })
    );
    expect(onShowLine).toHaveBeenCalledWith("src/lib.rs", 9);
    await userEvent.click(
      screen.getByRole("button", { name: /Explain the error/ })
    );
    expect(onExplain).toHaveBeenCalled();
    await userEvent.click(
      screen.getByRole("button", { name: "I'll fix it myself" })
    );
    expect(onFixMyself).toHaveBeenCalled();
  });

  it("folds to its head, with no button, once it is a record", () => {
    render(
      <BaseResultCard
        result={failed}
        planned={null}
        open={false}
        onExplain={vi.fn()}
        onFixMyself={vi.fn()}
        onShowLine={vi.fn()}
      />
    );
    expect(screen.getByText("Build failed")).toBeTruthy();
    expect(screen.queryByRole("button")).toBeNull();
  });
});

describe("AskStandIn", () => {
  const ask = definition.steps
    .flatMap((s) => s.beats)
    .find((b): b is Ask => b.kind === "ask")!;

  it.each([
    ["first_try", 1, "· first try"],
    ["retry", 2, "· 2nd try"],
    ["retry", 3, "· 3rd try"],
    ["typed", 0, "· typed by you"],
    ["skipped", 0, "· skipped"],
    ["call_panel", 0, "· skipped, called from the Call panel"],
  ] as const)(
    "records %s after %i attempts as %s",
    (outcome, attempts, end) => {
      render(
        <AskStandIn
          ask={ask}
          open={false}
          wrong={[]}
          outcome={outcome}
          attempts={attempts}
          disabled={false}
          onPick={vi.fn()}
          onHint={vi.fn()}
          onSkip={vi.fn()}
        />
      );
      expect(screen.getByText(end)).toBeTruthy();
      expect(screen.queryByRole("button")).toBeNull();
    }
  );

  it("picks an option while open", async () => {
    const onPick = vi.fn();
    render(
      <AskStandIn
        ask={ask}
        open
        wrong={[]}
        outcome={null}
        attempts={0}
        disabled={false}
        onPick={onPick}
        onHint={vi.fn()}
        onSkip={vi.fn()}
      />
    );
    const group = screen.getByRole("group");
    await userEvent.click(group.querySelectorAll("button")[ask.answer]);
    expect(onPick).toHaveBeenCalledWith(ask.answer);
  });
});
