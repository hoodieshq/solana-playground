import { useEffect, useRef, useState } from "react";

import { onDidRequestFundDialog } from "../model/open";
import type { FundFrom } from "../model/telemetry";
import FundDialog from "./FundDialog";

/**
 * The one Fund dialog: every entry (the account menu, the wallet chip, the
 * short-wallet cards and the faucet-refused toast) opens it through
 * `openFundDialog`. Mounted once beside the toasts, so it outlives a toast
 * or a menu, and a send pending from one entry holds Send off for the next.
 */
const FundDialogHost = () => {
  const [open, setOpen] = useState(false);
  const [from, setFrom] = useState<FundFrom>("deploy-card");

  // A request while the dialog is open changes nothing: a new `from` would
  // count a second opening and reset what the user picked
  const isOpen = useRef(open);
  isOpen.current = open;
  useEffect(
    () =>
      onDidRequestFundDialog((next) => {
        if (isOpen.current) return;
        setFrom(next);
        setOpen(true);
      }),
    []
  );

  return <FundDialog open={open} onOpenChange={setOpen} from={from} />;
};

export default FundDialogHost;
