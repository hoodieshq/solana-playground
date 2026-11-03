import {
  Dispatch,
  FC,
  ReactNode,
  SetStateAction,
  useEffect,
  useId,
  useRef,
  useState,
  type JSX,
} from "react";
import { ArrowLeft, Search, X } from "lucide-react";

import { Button } from "@/shared/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandList,
} from "@/shared/ui/command";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "@/shared/ui/input-group";
import { Popover, PopoverAnchor, PopoverContent } from "@/shared/ui/popover";
import { createLogger } from "@/shared/lib/logger";
import { reportButtonFailure } from "@/shared/lib/report-button-failure";
import { Spinner } from "@/shared/ui/spinner";
import type { InputProps } from "../Input";
import { useKeybind, useOnClickOutside } from "../../hooks";
import { Arrayable, Getable, PgCommon } from "../../utils";

const log = createLogger("components:search-bar");

export interface SearchBarProps extends InputProps {
  items?: Item[] | null;
  initialSelectedItems?: Arrayable<Item>;
  showSearchOnMount?: boolean;
  labelToSelectOnPaste?: string;
  restoreIfNotSelected?: boolean;
  /** Which side of the field the search icon sits on */
  searchButton?: {
    position?: "left" | "right";
  };
  onSearch?: (ev: { input: InputProps["value"]; item: NormalizedItem }) => void;
  filter?: (args: {
    input: InputProps["value"];
    item: NormalizedItem;
    items: NormalizedItem[];
  }) => boolean;
  setSelectedItems?: Dispatch<SetStateAction<NormalizedItem[]>>;
}

export type NormalizedItem = Exclude<Item, string> & { isSelected?: boolean };
type Item = string | (CommonItemProps & (NestableItem | DropdownableItem));

type CommonItemProps = {
  label: string;
  matches?: Array<string | RegExp> | ((value: string) => boolean);
  onlyShowIfValid?: boolean;
  closeButton?: boolean;
  element?: ReactNode;
  onSelect?: (item: Item) => void;
};

type NestableItem = {
  value?: string | ((value: string) => string) | { current: true };
  data?: any;
  items?: Getable<Item[]> | (() => Promise<Item[]>) | null;
  DropdownComponent?: never;
};

type DropdownableItem = {
  value?: never;
  data?: never;
  items?: never;
  DropdownComponent: (props: DropdownProps) => JSX.Element;
};

export type DropdownProps = {
  search: (item: Item) => void;
};

