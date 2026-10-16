import { useState } from "react";

import { PgSession } from "@/features/auth";
import { FeedbackMenuItems, useFeedbackSend } from "@/features/feedback";
import { useBalance, useRenderOnChange, useWallet } from "@/hooks";
import { createLogger } from "@/shared/lib/logger";
import { PgCommand, PgCommon, PgWallet } from "@/utils";
import type { SettingsFocus } from "@/views/flow/settings/GearSidebar";
import type { AccountItem, AccountView } from "../model/account";
import { sessionTelemetry } from "../model/telemetry";
import { useClusterStatus } from "../model/use-cluster-status";
import BaseAccountMenu from "./BaseAccountMenu";
import BaseSignOutDialog from "./BaseSignOutDialog";

const log = createLogger("session-footer:account");

interface UseAccountOptions {
  from: "footer" | "rail";
  onToggleSettings: (focus?: SettingsFocus) => void;
}

/**
 * What both account controls show and do. Sign-in progress is read from
 * `PgSession`, never kept here: on a narrow window the footer sits in the
 * navigation's Sheet, which unmounts it on close while the sign-in goes on.
 */
export const useAccount = ({ from, onToggleSettings }: UseAccountOptions) => {
  const cluster = useClusterStatus();
  useRenderOnChange(PgSession.onDidChange);
  const wallet = useWallet();
  const balance = useBalance();
  const { sending, triggerRef } = useFeedbackSend();
  const [confirmingSignOut, setConfirmingSignOut] = useState(false);

  const user = PgSession.get();
  const account: AccountView = {
    user: user && { name: user.name, login: user.login, image: user.image },
    signIn: PgSession.signInState(),
    wallet: wallet
      ? {
          address: wallet.publicKey.toBase58(),
          balance: typeof balance === "number" ? balance : null,
        }
      : null,
    cluster,
    sending,
  };

  // The command toggles: it connects when nothing is, and disconnects the
  // current wallet otherwise; a wallet's own prompt the user dismisses rejects
  const toggleWallet = (item: AccountItem) => {
    PgCommand.connect.execute().catch((error: unknown) => {
      log.error(error, { report: true, context: { item } });
    });
  };

  // Keyed by item, so a new item without an action does not compile
  const actions: Record<AccountItem, () => void> = {
    "sign-in": () => {
      PgSession.signIn().catch((error: unknown) =>
        // `PgSession.signInState` holds the failure and the row shows it from
        // there; `auth` telemetry already has its reason
        log.info("sign-in failed", { context: { error: String(error) } })
      );
    },
    "cancel-sign-in": () => PgSession.cancelSignIn(),
    // Links: the anchor opens the tab, the pick is only counted
    "github-profile": () => undefined,
    docs: () => undefined,
    "sign-out": () => setConfirmingSignOut(true),
    settings: () => onToggleSettings(),
    "cluster-down": () => onToggleSettings("network"),
    "connect-wallet": () => toggleWallet("connect-wallet"),
    "disconnect-wallet": () => toggleWallet("disconnect-wallet"),
    wallet: () => {
      PgWallet.show = true;
    },
  };

  const pick = (item: AccountItem) => {
    sessionTelemetry.track("session_account_item_picked", { item });
    actions[item]();
  };

  const onMenuOpenChange = (open: boolean) => {
    if (open) sessionTelemetry.track("session_account_menu_opened", { from });
  };

  const menu = (
    <BaseAccountMenu
      account={account}
      feedback={<FeedbackMenuItems />}
      side={from === "footer" ? "top" : "right"}
      settingsShortcut={PgCommon.getOS() === "MacOS" ? "⌘," : "Ctrl+,"}
      onPick={pick}
    />
  );

  const dialog = (
    <BaseSignOutDialog
      open={confirmingSignOut}
      onOpenChange={setConfirmingSignOut}
      onConfirm={() => {
        setConfirmingSignOut(false);
        PgSession.signOut().catch((error: unknown) => {
          log.error(error, { report: true, context: { item: "sign-out" } });
        });
      }}
    />
  );

  return {
    account,
    pick,
    menu,
    dialog,
    onMenuOpenChange,
    accountRef: triggerRef,
  };
};
