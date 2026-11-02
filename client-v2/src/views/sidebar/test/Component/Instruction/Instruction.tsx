import {
  FC,
  ReactNode,
  useCallback,
  useEffect,
  useReducer,
  useState,
} from "react";

import InstructionInput from "./InstructionInput";
import InstructionProvider from "./InstructionProvider";
import { PgCommon } from "../../../../../utils";
import { AsyncButton } from "@/shared/ui/async-button";
import { Button } from "@/shared/ui/button";
import { reportButtonFailure } from "@/shared/lib/report-button-failure";
import {
  GeneratableInstruction,
  IdlInstruction,
  PgProgramInteraction,
} from "../../.././../../utils/program-interaction";
import { useWallet } from "../../../../../hooks";
import { useIdl } from "../IdlProvider";

interface InstructionProps {
  idlInstruction: IdlInstruction;
  /** Sends the instruction; the form stays locked until it settles */
  onCall: (ix: GeneratableInstruction) => Promise<unknown>;
  /** Keeps Call off for a reason outside the form, such as too little SOL */
  callBlocked?: boolean;
  /** Who pays the fee, drawn above the actions */
  feePayer?: ReactNode;
  /** Extra classes on the row with Call: a phone page pins it to the foot */
  actionsClassName?: string;
  /**
   * Both share plain section heads with Fill sample values on the first,
   * fields with the type inside them, and Call with the reason it is off.
   * `form` is the desk's card: Call, its reason and a quiet Reset in one row.
   * `page` is the phone's page per instruction: a foot that holds only Call,
   * with the reason above it. Reset lives in the page's bar there.
   */
  layout?: "form" | "page";
  /**
   * The last call's result: between the form and the pinned Call on the
   * phone page, under the Call row on the desk
   */
  result?: ReactNode;
}

/** The fields Call waits on: an invalid value, or a custom one left empty */
const missingOf = (ix: GeneratableInstruction) =>
  [...ix.values.args, ...ix.values.accounts]
    .filter(
      (v) =>
        v.error || (v.generator.type === "Custom" && v.generator.value === "")
    )
    .map((v) => v.name);

/** Why Call is off, beside it: "Fill amount to call" */
const offReason = (
  wallet: boolean,
  callBlocked: boolean,
  missing: string[]
): string | null => {
  if (!wallet) return "Connect a wallet to call";
  if (callBlocked) return "Not enough SOL for the fee";
  if (missing.length === 1) return `Fill ${missing[0]} to call`;
  if (missing.length === 2) {
    return `Fill ${missing[0]} and ${missing[1]} to call`;
  }
  if (missing.length > 2) return `Fill ${missing.length} fields to call`;
  return null;
};

/** A plain section head, with an optional tool on its line */
const PageSection = ({
  title,
  tool,
  children,
}: React.PropsWithChildren<{ title: string; tool?: ReactNode }>) => (
  <section aria-label={title} className="flex flex-col gap-3">
    <div className="flex min-h-8 items-center justify-between gap-2">
      <h4 className="m-0 text-caption font-act text-muted-foreground">
        {title}
      </h4>
      {tool}
    </div>
    <div className="flex flex-col gap-4">{children}</div>
  </section>
);

