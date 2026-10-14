import { fireEvent, render, screen } from "@testing-library/react";
import { ThemeProvider, type DefaultTheme } from "styled-components";
import { describe, expect, it, vi } from "vitest";

import ImportButton from ".";

// The import note reads two theme keys; the full theme cannot be built here.
const theme = {
  colors: { default: { textSecondary: "gray" } },
  font: { code: { size: { small: "12px" } } },
} as unknown as DefaultTheme;

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
});
