import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { PgExplorer } from "../../../../utils";

import { ExplorerContextMenu } from "./ExplorerContextMenu";

// The utils barrel needs build-time globals the unit runner does not define.
vi.mock("../../../../utils", () => ({
  PgExplorer: { removeCtxSelectedEl: vi.fn() },
  PgView: { ids: { ROOT_DIR: "root-dir" } },
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

  it("closes on Escape without running a handler and clears the selection", async () => {
    const props = makeProps(() => true);
    const clear = vi.mocked(PgExplorer.removeCtxSelectedEl);
    clear.mockClear();
    renderMenu(props);

    fireEvent.contextMenu(screen.getByTestId("target"));
    await screen.findByRole("menu");
    fireEvent.keyDown(screen.getByRole("menu"), { key: "Escape" });

    expect(screen.queryByRole("menu")).toBeNull();
    expect(props.renameItem).not.toHaveBeenCalled();
    expect(props.deleteItem).not.toHaveBeenCalled();
    expect(clear).toHaveBeenCalled();
  });

  it("closes on an outside press without running a handler and clears the selection", async () => {
    const props = makeProps(() => true);
    const clear = vi.mocked(PgExplorer.removeCtxSelectedEl);
    clear.mockClear();
    renderMenu(props);

    fireEvent.contextMenu(screen.getByTestId("target"));
    await screen.findByRole("menu");
    fireEvent.pointerDown(document.body);

    await waitFor(() => expect(screen.queryByRole("menu")).toBeNull());
    expect(props.renameItem).not.toHaveBeenCalled();
    expect(props.deleteItem).not.toHaveBeenCalled();
    expect(clear).toHaveBeenCalled();
  });

  it("focuses the new-item input after New File, not the trigger", async () => {
    const props = makeProps(() => true);
    props.itemData = { isFolder: true };
    // What the explorer's portal puts in the tree
    const root = document.createElement("div");
    root.id = "root-dir";
    const input = document.createElement("input");
    root.appendChild(input);
    document.body.appendChild(root);
    renderMenu(props);

    fireEvent.contextMenu(screen.getByTestId("target"));
    fireEvent.click(await screen.findByRole("menuitem", { name: /New File/ }));

    await waitFor(() => expect(document.activeElement).toBe(input));
    root.remove();
  });

  it("leaves focus to Radix's return to the trigger after Rename and Delete", async () => {
    for (const name of [/Rename/, /Delete/]) {
      const props = makeProps(() => true);
      const { unmount } = renderMenu(props);
      const target = screen.getByTestId("target");
      // A right-click focuses the item first, as a browser does
      target.tabIndex = 0;
      target.focus();

      fireEvent.contextMenu(target);
      fireEvent.click(await screen.findByRole("menuitem", { name }));

      await waitFor(() => expect(document.activeElement).toBe(target));
      unmount();
    }
  });
});
