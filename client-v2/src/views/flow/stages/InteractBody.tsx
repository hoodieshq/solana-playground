import { useEffect, useRef, useState } from "react";
import BN from "bn.js";
import { ChevronLeft, Ellipsis } from "lucide-react";

import { useIsMobile } from "@/shared/lib/hooks/use-mobile";
import { Button } from "@/shared/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/shared/ui/dropdown-menu";
import { Modal, ModalBody, ModalContent, ModalTitle } from "@/shared/ui/modal";
import { Segmented, SegmentedItem } from "@/shared/ui/segmented";
import BaseCallHistory from "./BaseCallHistory";
import BaseInstructionList from "./BaseInstructionList";
import BaseCallResult from "./BaseCallResult";
import { runCall } from "./run-call";
import type { CallOutcome } from "./call-outcome";
import Account from "../../sidebar/test/Component/Account";
import Event from "../../sidebar/test/Component/Event";
import IdlProvider from "../../sidebar/test/Component/IdlProvider";
import Instruction from "../../sidebar/test/Component/Instruction";
import { PgProgramInfo } from "../../../utils";
import { Idl, PgProgramInteraction } from "../../../utils/program-interaction";
import { useBalance, useBlockExplorer, useWallet } from "../../../hooks";
import { PgCallHistory } from "../state/call-history";
import type { CallRecord } from "../state/call-history";

export interface InteractBodyProps {
  idl: Idl;
  /** The program the calls go to, for the history */
  programId: string | null;
  /** The network the calls go to; null until the endpoint has been read */
  cluster: string | null;
  /** Keeps Call off for a reason the stage shows, such as too little SOL */
  callBlocked?: boolean;
  /** The phone page open on mount; the review board opens one this way */
  initialPage?: string | null;
  /** A result already on the page on mount, for the review board */
  initialResult?: { outcome: CallOutcome; at: number } | null;
}

/** The history entry a phone page pushes, so Back and Android back close it */
const PAGE_STATE = "interactPage";

/**
 * A deployed program's instructions as chips, the picked one's form, the last
 * call's result and the calls before it, then the account and event lookups.
 */
