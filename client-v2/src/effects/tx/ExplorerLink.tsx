import type { FC } from "react";

import { shortKey } from "@/shared/lib/short-key";

import Link from "../../components/Link";
import { useBlockExplorer } from "../../hooks";

interface ExplorerLinkProps {
  txHash: string;
}

export const ExplorerLink: FC<React.PropsWithChildren<ExplorerLinkProps>> = ({
  txHash,
}) => {
  const blockExplorer = useBlockExplorer();

  return (
    <div className="flex items-center gap-2">
      <span className="text-muted-foreground">Transaction sent</span>
      <Link
        href={blockExplorer.getTxUrl(txHash)}
        aria-label={`Open ${shortKey(txHash)} on ${blockExplorer.name}`}
      >
        {shortKey(txHash)}
      </Link>
    </div>
  );
};
