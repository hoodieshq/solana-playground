import {
  ComponentPropsWithoutRef,
  forwardRef,
  MouseEvent,
  ReactNode,
} from "react";

import {
  EditorTab,
  EditorTabClose,
  EditorTabLabel,
  EditorTabTrigger,
} from "@/shared/ui/editor-tabs";
import { cn } from "cn";

/** How a tab takes part in a drag: `source` is the tab left in its place,
 * `overlay` the copy that follows the pointer */
export type EditorTabDrag = "source" | "overlay";

export interface BaseEditorTabProps
  extends Omit<ComponentPropsWithoutRef<"div">, "onSelect"> {
  path: string;
  name: string;
  icon: ReactNode;
  current: boolean;
  menuOpen: boolean;
  onSelect: () => void;
  onClose: () => void;
  /** Absent while no drag involves this tab */
  drag?: EditorTabDrag;
}

/** One open file, drawn from the design system. Presentational: what a click
 * does comes in through `onSelect` and `onClose`. The rest props (the
 * sortable's attributes and listeners, a context menu trigger's handlers)
 * land on the root, which is why it forwards its ref. */
export const BaseEditorTab = forwardRef<HTMLDivElement, BaseEditorTabProps>(
  (
    {
      path,
      name,
      icon,
      current,
      menuOpen,
      onSelect,
      onClose,
      drag,
      className,
      ...props
    },
    ref
  ) => {
    const close = (ev: MouseEvent<HTMLButtonElement>) => {
      // The tab must not be selected first
      ev.stopPropagation();
      onClose();
    };

    return (
      <EditorTab
        ref={ref}
        id={path}
        title={path}
        active={current}
        menuOpen={menuOpen}
        data-drag={drag}
        // The trigger takes the tab's left padding and the gap before close,
        // so a click anywhere up to the close button selects the tab
        className={cn(
          "gap-0 pl-0 data-[drag=source]:opacity-60 data-[drag=overlay]:bg-surface data-[drag=overlay]:text-foreground data-[drag=overlay]:shadow-lg data-[drag=overlay]:ring-1 data-[drag=overlay]:ring-border",
          className
        )}
        {...props}
      >
        <EditorTabTrigger onClick={onSelect} className="pr-1 pl-3">
          {icon}
          <EditorTabLabel>{name}</EditorTabLabel>
        </EditorTabTrigger>
        <EditorTabClose
          aria-label={`Close ${name}`}
          title="Close (Alt+W)"
          onClick={close}
          // The drag sensor listens for mousedown on the root
          onMouseDown={(ev) => ev.stopPropagation()}
        />
      </EditorTab>
    );
  }
);
BaseEditorTab.displayName = "BaseEditorTab";
