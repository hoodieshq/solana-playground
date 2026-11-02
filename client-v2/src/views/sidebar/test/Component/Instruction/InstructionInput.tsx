import { FC, useEffect, useMemo, useRef, useState } from "react";

import FromSeed from "./FromSeed";
import Label from "../InputLabel";
import SearchBar, {
  SearchBarItem,
  SearchBarProps,
} from "../../../../../components/SearchBar";
import { PgCommon, PgWallet, PgWeb3 } from "../../../../../utils";
import { Button } from "@/shared/ui/button";
import { CopyButton } from "@/shared/ui/copy-button";
import { reportButtonFailure } from "@/shared/lib/report-button-failure";
import {
  GeneratableInstruction,
  Idl,
  IdlType,
  InstructionValueGenerator,
  PgProgramInteraction,
} from "../../../../../utils/program-interaction";
import { useInstruction } from "./InstructionProvider";
import { useIdl } from "../IdlProvider";

type InstructionValues = GeneratableInstruction["values"];
type InstructionInputAccount = InstructionValues["accounts"][number];
type InstructionInputArg = InstructionValues["args"][number];

type InstructionInputProps = {
  prefix: "accounts" | "args" | "seed";
  updateInstruction: (props: {
    updateGenerator: (
      data: Pick<InstructionInputArg, "generator" | "error">
    ) => void;
    updateRefs: (
      data: Omit<InstructionInputArg, "type">,
      refGeneratorType: Extract<
        InstructionValueGenerator["type"],
        "Accounts" | "Arguments"
      >
    ) => void;
    checkErrors: () => boolean;
  }) => void;
  noLabel?: boolean;
  searchBarProps?: Omit<SearchBarProps, "value">;
  /**
   * `page` (the phone's page per instruction) and `desk` (the desk's form):
   * the account roles read in words, and the field's end holds the type
   * while empty, or Paste and My wallet on an account; once filled, only
   * clear and copy. A program or sysvar the form fills by itself reads as a
   * fixed value. `form` (a seed in From seed) keeps the tags and the copy
   * button beside the field.
   */
  variant?: "form" | "page" | "desk";
} & InstructionInputArg &
  Partial<InstructionInputAccount>;

