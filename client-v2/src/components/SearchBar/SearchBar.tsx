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
import { Spinner } from "@/shared/ui/spinner";
import type { InputProps } from "../Input";
import { useKeybind, useOnClickOutside } from "../../hooks";
import { Arrayable, Getable, PgCommon } from "../../utils";

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
    // valid value when the user clicks outside of the search bar.
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

  // What the validator last said, for a caller that passes no `setError`
  const [validationError, setValidationError] = useState<InputError>(null);
  const shownError = error || validationError;

  const [isVisible, setIsVisible] = useState(showSearchOnMount);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const reset = () => {
    // Hide search results
    setIsVisible(false);

    // Reset back to the original items
    setItemState({ items, isInSubSearch: false });

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
  const filteredItems = normalizedItems
    ? filter
      ? normalizedItems.filter((item) =>
          filter({
            input: props.value,
            item,
            items: normalizedItems,
          })
        )
      : normalizedItems.filter((item) => {
          if (item.onlyShowIfValid) {
            return validator?.(getItemValue(item));
          }

          // Show all optinos if the input is valid
          if (validator?.(props.value)) return true;

          if (typeof item.matches === "function") {
            return item.matches(props.value);
          }

          const matches = item.matches ?? [item.label];
          const lowerCaseValue = props.value.toLowerCase();
          return matches.some((match) => {
            return typeof match === "string"
              ? match.toLowerCase().includes(lowerCaseValue)
              : match.test(lowerCaseValue);
          });
        })
    : null;

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
      } catch (e: any) {
        console.log("Failed to get items:", e.message);
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
  const searchTopResult = () => {
    if (filteredItems && keyboardSelectionIndex !== null) {
      const selectedItem = filteredItems.at(keyboardSelectionIndex);
      if (selectedItem) searchCommon(selectedItem);
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
      // No `filteredItems` means dropdown is not visible so the keyboard
      // selection should not exist
      setKeyboardSelectionIndex(null);
    } else if (keyboardSelectionIndex === null) {
      // If the selection index was set to `null`, it means the dropdown has
      // just got mounted, therefore, either set the selection index to the
      // actual selected item, or if the selected item doesn't exist, select
      // the first item
      const index = filteredItems.findIndex((item) => item.isSelected);
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
  const highlighted =
    keyboardSelectionIndex === null
      ? ""
      : filteredItems?.at(keyboardSelectionIndex)?.label ?? "";

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
              <Search />
            </InputGroupAddon>

            <InputGroupInput
              ref={inputRef}
              role="combobox"
              aria-expanded={isOpen}
              aria-autocomplete="list"
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
                  } catch (e: any) {
                    err = e.message;
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

                // Intentionally use `itemState.items` instead of `filteredItems`
                //`normalizedItems` because they could be in an invalid state
                // when the paste events, e.g. `normalizedItems` values only
                // exist when `isVisible` is truthy.
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
                  setTimeout(() => searchCommon(item));
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
          className="relative w-(--radix-popover-trigger-width) gap-0 p-1"
          // Focus stays in the field: typing filters, and the arrow keys and
          // Enter act from there through `useKeybind`
          onOpenAutoFocus={(ev) => ev.preventDefault()}
          onCloseAutoFocus={(ev) => ev.preventDefault()}
          // `reset` closes the list, so it can restore the last value first
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
            <itemState.Component search={searchCommon} />
          ) : (
            <Command
              shouldFilter={false}
              value={highlighted}
              onValueChange={(label) => {
                const index = filteredItems
                  ? filteredItems.findIndex((item) => item.label === label)
                  : -1;
                if (index !== -1) setKeyboardSelectionIndex(index);
              }}
              className="rounded-md! p-0"
            >
              <CommandList className="max-h-60">
                <CommandEmpty className="py-2">No match</CommandEmpty>
                {filteredItems?.map((item) => (
                  <CommandItem
                    key={item.label}
                    ref={item.isSelected ? selectedItemRef : null}
                    value={item.label}
                    data-checked={item.isSelected}
                    onSelect={() => searchCommon(item)}
                  >
                    {item.element ?? item.label}
                  </CommandItem>
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

type InputError = string | boolean | null;

export default SearchBar;
