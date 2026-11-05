import { Search } from "lucide-react";
import { useRef } from "react";

import { cn } from "@/shared/lib/utils";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/shared/ui/input-group";

export interface FoldingSearchProps {
  /** The list's things, plural and lowercase; names the field */
  label: string;
  placeholder: string;
  query: string;
  onQuery: (query: string) => void;
  /** Open on a phone: the field takes the row */
  open: boolean;
  onOpen: (open: boolean) => void;
}

/**
 * The Tutorials page's search, as the tutorial-v2 prototype folds it
 * (`desktop/Gallery.tsx`, `TutorialsBody`): a field on a wide screen, a 44 px
 * glass on a phone that opens into the whole row, with Cancel to give it back.
 * The field is mounted all along and only hidden, so the focus can go to it
 * inside the press: a phone raises its keyboard only for a focus the tap made.
 */
const FoldingSearch = ({
  label,
  placeholder,
  query,
  onQuery,
  open,
  onOpen,
}: FoldingSearchProps) => {
  const input = useRef<HTMLInputElement>(null);
  const close = () => {
    onQuery("");
    onOpen(false);
  };
  return (
    <>
      <InputGroup
        className={cn(
          "relative w-80 max-w-80",
          open
            ? "max-md:h-11 max-md:w-auto max-md:max-w-none max-md:min-w-0 max-md:flex-1 max-md:rounded-[10px]"
            : // With no filter after it, the glass's glyph meets the gutter
              "max-md:size-11 max-md:justify-center max-md:border-transparent max-md:bg-transparent max-md:last:-mr-[11px] max-md:dark:bg-transparent"
        )}
      >
        <InputGroupAddon
          className={cn(!open && "max-md:p-0 max-md:text-muted-foreground/80")}
        >
          <Search
            strokeWidth={1.5}
            aria-hidden="true"
            className={cn("size-4", !open && "max-md:size-[1.375rem]")}
          />
        </InputGroupAddon>
        <InputGroupInput
          ref={input}
          type="search"
          placeholder={placeholder}
          aria-label={`Search ${label}`}
          value={query}
          onChange={(e) => onQuery(e.target.value)}
          onFocus={() => onOpen(true)}
          onKeyDown={(e) => {
            // Esc takes back what was typed, then the open row
            if (e.key !== "Escape") return;
            if (query) onQuery("");
            else onOpen(false);
          }}
          // 16 px on a phone: under it the browser zooms the page in on focus
          className={cn(
            "max-md:text-[1rem]",
            !open && "max-md:absolute max-md:w-px max-md:opacity-0"
          )}
        />
        {!open && (
          <button
            type="button"
            aria-label={`Search ${label}`}
            onClick={() => input.current?.focus()}
            className="absolute inset-0 hidden rounded-[inherit] outline-none focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-brand-purple max-md:block"
          />
        )}
      </InputGroup>
      {open && (
        <button
          type="button"
          onClick={close}
          className="-mr-2 hidden h-11 shrink-0 px-2 text-[0.9375rem] text-foreground/80 transition-opacity active:opacity-60 max-md:block"
        >
          Cancel
        </button>
      )}
    </>
  );
};

export default FoldingSearch;
