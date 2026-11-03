import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { type DefaultTheme, ThemeProvider } from "styled-components";
import { afterEach, beforeEach, expect, it, vi } from "vitest";

import {
  initLogger,
  memoryProvider as logMemory,
  resetLogger,
} from "@/shared/lib/logger";
import { Modal } from "@/shared/ui/modal";
import {
  ModalIdContext,
  ModalLayerContext,
} from "@/widgets/overlays/ui/modal-layer";

// The `utils` barrel needs a booted app; the modal uses three of its parts,
// and its icons' `Svg` reads `PgTheme` for styles that do not matter here
const utils = vi.hoisted(() => ({
  PgFramework: {
    isUnknownFramework: (e: unknown) =>
      e instanceof Error && e.message === "Could not identify framework",
  },
  PgView: { setToast: vi.fn(), closeModal: vi.fn() },
  PgExplorer: { currentWorkspaceName: "open-one" },
  PgTheme: { convertToCSS: () => "", getColor: () => "inherit" },
}));
vi.mock("../../../../../utils", () => utils);

// The slice's flow and events are tested in the slice
const slice = vi.hoisted(() => {
  class DownloadError extends Error {}
  return {
    DEFAULT_KEYPAIR_PATH: "~/.config/solana/id.json",
    KEYPAIR_VARIABLE: "SOLANA_KEYPAIR",
    RPC_URL_VARIABLE: "SOLANA_RPC_URL",
    // The mapping is the slice's and tested there
    exportedEndpoint: () => "https://api.devnet.solana.com",
    DownloadError,
    exportProject: vi.fn(),
    getProjectKind: vi.fn(),
    isDownloadFailure: (e: unknown) => e instanceof DownloadError,
  };
});
vi.mock("@/features/project-export", () => slice);
vi.mock("../../../../../components/Markdown", () => ({ default: () => null }));

import { ExportWorkspace } from "./ExportWorkspace";

/** Answers every key: the modal's styles read deep theme keys, none of which matters here */
const anyTheme: DefaultTheme = new Proxy(
  {},
  {
    get: (_, key) =>
      key === Symbol.toPrimitive || key === "toString"
        ? () => "inherit"
        : anyTheme,
  }
) as unknown as DefaultTheme;

let logs: ReturnType<typeof logMemory>;
beforeEach(() => {
  logs = logMemory();
  initLogger({ providers: [logs] });
  slice.exportProject.mockReset().mockResolvedValue({});
  slice.getProjectKind.mockReset().mockResolvedValue("program");
  utils.PgView.setToast.mockReset();
  utils.PgView.closeModal.mockReset();
});
afterEach(() => resetLogger());

const draw = (name?: string) =>
  render(
    <ThemeProvider theme={anyTheme}>
      <Modal open>
        <ModalIdContext.Provider value="export">
          <ModalLayerContext.Provider value>
            <ExportWorkspace name={name} />
          </ModalLayerContext.Provider>
        </ModalIdContext.Provider>
      </Modal>
    </ThemeProvider>
  );

const toastNames = () =>
  utils.PgView.setToast.mock.calls.map(
    ([, props]) => (props as { options: { name: string } }).options.name
  );

it("exports the named project as is", async () => {
  draw("beta");
  expect(screen.getByText("Export beta")).toBeTruthy();

  fireEvent.click(
    screen.getByRole("button", { name: /export without changes/i })
  );

  await waitFor(() =>
    expect(utils.PgView.closeModal).toHaveBeenCalledWith(null, "export")
  );
  expect(slice.exportProject).toHaveBeenCalledWith({
    convert: false,
    name: "beta",
  });
});

it("tells the user a conversion failed and exports as is", async () => {
  slice.exportProject
    .mockRejectedValueOnce(new Error("Could not identify framework"))
    .mockResolvedValueOnce({});
  draw("beta");

  fireEvent.click(screen.getByRole("button", { name: /convert and export/i }));

  await waitFor(() =>
    expect(utils.PgView.closeModal).toHaveBeenCalledWith(null, "export")
  );
  expect(slice.exportProject.mock.calls).toEqual([
    [{ convert: true, name: "beta" }],
    [{ convert: false, name: "beta" }],
  ]);
  expect(toastNames()).toEqual(["export-convert-failed"]);
});

it("does not report a project of no known framework, only notes it", async () => {
  slice.exportProject
    .mockRejectedValueOnce(new Error("Could not identify framework"))
    .mockResolvedValueOnce({});
  draw("beta");

  fireEvent.click(screen.getByRole("button", { name: /convert and export/i }));

  await waitFor(() =>
    expect(utils.PgView.closeModal).toHaveBeenCalledWith(null, "export")
  );
  expect(logs.entries.filter((entry) => entry.report)).toEqual([]);
});

