import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { ExplorerContextMenu } from "./ExplorerContextMenu";

// The utils barrel needs build-time globals the unit runner does not define.
vi.mock("../../../../utils", () => ({
  PgExplorer: { removeCtxSelectedEl: vi.fn() },
}));

// The icons are styled-components that read the app theme; they are not what
// is under test.
vi.mock("../../../../components/Icons", () => {
  const Icon = () => <svg aria-hidden />;
  return {
    Edit: Icon,
    NewFile: Icon,
    NewFolder: Icon,
    Rocket: Icon,
    RunAll: Icon,
    TestPaper: Icon,
    TestTube: Icon,
    Trash: Icon,
    Triangle: Icon,
    Wrench: Icon,
  };
});

const makeProps = (handleMenu: () => boolean) => ({
  itemData: { isFolder: false },
  ctxNewItem: vi.fn(),
  renameItem: vi.fn(),
  deleteItem: vi.fn(),
  runBuild: vi.fn(),
  runDeploy: vi.fn(),
  runClient: vi.fn(),
  runClientFolder: vi.fn(),
  runTest: vi.fn(),
  runTestFolder: vi.fn(),
  handleMenu,
});

const renderMenu = (props: ReturnType<typeof makeProps>) =>
  render(
    <ExplorerContextMenu
      itemData={props.itemData}
      ctxNewItem={props.ctxNewItem}
      renameItem={props.renameItem}
      deleteItem={props.deleteItem}
      runBuild={props.runBuild}
      runDeploy={props.runDeploy}
      runClient={props.runClient}
      runClientFolder={props.runClientFolder}
      runTest={props.runTest}
      runTestFolder={props.runTestFolder}
      handleMenu={props.handleMenu}
    >
      <div data-testid="target">item</div>
    </ExplorerContextMenu>
  );

describe("ExplorerContextMenu", () => {
  it("opens a menu of menuitems with shortcuts and runs the chosen one", async () => {
    const props = makeProps(() => true);
    renderMenu(props);

    fireEvent.contextMenu(screen.getByTestId("target"));

    const rename = await screen.findByRole("menuitem", { name: /Rename/ });
    expect(rename.textContent).toContain("F2");

    fireEvent.click(rename);

    expect(props.renameItem).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole("menu")).toBeNull();
  });

  it("opens no menu when handleMenu declines the target", () => {
    const props = makeProps(() => false);
    renderMenu(props);

    const target = screen.getByTestId("target");
    const notPrevented = fireEvent.contextMenu(target);

    expect(screen.queryByRole("menu")).toBeNull();
    expect(notPrevented).toBe(false);
  });
});