const SearchBar: FC<React.PropsWithChildren<SearchBarProps>> = ({
  items,
  initialSelectedItems,
  showSearchOnMount,
  labelToSelectOnPaste,
  restoreIfNotSelected,
  searchButton,
  onSearch,
  filter,
  setSelectedItems: _setSelectedItems,
  onClick,
  onPaste,
  onChange,
  error,
  setError,
  validator,
  ...props
}) => {
  const searchButtonPosition = searchButton?.position ?? "left";

  const inputRef = useRef<HTMLInputElement>(null);
  const lastValue = useRef(props.value);
  const setInputValue = (value: string, opts?: { focus: boolean }) => {
    const input = inputRef.current!;
    PgCommon.changeInputValue(input, value);

    // Last value should only be updated when `setInputValue` function runs and
    // not when `onChange` callback runs because we want to restore to the last
    // value SearchBar set (a pick or a clear) when the user leaves the field.
    lastValue.current = value;

    if (opts?.focus) input.focus();
  };
  const getItemValue = (item: NormalizedItem) => {
    const currentValue = inputRef.current?.value ?? props.value;
    return item.value !== undefined
      ? typeof item.value === "string"
        ? item.value
        : typeof item.value === "function"
        ? item.value(currentValue)
        : currentValue
      : item.label;
  };

  // What the validator last said. A caller that passes `setError` holds the
  // error itself and its `error` alone is shown, so it can also clear it; the
  // legacy `Input` behaved the same way.
  const [validationError, setValidationError] = useState<InputError>(null);
  const shownError = setError ? error : validationError || error;

  /** Whether the validator accepts `value`; one that throws rejects it */
  const isValid = (value: string) => {
    try {
      return validator?.(value);
    } catch (e) {
      // A throw is the validator's way of saying "invalid, and here is why";
      // the why is shown by `onChange`, the list only needs the answer
      log.debug("The validator rejected a value by throwing", {
        context: { message: e instanceof Error ? e.message : String(e) },
      });
      return false;
    }
  };

  const [isVisible, setIsVisible] = useState(showSearchOnMount);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const reset = () => {
    // Hide search results
    setIsVisible(false);

    // Reset back to the original items, and load the groups afresh next time
    setItemState({ items, isInSubSearch: false });
    groupLists.clear();

    // Reset the input to its last saved value
    if (restoreIfNotSelected) setInputValue(lastValue.current);
  };
  useKeybind("Escape", () => {
    if (document.activeElement === inputRef.current) reset();
  });

  const [itemState, setItemState] = useState<{
    items: typeof items;
    isInSubSearch: boolean;
    closeButton?: boolean;
    Component?: (props: DropdownProps) => JSX.Element;
  }>({
    items,
    isInSubSearch: false,
  });
  const [selectedItems, setSelectedItems] = useState<{
    pending: NormalizedItem[];
    completed: NormalizedItem[];
  }>({
    pending: [],
    completed: PgCommon.toArray(initialSelectedItems ?? []).map(normalizeItem),
  });
  const selectedItemRef = useRef<HTMLDivElement>(null);

  // Sync changes
  useEffect(() => {
    setItemState((itemState) => {
      if (itemState.isInSubSearch) return itemState;
      return { ...itemState, items };
    });
  }, [items]);
  useEffect(() => {
    _setSelectedItems?.(selectedItems.completed);
  }, [selectedItems, _setSelectedItems]);

  const normalizedItems =
    isVisible &&
    itemState.items?.map(normalizeItem).map((item) => {
      const isSelected = selectedItems.completed.some((selectedItem) => {
        return selectedItem.label === item.label;
      });

      return { ...item, isSelected };
    });
  const topRows: Row[] | undefined = normalizedItems
    ? (filter
        ? normalizedItems.filter((item) =>
            filter({
              input: props.value,
              item,
              items: normalizedItems,
            })
          )
        : normalizedItems.filter((item) => {
            if (item.onlyShowIfValid) {
              return isValid(getItemValue(item));
            }

            // Show all options if the input is valid
            if (isValid(props.value)) return true;

            return matchesQuery(props.value)(item);
          })
      ).map((item) => ({ key: item.label, item }))
    : undefined;

  // Typing on the top level also searches inside the groups, so an entry
  // need not be found by opening each group in turn. Not inside an opened
  // group (its entries are the list already), not on an empty input (nothing
  // to search for, and no group list is loaded for it), not with a caller's
  // own `filter`, and not once the input is a valid value (every item shows).
  const isSearchingGroups =
    !!normalizedItems &&
    !filter &&
    !itemState.isInSubSearch &&
    !!props.value.trim() &&
    !isValid(props.value);
  const groupLists = useGroupLists(
    isSearchingGroups ? itemState.items : undefined
  );
  const nestedRows: Row[] =
    isSearchingGroups && normalizedItems
      ? normalizedItems.flatMap((group) => {
          const children = groupLists.get(group.label) ?? [];
          return children
            .map(normalizeItem)
            .map((child, index) => ({ child, index }))
            .filter(
              ({ child }) =>
                // Only an entry a pick completes: one that opens a list or a
                // page of its own is reached through its group
                !child.items &&
                !child.DropdownComponent &&
                !child.onlyShowIfValid &&
                matchesQuery(props.value)(withValueMatch(child))
            )
            .map(({ child, index }) => ({
              // Two entries of a group can share a label (feeds of one name)
              key: `${group.label}›${index}›${child.label}`,
              group,
              item: {
                ...child,
                isSelected:
                  selectedItems.completed[0]?.label === group.label &&
                  selectedItems.completed[1]?.label === child.label,
              },
            }));
        })
      : [];
  /** Every row the list shows, in its visual (and keyboard) order */
  const filteredItems = topRows ? [...topRows, ...nestedRows] : undefined;

  const [loading, setLoading] = useState(false);
  const searchCommon = async (_item: Item) => {
    const item = normalizeItem(_item);

    let isInSubSearch = false;
    let isCompleted = false;

    if (item.items) {
      setLoading(true);
      try {
        setItemState({
          items: await PgCommon.callIfNeeded(item.items),
          isInSubSearch: true,
          closeButton: item.closeButton,
        });
        isInSubSearch = true;
      } catch (e) {
        reportButtonFailure(`load ${item.label}`)(e);
        return;
      } finally {
        setLoading(false);
      }

      setInputValue("", { focus: true });
    } else if (item.DropdownComponent) {
      setItemState({
        items: null,
        isInSubSearch: true,
        closeButton: item.closeButton,
        Component: item.DropdownComponent,
      });
      isInSubSearch = true;
    } else {
      setInputValue(getItemValue(item));
      isCompleted = true;
    }

    item.onSelect?.(item);

    if (isCompleted) {
      setSelectedItems((items) => {
        if (!items.pending.length) return { ...items, completed: [item] };
        return { completed: [...items.pending, item], pending: [] };
      });
      onSearch?.({ input: props.value, item });
    } else {
      setSelectedItems((items) => ({ ...items, pending: [item] }));
    }

    if (isInSubSearch) {
      setKeyboardSelectionIndex(null);
      selectedItemRef.current?.scrollIntoView({ block: "center" });
    } else reset();
  };
  /** `searchCommon` from a click or a key, its failure told to the user */
  const pick = (item: Item) => {
    searchCommon(item).catch(
      reportButtonFailure(`pick ${normalizeItem(item).label}`)
    );
  };
  /** Pick a row; a nested one with its group recorded as the pending parent */
  const pickRow = (row: Row) => {
    const { group } = row;
    if (group) setSelectedItems((items) => ({ ...items, pending: [group] }));
    pick(row.item);
  };
  const searchTopResult = () => {
    if (filteredItems && keyboardSelectionIndex !== null) {
      const selectedRow = filteredItems.at(keyboardSelectionIndex);
      if (selectedRow) pickRow(selectedRow);
    } else setIsVisible(true);
  };
  useKeybind("Enter", {
    handle: () => {
      if (document.activeElement === inputRef.current) searchTopResult();
    },
    opts: { noPreventDefault: true },
  });

  // Keyboard navigation
  const [keyboardSelectionIndex, setKeyboardSelectionIndex] = useState<
    number | null
  >(null);

  // Handle the keyboard selection index
  useEffect(() => {
    if (!filteredItems) {
      // No `filteredItems` means no item list is shown (closed, or a custom
      // page), so there is nothing to select
      setKeyboardSelectionIndex(null);
    } else if (keyboardSelectionIndex === null) {
      // If the selection index was set to `null`, it means the dropdown has
      // just got mounted, therefore, either set the selection index to the
      // actual selected item, or if the selected item doesn't exist, select
      // the first item
      const index = filteredItems.findIndex((row) => row.item.isSelected);
      setKeyboardSelectionIndex(index === -1 ? 0 : index);
    } else {
      // If there is a selection, check whether the selected item exists in the
      // `filteredItems`, if it doesn't exist, select the first item
      const keyboardSelectedItem = filteredItems.at(keyboardSelectionIndex);
      if (!keyboardSelectedItem) setKeyboardSelectionIndex(0);
    }
  }, [filteredItems, keyboardSelectionIndex]);

  useKeybind(
    [
      {
        keybind: "ArrowDown",
        handle: () => {
          if (!filteredItems?.length) {
            if (document.activeElement === inputRef.current) setIsVisible(true);
            return;
          }

          setKeyboardSelectionIndex((i) => {
            if (i === null || !filteredItems.length) return null;
            if (i === filteredItems.length - 1) return 0;
            return i + 1;
          });
        },
      },
      {
        keybind: "ArrowUp",
        handle: () => {
          if (!filteredItems?.length) {
            if (document.activeElement === inputRef.current) setIsVisible(true);
            return;
          }

          setKeyboardSelectionIndex((i) => {
            if (i === null || !filteredItems.length) return null;
            if (i === 0) return filteredItems.length - 1;
            return i - 1;
          });
        },
      },
    ],
    [filteredItems?.length]
  );

  // Close on outside click. The list renders in a portal, outside the
  // wrapper, so a press in this field's own list is not outside.
  const listId = useId();
  useOnClickOutside(
    wrapperRef,
    reset,
    isVisible && !itemState.closeButton,
    `[data-search-bar-list="${listId}"]`
  );

  const isOpen = !!(filteredItems || itemState.Component);
  // The list renders in a portal on `body`, so it would outlive a field the
  // layout takes away while keeping it mounted: off the page under Home, or
  // `inert` under a page such as Tutorials. Close it when that happens.
  useEffect(() => {
    const input = inputRef.current;
    if (!isOpen || !input) return;

    const closeIfGone = () => {
      if (!input.isConnected || input.closest("[inert]")) reset();
    };
    const visibility = new IntersectionObserver(([entry]) => {
      if (entry && !entry.isIntersecting) reset();
    });
    visibility.observe(input);
    const inertness = new MutationObserver(closeIfGone);
    inertness.observe(document.body, {
      attributes: true,
      attributeFilter: ["inert"],
      subtree: true,
    });
    return () => {
      visibility.disconnect();
      inertness.disconnect();
    };
    // `reset` is rebuilt every render; the observers only need the open state
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  const renderRow = (row: Row) => (
    <CommandItem
      key={row.key}
      ref={row.item.isSelected ? selectedItemRef : null}
      value={row.key}
      data-checked={row.item.isSelected}
      onSelect={() => pickRow(row)}
    >
      {row.item.element ?? row.item.label}
    </CommandItem>
  );

  const highlighted =
    keyboardSelectionIndex === null
      ? ""
      : filteredItems?.at(keyboardSelectionIndex)?.key ?? "";

  return (
    <div ref={wrapperRef} className="w-full">
      {typeof shownError === "string" && shownError && (
        <p className="mb-2 text-xs text-destructive">{shownError}</p>
      )}

      <Popover open={isOpen}>
        <PopoverAnchor>
          <InputGroup>
            <InputGroupAddon
              align={
                searchButtonPosition === "left" ? "inline-start" : "inline-end"
              }
            >
              <InputGroupButton
                size="icon-xs"
                aria-label="Search"
                onClick={searchTopResult}
              >
                <Search />
              </InputGroupButton>
            </InputGroupAddon>

            <InputGroupInput
              ref={inputRef}
              // A field with nothing to pick (Account's address) is a textbox
              role={items === undefined ? undefined : "combobox"}
              aria-expanded={items === undefined ? undefined : isOpen}
              aria-autocomplete={items === undefined ? undefined : "list"}
              aria-invalid={shownError ? true : undefined}
              autoComplete="off"
              autoFocus={showSearchOnMount}
              onClick={(ev) => {
                onClick?.(ev);
                setIsVisible(true);
              }}
              onChange={(ev) => {
                let err: InputError = null;
                if (validator) {
                  try {
                    if (validator(ev.target.value) === false) err = true;
                  } catch (e) {
                    // The message is the error the field shows
                    err = (e instanceof Error && e.message) || true;
                  }
                }
                setValidationError(err);
                setError?.(err);

                onChange?.(ev);
              }}
              onPaste={(ev) => {
                onPaste?.(ev);

                // Default to the pasted text if the label to select is not specified
                const clipboardText = ev.clipboardData.getData("text");

                // Search `itemState.items`, not `filteredItems` or
                // `normalizedItems`: those are empty while the list is closed
                // (`isVisible` false), and a paste can come before it opens.
                const item = itemState.items?.find((item) => {
                  const { label } = normalizeItem(item);
                  return (
                    label === labelToSelectOnPaste || label === clipboardText
                  );
                });
                if (item) {
                  // `item.value` can be an empty string because it's not updated as
                  // soon as `onPaste` executes.
                  if (typeof item === "object") item.value ||= clipboardText;

                  // Include a timeout otherwise the pasted text is appended to the
                  // value we set instead of overriding it
                  setTimeout(() => pick(item));
                }
              }}
              {...props}
            />

            {props.value && (
              <InputGroupAddon align="inline-end">
                <InputGroupButton
                  size="icon-xs"
                  aria-label="Clear search"
                  onClick={() => {
                    setInputValue("", { focus: true });
                    setSelectedItems({ completed: [], pending: [] });
                    setIsVisible(true);
                  }}
                >
                  <X />
                </InputGroupButton>
              </InputGroupAddon>
            )}
          </InputGroup>
        </PopoverAnchor>

        <PopoverContent
          data-search-bar-list={listId}
          align="start"
          // A custom page (FromSeed's) can be taller than the room left
          className="relative max-h-(--radix-popover-content-available-height) w-(--radix-popover-trigger-width) gap-0 overflow-y-auto p-1"
          // Focus stays in the field: typing filters, and the arrow keys and
          // Enter act from there through `useKeybind`
          onOpenAutoFocus={(ev) => ev.preventDefault()}
          onCloseAutoFocus={(ev) => ev.preventDefault()}
          // The open state is SearchBar's (`isOpen`): Escape and a press
          // outside go through `reset` (`useKeybind`, `useOnClickOutside`),
          // which also restores the last value, so Radix's own dismissal is off
          onEscapeKeyDown={(ev) => ev.preventDefault()}
          onInteractOutside={(ev) => ev.preventDefault()}
        >
          {itemState.isInSubSearch && (
            <div className="flex items-center justify-between pb-1">
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label="Back"
                onClick={() => {
                  setItemState({ items, isInSubSearch: false });
                  setSelectedItems((items) => ({ ...items, pending: [] }));
                  inputRef.current?.focus();
                }}
              >
                <ArrowLeft />
              </Button>

              {itemState.closeButton && (
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label="Close"
                  onClick={reset}
                >
                  <X />
                </Button>
              )}
            </div>
          )}

          {itemState.Component ? (
            <itemState.Component search={pick} />
          ) : (
            <Command
              shouldFilter={false}
              value={highlighted}
              onValueChange={(key) => {
                const index = filteredItems
                  ? filteredItems.findIndex((row) => row.key === key)
                  : -1;
                if (index !== -1) setKeyboardSelectionIndex(index);
              }}
              className="rounded-md! p-0"
            >
              <CommandList className="max-h-60">
                <CommandEmpty className="py-2">No match</CommandEmpty>
                {topRows?.map(renderRow)}
                {groupRowsOf(nestedRows).map(({ group, rows }) => (
                  <CommandGroup
                    key={group.label}
                    heading={group.label}
                    className="p-0"
                  >
                    {rows.map(renderRow)}
                  </CommandGroup>
                ))}
              </CommandList>
            </Command>
          )}

          {loading && (
            <div className="absolute inset-0 flex items-center justify-center rounded-lg bg-popover/80">
              <Spinner />
            </div>
          )}
        </PopoverContent>
      </Popover>
    </div>
  );
};

const normalizeItem = (item: Item): NormalizedItem => {
  return typeof item === "object" ? item : { label: item };
};

/** A row of the list: a top-level item, or an entry found inside `group` */
type Row = { key: string; item: NormalizedItem; group?: NormalizedItem };

/** Whether `item` matches what was typed: its `matches`, else its label */
const matchesQuery = (query: string) => (item: NormalizedItem) => {
  if (typeof item.matches === "function") return item.matches(query);

  const matches = item.matches ?? [item.label];
  const lowerCaseQuery = query.toLowerCase();
  return matches.some((match) => {
    return typeof match === "string"
      ? match.toLowerCase().includes(lowerCaseQuery)
      : match.test(lowerCaseQuery);
  });
};

/**
 * `item` with a string `value` added to its `matches` (its label by default),
 * so an entry found inside a group (a program, a Pyth feed) is found by its
 * address as well as its name. A function `matches` decides alone.
 */
const withValueMatch = (item: NormalizedItem): NormalizedItem => {
  if (typeof item.value !== "string" || typeof item.matches === "function") {
    return item;
  }
  return { ...item, matches: [...(item.matches ?? [item.label]), item.value] };
};

/** Consecutive nested rows of one group, for a heading each; top rows drop */
const groupRowsOf = (rows: Row[]) =>
  rows.reduce<Array<{ group: NormalizedItem; rows: Row[] }>>((acc, row) => {
    const last = acc.at(-1);
    if (!row.group) return acc;
    if (last?.group.label === row.group.label) last.rows.push(row);
    else acc.push({ group: row.group, rows: [row] });
    return acc;
  }, []);

/**
 * The lists of the groups among `items`, by group label. A list given as an
 * array is read as it is; one behind a function (Pyth, token and mint
 * accounts) is loaded the first time a search asks for it and kept until
 * `clear`, which the list's closing calls, so a reopened list loads afresh.
 * `items` is rebuilt on every render of most callers, so a group is known by
 * its label, not its identity. A list that fails to load is left out of the
 * search until then, not retried on every keystroke: its own page reports the
 * failure when the user opens it. A load that settles after a `clear` is
 * dropped by its generation.
 */
const useGroupLists = (items: Item[] | null | undefined) => {
  const loaded = useRef(new Map<string, Item[]>());
  const requested = useRef(new Set<string>());
  const generation = useRef(0);
  const [, setLoaded] = useState(0);

  useEffect(() => {
    for (const item of items ?? []) {
      if (typeof item !== "object" || typeof item.items !== "function") {
        continue;
      }
      const { label, items: load } = item;
      if (requested.current.has(label)) continue;
      requested.current.add(label);

      const asked = generation.current;
      Promise.resolve()
        .then(load)
        .then(
          (list) => {
            if (asked !== generation.current) return;
            loaded.current.set(label, list);
            setLoaded((n) => n + 1);
          },
          (e: unknown) => {
            log.debug("A group's list did not load for the search; skipped", {
              context: {
                group: label,
                message: e instanceof Error ? e.message : String(e),
              },
            });
          }
        );
    }
  }, [items]);

  return {
    get: (label: string) => {
      const item = items?.find(
        (item) => typeof item === "object" && item.label === label
      );
      if (typeof item !== "object") return undefined;
      return Array.isArray(item.items) ? item.items : loaded.current.get(label);
    },
    clear: () => {
      generation.current += 1;
      loaded.current.clear();
      requested.current.clear();
    },
  };
};

type InputError = InputProps["error"];

export default SearchBar;
