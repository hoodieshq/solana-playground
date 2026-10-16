import { fireEvent, render, screen } from "@testing-library/react";

import { BaseStepRail, railStatus } from "./BaseStepRail";
import type { RailRow } from "./BaseStepRail";

describe("railStatus", () => {
  it("maps confirmed marks to done", () => {
    expect(railStatus("proved", false)).toBe("done");
    expect(railStatus("attested", false)).toBe("done");
  });

  it("maps a passed mark to skipped", () => {
    expect(railStatus("passed", false)).toBe("skipped");
  });

  it("maps open to locked unless it is the cursor", () => {
    expect(railStatus("open", true)).toBe("current");
    expect(railStatus("open", false)).toBe("locked");
  });

  it("lets the cursor win over a skipped mark", () => {
    expect(railStatus("passed", true)).toBe("current");
  });
});

describe("BaseStepRail", () => {
  const rows: RailRow[] = [
    {
      id: "a",
      objective: "Write it",
      meta: "ran",
      status: "done",
      canGo: true,
    },
    {
      id: "b",
      objective: "Deploy it",
      meta: "deploy",
      status: "current",
      canGo: false,
    },
  ];

  it("carries status on the items and marks the current one", () => {
    const { container } = render(<BaseStepRail rows={rows} onGo={vi.fn()} />);
    const items = container.querySelectorAll('[data-slot="step-rail-item"]');
    expect(items[0].getAttribute("data-status")).toBe("done");
    expect(items[1].getAttribute("data-status")).toBe("current");
    expect(items[0].getAttribute("aria-current")).toBeNull();
    expect(items[1].getAttribute("aria-current")).toBe("step");
  });

  it("makes a canGo row a button that calls onGo with its id", () => {
    const onGo = vi.fn();
    render(<BaseStepRail rows={rows} onGo={onGo} />);
    fireEvent.click(screen.getByRole("button", { name: /Write it/ }));
    expect(onGo).toHaveBeenCalledWith("a");
  });

  it("gives a row that cannot be entered no button", () => {
    render(<BaseStepRail rows={rows} onGo={vi.fn()} />);
    expect(screen.getAllByRole("button")).toHaveLength(1);
    expect(screen.queryByRole("button", { name: /Deploy it/ })).toBeNull();
  });
});
