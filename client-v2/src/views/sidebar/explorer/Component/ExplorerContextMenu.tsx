import { FC } from "react";

import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuShortcut,
  ContextMenuTrigger,
} from "@/shared/ui/context-menu";
import { MenuItemText } from "@/shared/ui/menu-extras";
import {
  Edit,
  NewFile,
  NewFolder,
  Rocket,
  RunAll,
  TestPaper,
  TestTube,
  Trash,
  Triangle,
  Wrench,
} from "../../../../components/Icons";
import { PgExplorer } from "../../../../utils";
import type { useExplorerContextMenu } from "./useExplorerContextMenu";

type ExplorerContextMenuProps = Pick<
  ReturnType<typeof useExplorerContextMenu>,
  | "itemData"
  | "ctxNewItem"
  | "renameItem"
  | "deleteItem"
  | "runBuild"
  | "runDeploy"
  | "runClient"
  | "runClientFolder"
  | "runTest"
  | "runTestFolder"
  | "handleMenu"
>;

export const ExplorerContextMenu: FC<
  React.PropsWithChildren<ExplorerContextMenuProps>
> = ({
  itemData,
  ctxNewItem,
  renameItem,
  deleteItem,
  runBuild,
  runDeploy,
  runClient,
  runClientFolder,
  runTest,
  runTestFolder,
  handleMenu,
  children,
}) => {
  return (
    <ContextMenu
      onOpenChange={(open) => {
        if (!open) PgExplorer.removeCtxSelectedEl();
      }}
    >
      <ContextMenuTrigger
        asChild
        onContextMenu={(ev) => {
          // Radix skips its own handler once the default is prevented, and the
          // browser's menu stays shut too: no menu at all on the root folder.
          if (!handleMenu(ev)) ev.preventDefault();
        }}
      >
        {children}
      </ContextMenuTrigger>
      <ContextMenuContent>
        {itemData.isFolder && (
          <>
            <ContextMenuItem onSelect={ctxNewItem}>
              <NewFile />
              <MenuItemText>New File</MenuItemText>
              <ContextMenuShortcut>ALT+N</ContextMenuShortcut>
            </ContextMenuItem>
            <ContextMenuItem onSelect={ctxNewItem}>
              <NewFolder />
              <MenuItemText>New Folder</MenuItemText>
              <ContextMenuShortcut>ALT+N</ContextMenuShortcut>
            </ContextMenuItem>
          </>
        )}
        <ContextMenuItem onSelect={renameItem}>
          <Edit />
          <MenuItemText>Rename</MenuItemText>
          <ContextMenuShortcut>F2</ContextMenuShortcut>
        </ContextMenuItem>
        <ContextMenuItem variant="destructive" onSelect={deleteItem}>
          <Trash />
          <MenuItemText>Delete</MenuItemText>
          <ContextMenuShortcut>Del</ContextMenuShortcut>
        </ContextMenuItem>
        {itemData.isProgramFolder && (
          <>
            <ContextMenuItem onSelect={runBuild}>
              <Wrench />
              Build
            </ContextMenuItem>
            <ContextMenuItem onSelect={runDeploy}>
              <Rocket />
              Deploy
            </ContextMenuItem>
          </>
        )}
        {itemData.isClient && (
          <ContextMenuItem onSelect={runClient}>
            <Triangle rotate="90deg" />
            Run
          </ContextMenuItem>
        )}
        {itemData.isClientFolder && (
          <ContextMenuItem onSelect={runClientFolder}>
            <RunAll />
            Run All
          </ContextMenuItem>
        )}
        {itemData.isTest && (
          <ContextMenuItem onSelect={runTest}>
            <TestTube />
            Test
          </ContextMenuItem>
        )}
        {itemData.isTestFolder && (
          <ContextMenuItem onSelect={runTestFolder}>
            <TestPaper />
            Test All
          </ContextMenuItem>
        )}
      </ContextMenuContent>
    </ContextMenu>
  );
};
