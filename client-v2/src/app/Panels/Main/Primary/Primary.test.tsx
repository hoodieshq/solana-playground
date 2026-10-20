import { render, screen } from "@testing-library/react";
import type { ReactElement } from "react";
import { ThemeProvider } from "styled-components";
import { expect, it, vi } from "vitest";

// The `utils` barrel cannot load under jsdom; `Primary` needs only these
vi.mock("../../../../utils", async () => {
  const { PgCommon } = await vi.importActual<
    typeof import("../../../../utils/common")
  >("../../../../utils/common");
  const { PgView } = await vi.importActual<
    typeof import("../../../../utils/view")
  >("../../../../utils/view");
  return {
    PgCommon,
    PgView,
    PgTheme: { getScrollbarCSS: () => "", convertToCSS: () => "" },
  };
});
vi.mock("../../../../hooks", async () => ({
  useGetAndSetStatic: (
    await vi.importActual<
      typeof import("../../../../hooks/useGetAndSetStatic")
    >("../../../../hooks/useGetAndSetStatic")
  ).useGetAndSetStatic,
}));
vi.mock("../../../../components/Loading", () => ({
  SpinnerWithBg: ({ children }: { children: unknown }) => <>{children}</>,
}));
vi.mock("../../../../components/ErrorBoundary", () => ({
  default: ({ children }: { children: unknown }) => <>{children}</>,
}));

/** Only what `Primary`'s styles read */
const THEME = {
  views: { main: { primary: { default: {} } } },
  default: { transition: { duration: { long: "0s" }, type: "linear" } },
};
const withTheme = (ui: ReactElement) => (
  <ThemeProvider theme={THEME}>{ui}</ThemeProvider>
);

const { PgView } = await import("../../../../utils");
const { default: Primary } = await import("./Primary");

it("shows the route's view again when it mounts a second time", async () => {
  const first = render(withTheme(<Primary />));
  void PgView.setMainPrimary(() => <p>route view</p>);
  expect(await screen.findByText("route view")).toBeTruthy();
  first.unmount();

  render(withTheme(<Primary />));
  expect(await screen.findByText("route view")).toBeTruthy();
});
