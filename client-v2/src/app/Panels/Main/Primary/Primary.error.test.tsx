import { render, screen } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";

import { initLogger, memoryProvider, resetLogger } from "@/shared/lib/logger";

// The `utils` barrel cannot load under jsdom; `Primary` needs only these.
// The boundary is the real one: what it keeps between views is under test.
vi.mock("../../../../utils", async () => {
  const { PgCommon } = await vi.importActual<
    typeof import("../../../../utils/common")
  >("../../../../utils/common");
  const { PgView } = await vi.importActual<
    typeof import("../../../../utils/view")
  >("../../../../utils/view");
  return { PgCommon, PgView };
});
vi.mock("../../../../hooks", async () => ({
  // The boundary's Refresh path runs a failed view's loader again with it
  useAsyncEffect: (
    await vi.importActual<typeof import("../../../../hooks/useAsyncEffect")>(
      "../../../../hooks/useAsyncEffect"
    )
  ).useAsyncEffect,
  useGetAndSetStatic: (
    await vi.importActual<
      typeof import("../../../../hooks/useGetAndSetStatic")
    >("../../../../hooks/useGetAndSetStatic")
  ).useGetAndSetStatic,
}));
vi.mock("../../../../components/Loading", () => ({
  SpinnerWithBg: ({ children }: { children: unknown }) => <>{children}</>,
}));
vi.mock("../../../../components/ErrorBoundary/Fallback", () => ({
  default: ({ error }: { error: Error }) => <p>{error.message}</p>,
}));
vi.mock("../../../../components/Icons", () => ({ Refresh: () => undefined }));

const { PgView } = await import("../../../../utils");
const { default: Primary } = await import("./Primary");

beforeEach(() => initLogger({ providers: [memoryProvider()] }));
afterEach(() => resetLogger());

it("drops a failed route's error when the next route brings its view", async () => {
  render(<Primary />);
  void PgView.setMainPrimary(async () => {
    throw new Error("Seahorse example is gone");
  });
  expect(await screen.findByText("Seahorse example is gone")).toBeTruthy();

  void PgView.setMainPrimary(async () => <p>Hello Solana</p>);

  expect(await screen.findByText("Hello Solana")).toBeTruthy();
  expect(screen.queryByText("Seahorse example is gone")).toBeNull();
});
