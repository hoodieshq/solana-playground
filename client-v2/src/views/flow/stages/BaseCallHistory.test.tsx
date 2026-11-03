import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";

import BaseCallHistory from "./BaseCallHistory";

// The history list: nothing before the first call, unless the wide layout
// keeps its column, which then says what will show there.
const props = {
  records: [],
  cluster: "devnet",
  txUrl: (s: string) => `https://x/tx/${s}`,
  onOpen: vi.fn(),
};

describe("BaseCallHistory", () => {
  it("renders nothing before the first call", () => {
    const { container } = render(<BaseCallHistory {...props} />);
    expect(container.firstChild).toBeNull();
  });

  it("keeps its heading and an empty line when asked to show the empty state", () => {
    render(<BaseCallHistory {...props} showEmpty />);
    const region = screen.getByRole("region", { name: "Call history" });
    expect(region.textContent).toContain("Calls you send show up here.");
    expect(screen.queryByRole("list")).toBeNull();
  });
});
