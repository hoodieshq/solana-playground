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

import ExportProject from "./ExportProject";

describe("ExportProject", () => {
  beforeEach(() => {
    exportWorkspace.mockClear();
    explorer.currentWorkspaceName = "my-anchor-app";
  });

  it("names the project it exports", () => {
    render(<ExportProject />);

    expect(
      screen.getByRole("button", { name: "Export my-anchor-app (zip)" })
    ).toBeTruthy();
  });

  it("exports the project it names", async () => {
    render(<ExportProject />);

    await userEvent.click(screen.getByRole("button"));

    expect(exportWorkspace).toHaveBeenCalledWith({ name: "my-anchor-app" });
  });

  it("has nothing to export with no project open", () => {
    explorer.currentWorkspaceName = undefined;
    render(<ExportProject />);

    const button = screen.getByRole("button", { name: "Export project (zip)" });
    expect((button as HTMLButtonElement).disabled).toBe(true);
  });
});
