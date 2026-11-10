import { useEffect, useState } from "react";

import { onDidRequestFundDialog } from "../model/open";
import type { FundFrom } from "../model/telemetry";
import FundDialog from "./FundDialog";

/**
 * The one Fund dialog the short-wallet cards and the faucet-refused toast
 * open through `openFundDialog`. Mounted once beside the toasts, so it
 * outlives a toast, and a send pending from one entry holds Send off for the
 * next.
 */
const FundDialogHost = () => {
  const [open, setOpen] = useState(false);
  const [from, setFrom] = useState<FundFrom>("deploy-card");

  useEffect(
    () =>
      onDidRequestFundDialog((next) => {
        setFrom(next);
        setOpen(true);
      }),
    []
  );

  return <FundDialog open={open} onOpenChange={setOpen} from={from} />;
};

export default FundDialogHost;