const InstructionInput: FC<React.PropsWithChildren<InstructionInputProps>> = ({
  prefix,
  updateInstruction,
  name,
  type,
  generator,
  searchBarProps,
  noLabel,
  variant = "form",
  ...accountProps
}) => {
  const { instruction, setInstruction } = useInstruction();
  const { idl } = useIdl();

  const { name: typeName, parse } = useMemo(
    () => PgProgramInteraction.getIdlType(type, idl),
    [type, idl]
  );
  const initialValue = useMemo(
    () => generateValueOrDefault(generator, instruction.values),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );
  const initialError = useMemo(() => {
    // Don't show errors when the initial input is empty
    if (!initialValue) return false;

    try {
      parse(initialValue);
      return false;
    } catch {
      return true;
    }
  }, [initialValue, parse]);

  const [value, setValue] = useState(initialValue);
  const [error, setError] = useState(initialError);
  const [selectedItems, setSelectedItems] = useState<SearchBarItem[]>([]);

  // Handle syncing with transaction context without re-render
  const lastValue = useRef({ value, error, selectedItems });
  useEffect(() => {
    const newValue = { value, error, selectedItems };
    if (PgCommon.isEqual(newValue, lastValue.current)) return;
    lastValue.current = newValue;

    setInstruction((instruction) => {
      updateInstruction({
        updateGenerator: (data) => {
          const generator = PgProgramInteraction.createGenerator(
            selectedItems,
            value
          );
          // Only update the generator if there is a generator otherwise the
          // existing generator can be overridden
          if (generator) data.generator = generator;
          data.error = error;
        },
        updateRefs: (data, refGeneratorType) => {
          if (!value) return;

          for (const key of ["accounts", "args"] as const) {
            // Default ref
            for (const instructionValue of instruction.values[key]) {
              if (
                instructionValue.generator.type === refGeneratorType &&
                instructionValue.generator.name === data.name
              ) {
                const inputEl = document.getElementById(
                  instruction.name + key + instructionValue.name
                ) as HTMLInputElement;
                PgCommon.changeInputValue(inputEl, value);
              }

              // From seed
              if (
                instructionValue.generator.type === "From seed" &&
                instructionValue.generator.seeds.some(
                  (seed) =>
                    seed.generator.type === refGeneratorType &&
                    seed.generator.name === data.name
                )
              ) {
                const inputEl = document.getElementById(
                  instruction.name + key + instructionValue.name
                ) as HTMLInputElement;
                const newValue = generateValueOrDefault(
                  instructionValue.generator,
                  instruction.values
                );
                PgCommon.changeInputValue(inputEl, newValue);
              }
            }
          }
        },
        checkErrors: () => {
          return Object.values(instruction.values).reduce((acc, value) => {
            if (Array.isArray(value)) {
              acc ||= value.some(
                (v) =>
                  v.error ||
                  (v.generator.type === "Custom" && v.generator.value === "")
              );
            }

            return acc;
          }, false);
        },
      });

      return instruction;
    });
  }, [value, error, selectedItems, updateInstruction, setInstruction]);

  const id = instruction.name + prefix + name;
  const page = variant === "page";
  const desk = variant === "desk";
  const plain = page || desk;
  const isKey = typeName === "publicKey";
  const isAccount = prefix === "accounts" && isKey;
  // Typed into the field, as a paste or a pick would be
  const put = (text: string) => {
    const input = document.getElementById(id) as HTMLInputElement | null;
    if (input) PgCommon.changeInputValue(input, text);
  };
  const paste = async () => put((await navigator.clipboard.readText()).trim());
  const myWallet = PgWallet.current?.publicKey.toBase58() ?? null;
  // A program or sysvar the form fills by itself: nothing to type
  const fixed = plain && isAccount ? fixedNameOf(name, generator, value) : null;

  /** The quiet text buttons an empty account field offers at its end */
  const fillers = isAccount && (
    <>
      <Button
        variant="ghost"
        size={page ? "sm" : "xs"}
        className={QUIET}
        aria-label={`Paste ${name}`}
        onClick={() => paste().catch(reportButtonFailure("paste"))}
      >
        Paste
      </Button>
      {myWallet && accountProps.isSigner && (
        <Button
          variant="ghost"
          size={page ? "sm" : "xs"}
          className={QUIET}
          aria-label={`Use my wallet for ${name}`}
          onClick={() => put(myWallet)}
        >
          My wallet
        </Button>
      )}
    </>
  );
  // At the field's end: empty, Paste (an account) or the type (an argument);
  // filled, only copy beside the field's own clear
  const end = !plain ? undefined : value ? (
    <CopyButton
      value={value}
      label={`Copy ${name}`}
      onError={reportButtonFailure("copy")}
    />
  ) : (
    fillers || (
      <span className="pr-1 font-mono text-caption text-subtle">
        {isKey ? "pubkey" : typeName}
      </span>
    )
  );

  return (
    <div className="flex flex-col">
      {!noLabel && (
        <div className="flex">
          <Label
            name={name}
            type={typeName}
            variant={variant === "form" ? "form" : "page"}
            {...accountProps}
          />
        </div>
      )}

      {fixed ? (
        <div
          role="group"
          aria-label={`${name}: ${fixed}, ${value}`}
          className="flex h-8 w-full min-w-0 items-center gap-2 rounded-lg border border-input pr-1 pl-2.5 dark:bg-input/30"
        >
          {/* Kept for the fields that copy this one by its id */}
          <input type="hidden" id={id} value={value} readOnly />
          <span className="font-mono text-caption text-foreground">
            {shortenMiddle(value)}
          </span>
          <span className="min-w-0 truncate text-caption text-muted-foreground">
            {fixed}
          </span>
          <CopyButton
            className="ml-auto"
            value={value}
            label={`Copy ${name}`}
            onError={reportButtonFailure("copy")}
          />
        </div>
      ) : (
        <div className="flex">
          <div className="flex w-full items-center gap-1 [&>*:first-child]:flex-1">
            <SearchBar
              id={id}
              searchButton={{ hidden: true }}
              end={end}
              {...inputModeOf(typeName)}
              value={value}
              onChange={(ev) => setValue(ev.target.value)}
              error={error}
              setError={setError}
              setSelectedItems={setSelectedItems}
              restoreIfNotSelected
              labelToSelectOnPaste="Custom"
              {...getSearchBarProps(
                name,
                type,
                generator,
                accountProps,
                instruction,
                idl
              )}
              {...searchBarProps}
            />
            {!plain && (
              <div className="flex h-8 items-center">
                <CopyButton
                  value={value}
                  onError={reportButtonFailure("copy")}
                />
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

const QUIET = "text-muted-foreground hover:text-foreground";

/** "9hJq…CvB": an address shortened in the middle */
const shortenMiddle = (v: string) =>
  v.length <= 12 ? v : `${v.slice(0, 4)}\u2026${v.slice(-4)}`;

/** Sysvars the form fills by their account name */
const SYSVARS: Record<
  string,
  { label: string; key: () => string | undefined }
> = {
  rent: {
    label: "Rent sysvar",
    key: () => PgWeb3.SYSVAR_RENT_PUBKEY?.toBase58(),
  },
  clock: {
    label: "Clock sysvar",
    key: () => PgWeb3.SYSVAR_CLOCK_PUBKEY?.toBase58(),
  },
};

/**
 * What a fixed account is, when the form filled it as a constant: a known
 * program ("System Program") or a sysvar ("Rent sysvar"); null otherwise
 */
const fixedNameOf = (
  name: string,
  generator: InstructionValueGenerator & { name?: string },
  value: string
): string | null => {
  if (!value) return null;
  // Only a program the form picked by the account's name, not one picked
  // by hand from the list
  if (
    generator.type === "All programs" &&
    PgProgramInteraction.getPrograms().some(
      (p) => p.name === generator.name && p.alias?.includes(name)
    )
  ) {
    return `${generator.name} Program`;
  }
  const sysvar = SYSVARS[name];
  if (generator.type === "Custom" && sysvar && sysvar.key() === value) {
    return sysvar.label;
  }
  return null;
};

/**
 * The phone keyboard a value needs: digits for an unsigned integer, the full
 * keyboard for a signed one (the iOS number pad has no minus), and no
 * autocorrect on an address
 */
const inputModeOf = (
  typeName: string
): Pick<
  React.InputHTMLAttributes<HTMLInputElement>,
  "inputMode" | "autoCapitalize" | "autoCorrect" | "spellCheck"
> => {
  if (/^u(8|16|32|64|128|256)$/.test(typeName)) return { inputMode: "numeric" };
  if (typeName === "publicKey") {
    return { autoCapitalize: "off", autoCorrect: "off", spellCheck: false };
  }
  return {};
};

const getSearchBarProps = (
  name: string,
  type: IdlType,
  generator: InstructionValueGenerator & { name?: string; value?: string },
  accountProps: Partial<Pick<InstructionInputAccount, "isMut" | "isSigner">>,
  instruction: GeneratableInstruction,
  idl: Idl
) => {
  const customizable = PgProgramInteraction.getIdlType(type, idl);
  const searchBarProps: Omit<SearchBarProps, "value"> & {
    noCustomOption?: boolean;
  } = {};

  // Items
  searchBarProps.items = [
    { label: "Random", value: customizable.generateRandom },
  ];

  // Generate values via `generateValueOrDefault` method and push to items.
  const pushGeneratorItem = (
    generator:
      | (Pick<Exclude<InstructionValueGenerator, { name: string }>, "type"> & {
          names?: never;
        })
      | (Pick<Extract<InstructionValueGenerator, { name: string }>, "type"> & {
          names: string[];
        })
  ) => {
    if (!searchBarProps.items) return;

    if (!generator.names) {
      searchBarProps.items.push({
        label: generator.type,
        value: generateValueOrDefault(
          generator as InstructionValueGenerator,
          instruction.values
        ),
      });
    } else if (generator.names.length) {
      searchBarProps.items.push({
        label: generator.type,
        items: generator.names.map((name) => ({
          label: name,
          value: generateValueOrDefault(
            { ...generator, name },
            instruction.values
          ),
        })),
      });
    }
  };

  if (customizable.name === "bool") {
    searchBarProps.items.push("false", "true");
    searchBarProps.noCustomOption = true;
  } else if (customizable.name === "publicKey") {
    // Handle "Random" for "publicKey" differently in order to be able to
    // sign the transaction later with the generated key
    searchBarProps.items[0] = {
      label: "Random",
      data: Array.from(PgWeb3.Keypair.generate().secretKey),
      get value() {
        return PgWeb3.Keypair.fromSecretKey(
          Uint8Array.from((this as { data: number[] }).data)
        ).publicKey.toBase58();
      },
    };

    // Wallet(s)
    if (PgWallet.current) {
      pushGeneratorItem({ type: "Current wallet" });

      const wallets = PgWallet.getConnectedWallets();
      if (wallets.length > 1) {
        pushGeneratorItem({
          type: "All wallets",
          names: wallets.map((w) => w.name),
        });
      }
    }

    // From seed
    searchBarProps.items.push({
      label: "From seed",
      DropdownComponent: (props) => <FromSeed {...props} name={name} />,
      closeButton: true,
    });

    if (PgWallet.current && !accountProps.isSigner) {
      searchBarProps.items.push(
        {
          label: "Token accounts",
          items: async () => {
            const accounts = await PgProgramInteraction.getTokenAccounts();

            return accounts.map(({ address, mint, amount }) => ({
              label: address,
              value: address,
              matches: [mint, amount].filter(Boolean),
            }));
          },
        },
        {
          label: "Mint accounts",
          items: async () => {
            const accounts = await PgProgramInteraction.getMintAccounts();

            return accounts.map((address) => ({
              label: address,
              value: address,
            }));
          },
        }
      );
    }

    // Programs
    if (!(accountProps.isMut || accountProps.isSigner)) {
      pushGeneratorItem({
        type: "All programs",
        names: PgProgramInteraction.getPrograms().map((p) => p.name),
      });
    }

    // Pyth
    if (!(accountProps.isMut || accountProps.isSigner)) {
      searchBarProps.items.push({
        label: "Pyth",
        items: async () => {
          const accounts = await PgProgramInteraction.getOrInitPythAccounts();
          return Object.entries(accounts).map(([label, value]) => ({
            label,
            value,
          }));
        },
      });
    }
  } else {
    // Handle enum
    const definedType = idl.types?.find(
      (t) => t.name === customizable.name
    )?.type;
    if (definedType?.kind === "enum") {
      const enumItems = definedType.variants.map((variant) => {
        const camelCaseName = PgCommon.toCamelCase(variant.name);

        // Unit
        if (!variant.fields?.length) return camelCaseName;

        const lowerCaseName = camelCaseName.toLowerCase();
        const createValue = (value: string, defaultValue: string) => {
          if (value.toLowerCase().includes(lowerCaseName)) return value;
          return defaultValue;
        };
        const matches = (value: string) => {
          if (!value) return true;

          const lowerCaseValue = value.toLowerCase();
          if (lowerCaseName.includes(lowerCaseValue)) return true;
          return new RegExp(lowerCaseName).test(lowerCaseValue);
        };

        // Named
        if ((variant.fields[0] as { name?: string }).name) {
          return {
            label: camelCaseName,
            value: (v: string) => createValue(v, `{ ${camelCaseName}: {...} }`),
            matches,
          };
        }

        // Tuple
        return {
          label: camelCaseName,
          value: (v: string) => createValue(v, `{ ${camelCaseName}: [...] }`),
          matches,
        };
      });
      searchBarProps.items.push(...enumItems);
      searchBarProps.noCustomOption = true;
    }
  }

  // Add argument refs
  pushGeneratorItem({
    type: "Arguments",
    names: instruction.values.args
      .filter((arg) => arg.name !== name && PgCommon.isEqual(arg.type, type))
      .map((arg) => arg.name),
  });

  // Add account refs
  pushGeneratorItem({
    type: "Accounts",
    names: instruction.values.accounts
      .filter((acc) => acc.name !== name && type === "publicKey")
      .map((acc) => acc.name),
  });

  // Add custom value after type overrides to get `noCustomOption`
  if (!searchBarProps.noCustomOption) {
    searchBarProps.items.unshift({
      label: "Custom",
      value: { current: true },
      onlyShowIfValid: true,
    });
  }

  // Initial items to select
  searchBarProps.initialSelectedItems = searchBarProps.noCustomOption
    ? generator.type === "Custom"
      ? generator.value === ""
        ? []
        : generator.value
      : generator.type
    : generator.name
    ? [generator.type, generator.name]
    : generator.type === "Random"
    ? { label: generator.type, data: generator.data }
    : generator.type;

  // Validator
  searchBarProps.validator = (...args) => {
    try {
      customizable.parse(...args);
      return true;
    } catch {
      return false;
    }
  };

  return searchBarProps;
};

/** Generate the value or default to an empty string in the case of an error. */
const generateValueOrDefault = (
  generator: InstructionValueGenerator,
  values: InstructionValues
) => {
  try {
    return PgProgramInteraction.generateValue(generator, values);
  } catch (e: any) {
    console.log("Failed to generate:", e.message);
    return "";
  }
};

export default InstructionInput;
