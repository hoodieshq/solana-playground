import { cn } from "cn";
import { ChevronDown, ChevronLeft, Folder, Menu, Play, X } from "lucide-react";
import { useEffect, useLayoutEffect, useRef } from "react";
import type { CSSProperties, ReactNode } from "react";

import { Outlet } from "@/shared/lib/outlet";
import { Button } from "@/shared/ui/button";
import { Segmented, SegmentedItem } from "@/shared/ui/segmented";
import { Sheet, SheetContent, SheetTitle } from "@/shared/ui/sheet";
import { PHONE_PAGES } from "../model/phone-pages";
import type { PhonePage, WorkView } from "../model/phone-pages";

/** How long a scroll must rest before it counts as a swipe that settled */
export const SWIPE_SETTLE_MS = 120;

export interface BasePhonePagerProps {
  page: PhonePage;
  /** A swipe settled on another page */
  onSwipe: (page: PhonePage) => void;
  /** A bar's button asked for a page */
  onGo: (page: PhonePage) => void;
  view: WorkView;
  onView: (view: WorkView) => void;
  /** The open project's name, in the work page's bar */
  title: string;
  /** The open file, for the picker; null with no file open */
  file: { dir: string; name: string } | null;
  filesOpen: boolean;
  onFilesOpenChange: (open: boolean) => void;
  /** The stage shows on the work page (Code) at `write`, else on the preview */
  stageOn: "work" | "preview";
  menu: ReactNode;
  assistant: ReactNode;
  files: ReactNode;
  stageBar: ReactNode;
  stageNode: HTMLDivElement;
  consoleNode: HTMLDivElement;
  /** The console's height on the preview: open, or its folded bar */
  consoleOpen: boolean;
  sheetFont?: CSSProperties;
}

/** Where a page of the pager starts, as `scrollLeft` */
const alignTo = (el: HTMLElement, index: number) => {
  el.scrollLeft = index * el.clientWidth;
};

const PhoneBar = ({ children }: { children: ReactNode }) => (
  <div
    data-testid="phone-bar"
    className="flex h-phone-bar shrink-0 items-center gap-2 border-b border-border px-2"
  >
    {children}
  </div>
);

/** "src/ lib.rs": names the open file and opens Files */
const FilePicker = ({
  file,
  onOpen,
}: {
  file: BasePhonePagerProps["file"];
  onOpen: () => void;
}) => (
  <button
    type="button"
    aria-label={file ? `Files, ${file.name} open` : "Files"}
    onClick={onOpen}
    className="flex h-12 shrink-0 items-center gap-1 border-b border-border px-4 text-sm"
  >
    <Folder className="size-4" aria-hidden />
    {file && <span className="text-muted-foreground">{file.dir}</span>}
    <span className="font-semibold">{file?.name ?? "Files"}</span>
    <ChevronDown className="size-4" aria-hidden />
  </button>
);

/**
 * Three pages side by side, swiped between: the navigation, the work (Chat or
 * Code) and the preview. Markup only: the page and the view are the caller's.
 * The stage and the console are the outlets' nodes, so they are not remounted
 * by moving between pages or by crossing `LAYOUT_BREAKPOINTS.phone`.
 */
