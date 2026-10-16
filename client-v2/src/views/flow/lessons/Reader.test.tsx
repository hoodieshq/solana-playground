import { render, screen, waitFor } from "@testing-library/react";

import Reader from "./Reader";
import type { LessonStep } from "./types";

const { error } = vi.hoisted(() => ({ error: vi.fn() }));

vi.mock("@/shared/lib/logger", () => ({
  createLogger: () => ({
    panic: vi.fn(),
    error,
    warn: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
  }),
}));

vi.mock("../../../utils", () => ({}));
vi.mock("../../../components/Markdown", () => ({
  __esModule: true,
  default: () => null,
}));
vi.mock("../../../components/Loading", () => ({ SpinnerWithBg: () => null }));

const step = (readPage: () => Promise<string>): LessonStep => ({
  id: "s1",
  objective: "Say hello on chain",
  verifiedBy: "The build passes.",
  verify: { kind: "build-passes" },
  readPage,
  hints: ["q", "l", "p"],
});

describe("Reader", () => {
  it("logs a page that fails to load and never reports it as opened", async () => {
    const onLoaded = vi.fn();
    render(
      <Reader
        step={step(() => Promise.reject(new Error("gone")))}
        position="Step 1 of 4"
        criterion="The build passes."
        offersAttest={false}
        onLoaded={onLoaded}
        onClose={() => {}}
        onAttest={() => {}}
      />
    );
    await waitFor(() =>
      expect(screen.getByText(/This page could not be loaded\./)).toBeTruthy()
    );
    expect(onLoaded).not.toHaveBeenCalled();
    expect(error).toHaveBeenCalledTimes(1);
    expect(error.mock.calls[0][1]).toEqual({ report: false });
  });
});