/** One instruction's form: its arguments, its accounts, and Call */
const Instruction: FC<InstructionProps> = ({
  idlInstruction,
  onCall,
  callBlocked,
  feePayer,
  actionsClassName,
  layout = "form",
  result,
}) => {
  const [instruction, setInstruction] = useState(() =>
    PgProgramInteraction.getOrCreateInstruction(idlInstruction)
  );
  const [disabled, setDisabled] = useState(true);
  const [missing, setMissing] = useState<string[]>([]);
  const [calling, setCalling] = useState(false);
  const [refreshCount, refreshFields] = useReducer((r) => r + 1, 0);

  const { idl } = useIdl();

  // Enable when there is no args and no accounts.
  //
  // This is intentionally done in a `useEffect` instead of changing the
  // setting the default value of the `disabled`'s `useState` in order to:
  // - Enable the button when `idlInstruction` changes
  // - Avoid flickering of the Call button i.e. the button renders as enabled
  // and switches to disabled state after.
  useEffect(() => {
    if (!idlInstruction.args.length && !idlInstruction.accounts.length) {
      setDisabled(false);
    }
  }, [idlInstruction]);

  // Refresh instruction in order to pass the latest generators to
  // `InstructionInput`, otherwise the initial values are being generated
  // from stale data.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const refresh = useCallback(
    PgCommon.debounce(() => setInstruction((ix) => ({ ...ix })), {
      delay: 1000,
    }),
    []
  );

  // Save instruction on change
  useEffect(
    () => PgProgramInteraction.saveInstruction(instruction),
    [instruction]
  );

  // Fill empty fields with Random generator
  const fillRandom = useCallback(() => {
    setInstruction((ix) => PgProgramInteraction.fillRandom(ix, idl));

    // Refresh fields in order to re-render mapped elements
    refreshFields();
  }, [idl]);

  // Reset the current instruction and re-crate it from default values
  const reset = useCallback(() => {
    // Reset and re-crate instruction
    setInstruction((ix) => {
      PgProgramInteraction.resetInstruction(ix);
      return PgProgramInteraction.getOrCreateInstruction(idlInstruction);
    });

    // Refresh fields in order to re-render mapped elements
    refreshFields();
  }, [idlInstruction]);

  const call = async () => {
    setCalling(true);
    try {
      await onCall(instruction);
    } finally {
      setCalling(false);
    }
  };

  const wallet = useWallet();

  const argInputs = instruction.values.args.map((arg) => (
    <InstructionInput
      key={arg.name + refreshCount}
      prefix="args"
      variant={layout === "page" ? "page" : "desk"}
      updateInstruction={({ updateGenerator, updateRefs, checkErrors }) => {
        updateGenerator(arg);
        updateRefs(arg, "Arguments");
        setDisabled(checkErrors());
        setMissing(missingOf(instruction));
        refresh();
      }}
      {...arg}
    />
  ));
  const accountInputs = instruction.values.accounts.map((acc) => (
    <InstructionInput
      key={acc.name + refreshCount}
      prefix="accounts"
      type="publicKey"
      variant={layout === "page" ? "page" : "desk"}
      updateInstruction={({ updateGenerator, updateRefs, checkErrors }) => {
        updateGenerator(acc);
        updateRefs(acc, "Accounts");
        setDisabled(checkErrors());
        setMissing(missingOf(instruction));
        refresh();
      }}
      {...acc}
    />
  ));

  const off = !wallet || disabled || Boolean(callBlocked);
  const reason = off
    ? offReason(Boolean(wallet), Boolean(callBlocked), missing)
    : null;
  const hasArgs = argInputs.length > 0;
  const fill = (
    <Button variant="ghost" size="sm" onClick={fillRandom} disabled={calling}>
      Fill sample values
    </Button>
  );
  const reasonId = `${instruction.name}-call-off`;
  const sections = (
    <>
      {hasArgs && (
        <PageSection title="Arguments" tool={fill}>
          {argInputs}
        </PageSection>
      )}
      {accountInputs.length > 0 && (
        <PageSection title="Accounts" tool={hasArgs ? undefined : fill}>
          {accountInputs}
        </PageSection>
      )}
    </>
  );
  // Off reads as off, not as a faded primary
  const offLook =
    "disabled:bg-surface-raised disabled:text-muted-foreground disabled:opacity-100";

  if (layout === "page") {
    return (
      <InstructionProvider
        instruction={instruction}
        setInstruction={setInstruction}
      >
        <fieldset
          disabled={calling}
          className="m-0 flex min-w-0 flex-col gap-6 border-0 p-0"
        >
          {sections}
        </fieldset>

        {feePayer}
        {result}

        <div className={`mt-4 flex flex-col gap-2 ${actionsClassName ?? ""}`}>
          {reason && (
            <p
              id={reasonId}
              className="m-0 text-center text-caption text-muted-foreground"
            >
              {reason}
            </p>
          )}
          <AsyncButton
            onClick={call}
            onError={reportButtonFailure(`call ${instruction.name}`)}
            disabled={off}
            aria-describedby={reason ? reasonId : undefined}
            loadingText="Calling…"
            className={`h-12 w-full text-base ${offLook}`}
          >
            Call {instruction.name}
          </AsyncButton>
        </div>
      </InstructionProvider>
    );
  }

  return (
    <InstructionProvider
      instruction={instruction}
      setInstruction={setInstruction}
    >
      <fieldset
        disabled={calling}
        className="m-0 flex min-w-0 flex-col gap-6 border-0 p-0"
      >
        {sections}
      </fieldset>

      {feePayer}

      <div
        className={`mt-5 flex flex-wrap items-center gap-x-3 gap-y-2 ${
          actionsClassName ?? ""
        }`}
      >
        <AsyncButton
          onClick={call}
          onError={reportButtonFailure(`call ${instruction.name}`)}
          disabled={off}
          aria-describedby={reason ? reasonId : undefined}
          loadingText="Calling…"
          className={offLook}
        >
          Call {instruction.name}
        </AsyncButton>
        {reason && (
          <p id={reasonId} className="m-0 text-caption text-muted-foreground">
            {reason}
          </p>
        )}
        {(accountInputs.length > 0 || hasArgs) && (
          <Button
            variant="ghost"
            size="sm"
            className="ml-auto text-muted-foreground"
            onClick={reset}
            disabled={calling}
          >
            Reset
          </Button>
        )}
      </div>
      {result}
    </InstructionProvider>
  );
};

export default Instruction;