const InteractBody = ({
  idl,
  programId,
  cluster,
  callBlocked,
  initialPage = null,
  initialResult = null,
}: InteractBodyProps) => {
  // Used for both accounts and events data
  useBigNumberJson();
  useSyncInstructionStorage();

  const names = idl.instructions.map((ix) => ix.name);
  const [picked, setPicked] = useState<string | null>(initialPage);
  // A pick the IDL no longer has (a rebuild renamed it) falls back to the first
  const current = picked && names.includes(picked) ? picked : names[0];
  const idlInstruction = idl.instructions.find((ix) => ix.name === current);

  // The last call, kept with the program and network it went to: switching
  // either hides it rather than showing it under another program's form
  const target = `${programId}|${cluster}`;
  const [last, setLast] = useState<{
    target: string;
    outcome: CallOutcome;
    at: number;
  } | null>(() =>
    initialResult
      ? {
          target: `${programId}|${cluster}`,
          outcome: initialResult.outcome,
          at: initialResult.at,
        }
      : null
  );
  const outcome = last?.target === target ? last.outcome : null;
  const history = useCallHistory(programId, cluster);
  const network = cluster ?? "the network";
  const explorer = useBlockExplorer();
  const txUrl = (sig: string) => explorer?.getTxUrl?.(sig) ?? "";
  // On a phone each instruction opens a page of its own (Spec 03, task 4.6)
  const isMobile = useIsMobile();
  const [pageFor, setPageFor] = useState<string | null>(initialPage);
  const [resets, setResets] = useState(0);
  const pageTitle = useRef<HTMLHeadingElement>(null);
  const resultRef = useRef<HTMLDivElement>(null);

  // A page is a step in the browser's history: Back, the browser's back and
  // Android's back all close it
  useEffect(() => {
    const onPop = () => setPageFor(null);
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);
  const openPage = (name: string) => {
    window.history.pushState({ [PAGE_STATE]: name }, "");
    setPageFor(name);
  };
  // A result handed in on mount (the review board) is scrolled to, as one
  // that just landed would be
  useEffect(() => {
    if (!initialResult) return;
    const t = setTimeout(
      () => resultRef.current?.scrollIntoView({ block: "end" }),
      150
    );
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const closePage = () => {
    if (window.history.state?.[PAGE_STATE]) window.history.back();
    else setPageFor(null);
  };

  if (isMobile) {
    const page = pageFor
      ? idl.instructions.find((ix) => ix.name === pageFor)
      : undefined;
    const pageResult =
      page && last && outcome?.instruction === page.name ? last : null;
    const resetPage = () => {
      if (!page) return;
      PgProgramInteraction.resetInstruction(
        PgProgramInteraction.getOrCreateInstruction(page)
      );
      setResets((n) => n + 1);
    };
    return (
      <IdlProvider idl={idl}>
        <div className="flex flex-col gap-6 px-4 py-4">
          <BaseInstructionList
            instructions={idl.instructions.map((ix) => ({
              name: ix.name,
              args: ix.args.length,
              accounts: ix.accounts.length,
            }))}
            history={history}
            onOpen={openPage}
          />
          <BaseCallHistory
            records={history}
            cluster={network}
            txUrl={txUrl}
            onOpen={(name) => names.includes(name) && openPage(name)}
          />
          {idl.accounts && (
            <Section title="Accounts">
              {idl.accounts.map((acc) => (
                <Account key={acc.name} accountName={acc.name} />
              ))}
            </Section>
          )}
        </div>
        <Modal
          open={page !== undefined}
          onOpenChange={(open) => !open && closePage()}
        >
          {page && (
            <ModalContent
              aria-describedby={undefined}
              onOpenAutoFocus={(e) => {
                e.preventDefault();
                pageTitle.current?.focus();
              }}
            >
              {/* A page pushed from the list: back on the left, not a close */}
              <div className="flex h-phone-bar shrink-0 items-center gap-1 border-b border-border px-1">
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-11"
                  aria-label="Back to instructions"
                  onClick={closePage}
                >
                  <ChevronLeft className="size-5" />
                </Button>
                <ModalTitle
                  ref={pageTitle}
                  tabIndex={-1}
                  className="min-w-0 flex-1 truncate font-mono text-title outline-none"
                >
                  {page.name}
                </ModalTitle>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-11"
                      aria-label="More"
                    >
                      <Ellipsis className="size-5" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onSelect={resetPage}>
                      Reset inputs
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
              <ModalBody className="flex flex-col gap-5 pb-0">
                <p className="m-0 text-caption text-muted-foreground">
                  Calls {page.name} on {network}
                </p>
                {/* Fills the page so Call sits at its foot even when the
                    form is short */}
                <div className="flex flex-1 flex-col">
                  <Instruction
                    key={JSON.stringify(page) + resets}
                    layout="page"
                    idlInstruction={page}
                    callBlocked={callBlocked}
                    feePayer={<FeePayer />}
                    actionsClassName={PINNED_ACTIONS}
                    // The result sits right above Call, where the eyes and the
                    // thumb are; the form stays one scroll up for another try
                    result={
                      pageResult && (
                        <div ref={resultRef} className="mt-5 scroll-mb-36">
                          <BaseCallResult
                            layout="page"
                            outcome={pageResult.outcome}
                            at={pageResult.at}
                            cluster={network}
                            txUrl={txUrl}
                          />
                        </div>
                      )
                    }
                    onCall={async (ix) => {
                      setLast({
                        target,
                        outcome: await runCall(ix),
                        at: Date.now(),
                      });
                      requestAnimationFrame(() =>
                        resultRef.current?.scrollIntoView({
                          block: "end",
                          behavior: "smooth",
                        })
                      );
                    }}
                  />
                </div>
              </ModalBody>
            </ModalContent>
          )}
        </Modal>
      </IdlProvider>
    );
  }

  return (
    <IdlProvider idl={idl}>
      <div className="flex max-w-[42rem] flex-col gap-6 px-6 py-6">
        {names.length > 0 && (
          <Segmented
            variant="chips"
            aria-label="Instruction"
            value={current}
            onValueChange={setPicked}
          >
            {names.map((name) => (
              <SegmentedItem
                key={name}
                value={name}
                // Picked reads as a neutral fill: a ring would read as focus,
                // which keeps its own ring for the keyboard
                className="font-mono data-[state=on]:border-transparent data-[state=on]:bg-surface-raised data-[state=on]:text-foreground"
              >
                {name}
              </SegmentedItem>
            ))}
          </Segmented>
        )}

        {idlInstruction && (
          <section
            aria-label={`${idlInstruction.name} form`}
            className="rounded-xl border border-border bg-surface-panel p-5"
          >
            <Instruction
              key={JSON.stringify(idlInstruction)}
              idlInstruction={idlInstruction}
              callBlocked={callBlocked}
              feePayer={<FeePayer />}
              // The result closes the form's card, under Call; the form
              // stays above it for another call
              result={
                outcome &&
                last &&
                outcome.instruction === idlInstruction.name && (
                  <div
                    ref={resultRef}
                    className="mt-5 scroll-mb-6 border-t border-border pt-5"
                  >
                    <BaseCallResult
                      outcome={outcome}
                      at={last.at}
                      cluster={network}
                      txUrl={txUrl}
                    />
                  </div>
                )
              }
              onCall={async (ix) => {
                setLast({
                  target,
                  outcome: await runCall(ix),
                  at: Date.now(),
                });
                requestAnimationFrame(() =>
                  resultRef.current?.scrollIntoView?.({
                    block: "nearest",
                    behavior: "smooth",
                  })
                );
              }}
            />
          </section>
        )}

        <BaseCallHistory
          records={history}
          cluster={network}
          txUrl={txUrl}
          // A row of an instruction a rebuild removed leaves the form alone
          onOpen={(name) => names.includes(name) && setPicked(name)}
        />

        {idl.accounts && (
          <Section title="Accounts">
            {idl.accounts.map((acc) => (
              <Account key={acc.name} accountName={acc.name} />
            ))}
          </Section>
        )}

        {idl.events && (
          <Section title="Events">
            {idl.events.map((event) => (
              <Event key={event.name} eventName={event.name} />
            ))}
          </Section>
        )}
      </div>
    </IdlProvider>
  );
};

/**
 * The phone page's foot: Call alone, pinned over the form so it stays in
 * reach with the keyboard open (DEP-51), clear of the home indicator
 */
const PINNED_ACTIONS =
  "sticky bottom-0 z-10 -mx-4 mt-auto border-t border-border bg-surface-panel px-4 pt-3 pb-[max(12px,env(safe-area-inset-bottom))]";

/** Who pays the call's fee, and what they hold */
const FeePayer = () => {
  const wallet = useWallet();
  const balance = useBalance();
  if (!wallet) return null;
  const who = wallet.isPg ? "Playground wallet" : wallet.name;
  const sol =
    typeof balance === "number" ? ` · ${+balance.toFixed(4)} SOL` : "";
  return (
    <p className="m-0 mt-4 text-xs text-muted-foreground">
      Fee paid by {who}
      {sol}
    </p>
  );
};

/** A headed list of cards: the accounts or the events */
const Section = ({
  title,
  children,
}: React.PropsWithChildren<{ title: string }>) => (
  <section className="flex flex-col gap-2">
    <h3 className="m-0 text-xs font-medium tracking-wider text-muted-foreground uppercase">
      {title}
    </h3>
    {children}
  </section>
);

/** The calls to this program on this network, kept current */
const useCallHistory = (programId: string | null, cluster: string | null) => {
  const [records, setRecords] = useState<CallRecord[]>([]);
  useEffect(() => {
    if (!programId || !cluster) {
      setRecords([]);
      return;
    }
    const { dispose } = PgCallHistory.onDidChange(() =>
      setRecords(PgCallHistory.list(programId, cluster))
    );
    return dispose;
  }, [programId, cluster]);
  return records;
};

/**
 * Temporarily change `BN.toJSON` method to `BN.toString` in order to have
 * human-readable output rather than hex values.
 */
const useBigNumberJson = () => {
  useEffect(() => {
    const oldBNPrototypeToJSON = BN.prototype.toJSON;
    BN.prototype.toJSON = function (this: BN) {
      return this.toString();
    };

    // Change the toJSON prototype back on unmount
    return () => {
      BN.prototype.toJSON = oldBNPrototypeToJSON;
    };
  }, []);
};

/** Sync the instruction storage. */
const useSyncInstructionStorage = () => {
  useEffect(() => {
    const { dispose } = PgProgramInfo.onDidChangeIdl((idl) => {
      if (idl) PgProgramInteraction.syncAllInstructions(idl.instructions);
    });
    return dispose;
  }, []);
};

export default InteractBody;
