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

export interface BaseEditorTabProps
  extends Omit<ComponentPropsWithoutRef<"div">, "onSelect"> {
  path: string;
  name: string;
  icon: ReactNode;
  current: boolean;
  menuOpen: boolean;
  onSelect: () => void;
  onClose: () => void;
  /** The tab is the one being dragged in place */
  isDragging?: boolean;
  /** The tab is the copy that follows the pointer */
  isDragOverlay?: boolean;
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
      isDragging = false,
      isDragOverlay = false,
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
        data-dragging={isDragging || undefined}
        data-drag-overlay={isDragOverlay || undefined}
        className={cn(
          "data-dragging:opacity-60 data-drag-overlay:bg-surface data-drag-overlay:text-foreground data-drag-overlay:shadow-lg data-drag-overlay:ring-1 data-drag-overlay:ring-border",
          className
        )}
        {...props}
      >
        <EditorTabTrigger onClick={onSelect}>
          {icon}
          <EditorTabLabel>{name}</EditorTabLabel>
        </EditorTabTrigger>
        <EditorTabClose
          aria-label={`Close ${name}`}
          title="Close (Alt+W)"
          onClick={close}
          // A press on close must not start a drag
          onPointerDown={(ev) => ev.stopPropagation()}
        />
      </EditorTab>
    );
  }
);
BaseEditorTab.displayName = "BaseEditorTab";