const BasePhonePager = (props: BasePhonePagerProps) => {
  const ref = useRef<HTMLDivElement>(null);
  const index = PHONE_PAGES.indexOf(props.page);
  // Smooth by CSS (`scroll-smooth`). The scroll this causes settles on the
  // page given, so `onScroll` reports nothing for it.
  useLayoutEffect(() => {
    alignTo(ref.current!, index);
  }, [index]);
  // A rotation changes the page width: put the page back, not between two
  useEffect(() => {
    const align = () => alignTo(ref.current!, index);
    window.addEventListener("resize", align);
    return () => window.removeEventListener("resize", align);
  }, [index]);
  // `scrollend` is missing on Safari before 26, so a rest of the scroll
  // stands in for it
  const settle = useRef<number>(undefined);
  const onScroll = () => {
    window.clearTimeout(settle.current);
    settle.current = window.setTimeout(() => {
      const el = ref.current;
      if (!el || el.clientWidth === 0) return;
      const at = PHONE_PAGES[Math.round(el.scrollLeft / el.clientWidth)];
      if (at && at !== props.page) props.onSwipe(at);
    }, SWIPE_SETTLE_MS);
  };
  useEffect(() => () => window.clearTimeout(settle.current), []);
  return (
    <div
      ref={ref}
      data-testid="phone-pager"
      onScroll={onScroll}
      className="flex h-full w-full snap-x snap-mandatory overflow-x-auto overflow-y-hidden scroll-smooth [scrollbar-width:none]"
    >
      <section
        aria-label="Navigation"
        className="flex h-full w-full shrink-0 snap-start flex-col"
      >
        <PhoneBar>
          <Button
            variant="ghost"
            size="icon"
            aria-label="Close the menu"
            onClick={() => props.onGo("work")}
          >
            <X />
          </Button>
        </PhoneBar>
        <div className="min-h-0 flex-1 overflow-y-auto">{props.menu}</div>
      </section>
      <section
        aria-label="Work"
        className="flex h-full w-full shrink-0 snap-start flex-col"
      >
        <PhoneBar>
          <Button
            variant="ghost"
            size="icon"
            aria-label="Menu"
            onClick={() => props.onGo("menu")}
          >
            <Menu />
          </Button>
          <span className="min-w-0 flex-1 truncate font-semibold">
            {props.title}
          </span>
          {/* The segmented's root is a radiogroup; the group names the pair
            for the tests and for readers that look for a group */}
          <div role="group" aria-label="Show">
            <Segmented
              aria-label="Show"
              value={props.view}
              onValueChange={(v) => props.onView(v as WorkView)}
            >
              <SegmentedItem value="chat">Chat</SegmentedItem>
              <SegmentedItem value="code">Code</SegmentedItem>
            </Segmented>
          </div>
          <Button
            variant="ghost"
            size="icon"
            aria-label="Preview the build"
            onClick={() => props.onGo("preview")}
          >
            <Play />
          </Button>
        </PhoneBar>
        <div
          className={cn(
            "flex min-h-0 flex-1 flex-col",
            props.view !== "chat" && "hidden"
          )}
        >
          {props.assistant}
        </div>
        <div
          className={cn(
            "flex min-h-0 flex-1 flex-col",
            props.view !== "code" && "hidden"
          )}
        >
          <FilePicker
            file={props.file}
            onOpen={() => props.onFilesOpenChange(true)}
          />
          {props.stageOn === "work" && (
            <Outlet
              node={props.stageNode}
              className="flex min-h-0 flex-1 flex-col"
            />
          )}
        </div>
      </section>
      <section
        aria-label="Preview"
        className="flex h-full w-full shrink-0 snap-start flex-col"
      >
        <PhoneBar>
          <Button
            variant="ghost"
            size="icon"
            aria-label="Back to the code"
            onClick={() => props.onGo("work")}
          >
            <ChevronLeft />
          </Button>
          <div className="min-w-0 flex-1 overflow-x-auto">{props.stageBar}</div>
        </PhoneBar>
        {props.stageOn === "preview" && (
          <Outlet
            node={props.stageNode}
            className="flex min-h-0 flex-1 flex-col"
          />
        )}
        <Outlet
          node={props.consoleNode}
          className={cn(
            "flex min-h-0 flex-col",
            props.consoleOpen ? "h-2/5" : "h-auto"
          )}
        />
      </section>
      <Sheet open={props.filesOpen} onOpenChange={props.onFilesOpenChange}>
        <SheetContent
          side="left"
          aria-describedby={undefined}
          className="w-full p-0 data-[side=left]:w-full data-[side=left]:sm:max-w-full"
          style={props.sheetFont}
        >
          <SheetTitle className="px-4 pt-4">Files</SheetTitle>
          {props.files}
        </SheetContent>
      </Sheet>
    </div>
  );
};

export default BasePhonePager;
