import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

// The utils barrel reads a build-time global and cannot load under vitest
const { exportWorkspace, explorer } = vi.hoisted(() => ({
  exportWorkspace: vi.fn<(opts?: { name?: string }) => Promise<object>>(),
  explorer: { currentWorkspaceName: "my-anchor-app" as string | undefined },
}));
vi.mock("@/utils", () => ({ PgFramework: { exportWorkspace } }));
vi.mock("@/hooks", () => ({ useExplorer: () => explorer }));

import ExportProject, { OpenProjectLine } from "./ExportProject";

const button = () =>
  screen.getByRole<HTMLButtonElement>("button", {
    name: "Export project (zip)",
  });

describe("Settings › Project export", () => {
  beforeEach(() => {
    exportWorkspace.mockClear();
    explorer.currentWorkspaceName = "my-anchor-app";
  });

  it("names the project it exports", () => {
    render(<OpenProjectLine phone={false} />);

    const line = screen.getByTestId("settings-open-project");
    expect(line.textContent).toBe(
      "Exports my-anchor-app, the project open now."
    );
    // Truncated on one line; the whole name stays in the title
    expect(line.title).toBe(line.textContent);
  });

  it("exports the project it names", async () => {
    render(<ExportProject />);

    await userEvent.click(button());

    expect(exportWorkspace).toHaveBeenCalledWith({ name: "my-anchor-app" });
  });

  it("has nothing to export with no project open", () => {
    explorer.currentWorkspaceName = undefined;
    render(
      <>
        <OpenProjectLine phone={false} />
        <ExportProject />
      </>
    );

    expect(screen.getByTestId("settings-open-project").textContent).toBe(
      "No project is open."
    );
    expect(button().disabled).toBe(true);
  });
});
