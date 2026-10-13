import { FC, useRef } from "react";
import styled from "styled-components";

import Button from "../Button";
import Img from "../Img";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/shared/ui/dropdown-menu";
import { MenuItemText } from "@/shared/ui/menu-extras";
import {
  Airdrop,
  Copy,
  Edit,
  ExportFile,
  ImportFile,
  Plus,
  ThreeDots,
  Trash,
} from "../Icons";
import { Fn, PgCommand, PgView, PgWallet } from "../../utils";
import { useAirdrop, useDarken } from "./hooks";
import { useCopy } from "../../hooks";

interface SettingsProps {
  showRename: Fn;
}

const Settings: FC<React.PropsWithChildren<SettingsProps>> = ({
  showRename,
}) => {
  const { airdrop, airdropCondition } = useAirdrop();
  const { darken, lighten } = useDarken();

  const wallet = PgWallet.current!;
  const isPg = wallet.isPg;
  const [, copyAddress] = useCopy(wallet.publicKey.toBase58());

  // Choosing Rename mounts the rename input. Radix would return focus to the
  // trigger on close, so typing would go nowhere, and the input is focused
  // here once the menu has let go. Every other item keeps Radix's return.
  const choseRename = useRef(false);
  const rename = () => {
    choseRename.current = true;
    showRename();
  };

  return (
    <Wrapper>
      <DropdownMenu
        onOpenChange={(open) => {
          if (open) {
            choseRename.current = false;
            darken();
          } else {
            lighten();
          }
        }}
      >
        <DropdownMenuTrigger asChild>
          <Button kind="icon" title="More">
            <ThreeDots />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          // Wide enough for "Disconnect from <wallet>" on one line
          className="min-w-56"
          onCloseAutoFocus={(ev) => {
            if (!choseRename.current) return;
            const input = document.getElementById(
              PgView.ids.WALLET_RENAME_INPUT
            );
            if (!input) return;
            ev.preventDefault();
            input.focus();
          }}
        >
          <DropdownMenuItem onSelect={copyAddress}>
            <Copy />
            <MenuItemText>Copy address</MenuItemText>
          </DropdownMenuItem>
          {airdropCondition && (
            <DropdownMenuItem onSelect={airdrop}>
              <Airdrop />
              <MenuItemText>Airdrop</MenuItemText>
            </DropdownMenuItem>
          )}
          <DropdownMenuItem
            onSelect={async () => {
              const { Add } = await import("./Modals/Add");
              await PgView.setModal(Add);
            }}
          >
            <Plus />
            <MenuItemText>Add</MenuItemText>
          </DropdownMenuItem>
          {isPg && (
            <DropdownMenuItem onSelect={rename}>
              <Edit />
              <MenuItemText>Rename</MenuItemText>
            </DropdownMenuItem>
          )}
          {isPg && (
            <DropdownMenuItem
              variant="destructive"
              onSelect={async () => {
                const { Remove } = await import("./Modals/Remove");
                await PgView.setModal(Remove);
              }}
            >
              <Trash />
              <MenuItemText>Remove</MenuItemText>
            </DropdownMenuItem>
          )}
          <DropdownMenuItem onSelect={() => PgWallet.import()}>
            <ImportFile />
            <MenuItemText>Import</MenuItemText>
          </DropdownMenuItem>
          {isPg && (
            <DropdownMenuItem onSelect={() => PgWallet.export()}>
              <ExportFile />
              <MenuItemText>Export</MenuItemText>
            </DropdownMenuItem>
          )}
          {PgWallet.standardWallets.map((standardWallet) => (
            <DropdownMenuItem
              key={standardWallet.name}
              variant={standardWallet.connected ? "destructive" : "default"}
              onSelect={() =>
                PgCommand.connect.execute(standardWallet.name.toLowerCase())
              }
            >
              <Img src={standardWallet.icon} alt={standardWallet.name} />
              <MenuItemText>
                {standardWallet.connected
                  ? `Disconnect from ${standardWallet.name}`
                  : `Connect to ${standardWallet.name}`}
              </MenuItemText>
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </Wrapper>
  );
};

const Wrapper = styled.div`
  position: absolute;
  left: 1rem;
`;

export default Settings;
