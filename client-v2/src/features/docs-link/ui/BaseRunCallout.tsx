import type { FC, ReactNode } from "react";
import { CircleAlert, CircleCheck, Info, Wallet } from "lucide-react";

import { Button } from "@/shared/ui/button";
import { Callout, CalloutDescription, CalloutTitle } from "@/shared/ui/callout";
import { CopyButton } from "@/shared/ui/copy-button";

import type { RunState } from "../model/run";

/** Where the open project came from, when a docs link opened it */
export interface RunSourceInfo {
  title: string;
  /** The page the link came from, already checked to be `https:` */
  from: string | null;
}

/** Where "Get devnet SOL" goes until Playground has a faucet of its own */
export const FAUCET_URL = "https://faucet.solana.com";

export interface BaseRunCalloutProps {
  state: RunState;
  source: RunSourceInfo | null;
  onRunAgain: () => void;
  onCheckAgain: () => void;
  onNotNow: () => void;
  onCopyError: (error: unknown) => void;
}

const hostOf = (from: string) => new URL(from).hostname;

const sol = (amount: number) => `${Number(amount.toFixed(4))} SOL`;

/**
 * The one note above the code of a project with no program: where it came
 * from before a run, how the run ended after it, or what it needs to run.
 */
const BaseRunCallout: FC<BaseRunCalloutProps> = ({
  state,
  source,
  onRunAgain,
  onCheckAgain,
  onNotNow,
  onCopyError,
}) => {
  const again = (
    <Button variant="outline" size="xs" onClick={onRunAgain}>
      Run again
    </Button>
  );

  const note = (
    dataState: string,
    variant: "info" | "success" | "error",
    icon: ReactNode,
    title: ReactNode,
    body: ReactNode,
    actions?: ReactNode
  ) => (
    <Callout
      id="client-run-callout"
      data-state={dataState}
      variant={variant}
      className="mb-2"
    >
      {icon}
      <CalloutTitle>{title}</CalloutTitle>
      <CalloutDescription>
        {body}
        {actions && <div className="mt-2 flex gap-2">{actions}</div>}
      </CalloutDescription>
    </Callout>
  );

  switch (state.kind) {
    case "idle":
    case "running": {
      if (!source) return null;
      const where = source.from ? hostOf(source.from) : "a docs link";
      return note(
        "source",
        "info",
        <Info />,
        `From ${where}: ${source.title}`,
        <>
          Runs with your Playground wallet.{" "}
          {source.from && (
            <a
              className="underline underline-offset-4"
              href={source.from}
              target="_blank"
              rel="noopener noreferrer"
            >
              View the docs page
            </a>
          )}
        </>
      );
    }

    case "done":
      return note(
        "done",
        "success",
        <CircleCheck />,
        `Ran in ${Math.round(state.ms / 1000)} s`,
        "Signatures and Explorer links are in the terminal.",
        again
      );

    case "failed":
      return note(
        "failed",
        "error",
        <CircleAlert />,
        "Run failed",
        state.message,
        again
      );

    case "missing-package":
      return note(
        "missing-package",
        "error",
        <CircleAlert />,
        <>
          Playground can't load <code>{state.pkg}</code> yet
        </>,
        "This script imports it, so nothing ran."
      );

    case "funding":
      return (
        <Callout
          id="client-run-callout"
          data-state="funding"
          variant="warning"
          className="mb-2"
        >
          <Wallet />
          <CalloutTitle>Not enough SOL on devnet</CalloutTitle>
          <CalloutDescription>
            <div id="client-run-funding">
              <p>
                This script pays a few small fees. Your Playground wallet needs
                about {sol(state.needed)}.
              </p>
              <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-3 font-mono text-xs">
                <dt>Wallet</dt>
                <dd className="truncate">{state.address}</dd>
                <dt>Balance</dt>
                <dd>{sol(state.balance)}</dd>
                <dt>Needed</dt>
                <dd>{sol(state.needed)}</dd>
              </dl>
              <div className="mt-2 flex flex-wrap gap-2">
                <Button size="xs" asChild>
                  <a
                    href={FAUCET_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Get devnet SOL
                  </a>
                </Button>
                <CopyButton
                  value={state.address}
                  label="Copy address"
                  onError={onCopyError}
                />
                <Button variant="outline" size="xs" onClick={onCheckAgain}>
                  Check again
                </Button>
                <Button variant="ghost" size="xs" onClick={onNotNow}>
                  Not now
                </Button>
              </div>
            </div>
          </CalloutDescription>
        </Callout>
      );
  }
};

export default BaseRunCallout;
