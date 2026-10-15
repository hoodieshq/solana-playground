import {
  ComponentPropsWithoutRef,
  forwardRef,
  useCallback,
  useMemo,
  useState,
} from "react";

import { BaseEditorTab } from "./BaseEditorTab";
import LangIcon from "../LangIcon";
import { PgExplorer } from "../../utils";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuShortcut,
  ContextMenuTrigger,
} from "@/shared/ui/context-menu";
import { MenuItemText } from "@/shared/ui/menu-extras";
import type { SortableItemCommonProps } from "../Dnd/Sortable";

interface TabProps extends ComponentPropsWithoutRef<"div"> {
  path: string;
  index: number;
}

const Tab = forwardRef<HTMLDivElement, TabProps>(
  ({ path, index, ...rest }, ref) => {
    // The sortable also hands over its own bookkeeping (`Item`, `id`, and
    // `sortable` on the drag overlay); none of it belongs on a DOM node
    const {
      Item: _Item,
      sortable: _sortable,
      id: _id,
      ...props
    } = rest as typeof rest & { Item?: unknown; sortable?: unknown };
    const [isSelected, setIsSelected] = useState(false);

    const fileName = useMemo(
      () => PgExplorer.getItemNameFromPath(path),
      [path]
    );

    const changeTab = useCallback(() => PgExplorer.openFile(path), [path]);

    const closeFile = useCallback(() => PgExplorer.closeFile(path), [path]);

    const closeOthers = useCallback(() => {
      PgExplorer.tabs
        .filter((tabPath) => tabPath !== path)
        .forEach((tabPath) => PgExplorer.closeFile(tabPath));
    }, [path]);

    const closeToTheRight = useCallback(() => {
      const tabIndex = PgExplorer.tabs.findIndex((tabPath) => tabPath === path);
      PgExplorer.tabs
        .slice(tabIndex + 1)
        .forEach((tabPath) => PgExplorer.closeFile(tabPath));
    }, [path]);

    const closeAll = useCallback(() => {
      // Clone the tabs before closing because `PgExplorer.closeFile` mutates
      // the existing tabs array
      [...PgExplorer.tabs].forEach((tabPath) => PgExplorer.closeFile(tabPath));
    }, []);

    return (
      <ContextMenu onOpenChange={setIsSelected}>
        <ContextMenuTrigger asChild>
          <BaseEditorTab
            ref={ref}
            path={path}
            name={fileName}
            icon={<LangIcon path={path} />}
            current={path === PgExplorer.currentFilePath}
            menuOpen={isSelected}
            onSelect={changeTab}
            onClose={closeFile}
            {...(props as SortableItemCommonProps)}
          />
        </ContextMenuTrigger>
        {/* Every label is a MenuItemText: one element to match, and the shortcut stays at the far edge */}
        <ContextMenuContent>
          <ContextMenuItem onSelect={closeFile}>
            <MenuItemText>Close</MenuItemText>
            <ContextMenuShortcut>ALT+W</ContextMenuShortcut>
          </ContextMenuItem>
          {PgExplorer.tabs.length > 1 && (
            <ContextMenuItem onSelect={closeOthers}>
              <MenuItemText>Close Others</MenuItemText>
            </ContextMenuItem>
          )}
          {PgExplorer.tabs.length - 1 > index && (
            <ContextMenuItem onSelect={closeToTheRight}>
              <MenuItemText>Close To The Right</MenuItemText>
            </ContextMenuItem>
          )}
          <ContextMenuItem onSelect={closeAll}>
            <MenuItemText>Close All</MenuItemText>
          </ContextMenuItem>
        </ContextMenuContent>
      </ContextMenu>
    );
  }
);

export default Tab;
