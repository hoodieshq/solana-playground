import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { ThemeProvider, type DefaultTheme } from "styled-components";
import { afterEach, describe, expect, it, vi } from "vitest";

import { initLogger, memoryProvider, resetLogger } from "@/shared/lib/logger";

import ImportButton from ".";

// The import note reads two theme keys; the full theme cannot be built here.
const theme = {
  colors: { default: { textSecondary: "gray" } },
  font: { code: { size: { small: "12px" } } },
} as unknown as DefaultTheme;

afterEach(() => resetLogger());

describe("ImportButton", () => {
  it("opens the file picker and names the chosen file", async () => {
    const onImport = vi.fn().mockResolvedValue(undefined);
    const { container } = render(
      <ThemeProvider theme={theme}>
        <ImportButton onImport={onImport} showImportText>
          Import
        </ImportButton>
      </ThemeProvider>
    );
    const input = container.querySelector(
      'input[type="file"]'
    ) as HTMLInputElement;
    const click = vi.spyOn(input, "click");

    fireEvent.click(screen.getByRole("button", { name: "Import" }));
    expect(click).toHaveBeenCalled();

    const file = new File(["{}"], "idl.json", { type: "application/json" });
    fireEvent.change(input, { target: { files: [file] } });
    expect(onImport).toHaveBeenCalled();
    expect(await screen.findByText("idl.json")).toBeTruthy();
  });

  it("is a design-system button", () => {
    render(<ImportButton onImport={vi.fn()}>Import</ImportButton>);
    expect(screen.getByRole("button").getAttribute("data-slot")).toBe("button");
  });

  it("opens the picker from its own child when it is not a button", () => {
    const { container } = render(
      <ThemeProvider theme={theme}>
        <ImportButton onImport={vi.fn()} noButton>
          <span>Pick a file</span>
        </ImportButton>
      </ThemeProvider>
    );
    const input = container.querySelector(
      'input[type="file"]'
    ) as HTMLInputElement;
    const click = vi.spyOn(input, "click");

    expect(screen.queryByRole("button")).toBeNull();
    fireEvent.click(screen.getByText("Pick a file"));
    expect(click).toHaveBeenCalled();
  });

  it("reports an import that fails, and shows no file name for it", async () => {
    const memory = memoryProvider();
    initLogger({ providers: [memory] });
    const failure = new Error("bad idl");
    const onImport = vi.fn().mockRejectedValue(failure);
    const { container } = render(
      <ThemeProvider theme={theme}>
        <ImportButton onImport={onImport} showImportText>
          Import
        </ImportButton>
      </ThemeProvider>
    );
    const input = container.querySelector(
      'input[type="file"]'
    ) as HTMLInputElement;

    const file = new File(["{}"], "idl.json", { type: "application/json" });
    fireEvent.change(input, { target: { files: [file] } });

    await waitFor(() =>
      expect(memory.entries).toEqual([
        expect.objectContaining({
          ns: "ui:button",
          error: failure,
          report: true,
        }),
      ])
    );
    expect(screen.queryByText("idl.json")).toBeNull();
  });
});
