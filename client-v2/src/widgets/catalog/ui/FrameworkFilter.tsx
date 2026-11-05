/* eslint-disable unicorn/no-null -- tutorial flow v2 predates this rule; cleanup tracked from SF#94 */
import { ListFilter } from "lucide-react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/shared/ui/dropdown-menu";

import type { FrameworkFilter as Filter } from "../lib/levels";
import { FRAMEWORKS } from "../lib/levels";

export interface FrameworkFilterProps {
  value: Filter;
  onChange: (value: Filter) => void;
}

/**
 * The framework filter beside the search, as the tutorial-v2 prototype
 * boxes it (`desktop/TutorialList.tsx`, `FilterButton`): a square of the
 * field's height with the list glyph, and a dot while a framework is picked.
 */
const FrameworkFilter = ({ value, onChange }: FrameworkFilterProps) => {
  const on = value !== "all";
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label={on ? `Framework: ${value}` : "Filter by framework"}
        className="relative flex size-8 shrink-0 items-center justify-center rounded-lg border border-foreground/[0.1] text-foreground transition-colors duration-150 outline-none hover:bg-foreground/[0.06] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-purple data-[state=open]:border-transparent data-[state=open]:bg-foreground/[0.12]"
      >
        <ListFilter
          strokeWidth={1.75}
          aria-hidden="true"
          className="size-[1.125rem]"
        />
        {on ? (
          <span
            aria-hidden="true"
            className="absolute -top-0.5 -right-0.5 size-1.5 rounded-full bg-brand-purple"
          />
        ) : null}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" sideOffset={6} className="w-44">
        <DropdownMenuLabel>Framework</DropdownMenuLabel>
        <DropdownMenuRadioGroup
          value={value}
          onValueChange={(v) => onChange(v as Filter)}
        >
          {FRAMEWORKS.map((f) => (
            <DropdownMenuRadioItem key={f.value} value={f.value}>
              {f.label}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default FrameworkFilter;