it("reports a conversion that failed for another reason", async () => {
  const failure = new Error("convertFromPlayground blew up");
  slice.exportProject.mockRejectedValueOnce(failure).mockResolvedValueOnce({});
  draw("beta");

  fireEvent.click(screen.getByRole("button", { name: /convert and export/i }));

  await waitFor(() => expect(toastNames()).toEqual(["export-convert-failed"]));
  expect(logs.entries).toEqual([
    expect.objectContaining({
      error: failure,
      report: true,
      context: { step: "convert" },
    }),
  ]);
});

it("says only that the export failed when the fallback fails too", async () => {
  // A project that cannot be read fails the conversion and the plain export
  slice.exportProject.mockRejectedValue(new Error("ENOENT"));
  draw("beta");

  fireEvent.click(screen.getByRole("button", { name: /convert and export/i }));

  await waitFor(() => expect(toastNames()).toEqual(["export-failed"]));
  expect(utils.PgView.closeModal).not.toHaveBeenCalled();
});

it("tells the user an export failed, and reports it", async () => {
  const failure = new Error("quota exceeded");
  slice.exportProject.mockRejectedValue(failure);
  draw("beta");

  fireEvent.click(
    screen.getByRole("button", { name: /export without changes/i })
  );

  await waitFor(() => expect(toastNames()).toEqual(["export-failed"]));
  expect(utils.PgView.closeModal).not.toHaveBeenCalled();
  expect(logs.entries).toEqual([
    expect.objectContaining({
      ns: "explorer:export-workspace",
      error: failure,
      report: true,
    }),
  ]);
});

it("names the open project when given no name", () => {
  draw();
  expect(screen.getByText("Export open-one")).toBeTruthy();
});

it("asks to make a project with no program a Node project", async () => {
  slice.getProjectKind.mockResolvedValue("no-program");
  draw("beta");

  expect(await screen.findByText("Make it a Node project?")).toBeTruthy();
  expect(screen.queryByText("Convert the project layout?")).toBeNull();
  expect(screen.getByText("package.json")).toBeTruthy();
  expect(screen.getByText("https://api.devnet.solana.com")).toBeTruthy();
  expect(screen.getByText(slice.DEFAULT_KEYPAIR_PATH)).toBeTruthy();
  expect(screen.getByText(slice.RPC_URL_VARIABLE)).toBeTruthy();
  expect(slice.getProjectKind).toHaveBeenCalledWith("beta");
  // Both buttons keep their labels
  expect(
    screen.getByRole("button", { name: /convert and export/i })
  ).toBeTruthy();
  expect(
    screen.getByRole("button", { name: /export without changes/i })
  ).toBeTruthy();
});

it("keeps the layout question for a project with a program", async () => {
  draw("beta");

  await waitFor(() => expect(slice.getProjectKind).toHaveBeenCalled());
  expect(screen.getByText("Convert the project layout?")).toBeTruthy();
});

it("converts a project with no program with no fallback toast", async () => {
  slice.getProjectKind.mockResolvedValue("no-program");
  slice.exportProject.mockResolvedValue({ readme: "# beta" });
  draw("beta");

  fireEvent.click(screen.getByRole("button", { name: /convert and export/i }));

  await waitFor(() =>
    expect(slice.exportProject).toHaveBeenCalledWith({
      convert: true,
      name: "beta",
    })
  );
  expect(toastNames()).toEqual([]);
});

it("does not fall back when the converted zip did not download", async () => {
  slice.exportProject.mockRejectedValueOnce(new slice.DownloadError("quota"));
  draw("beta");

  fireEvent.click(screen.getByRole("button", { name: /convert and export/i }));

  await waitFor(() => expect(toastNames()).toEqual(["export-failed"]));
  expect(slice.exportProject).toHaveBeenCalledTimes(1);
  expect(utils.PgView.closeModal).not.toHaveBeenCalled();
});

it("keeps the layout question when the project cannot be read", async () => {
  slice.getProjectKind.mockRejectedValue(new Error("EIO"));
  draw("beta");

  await waitFor(() =>
    expect(logs.entries).toEqual([expect.objectContaining({ level: "warn" })])
  );
  expect(screen.getByText("Convert the project layout?")).toBeTruthy();
  expect(toastNames()).toEqual([]);
});
