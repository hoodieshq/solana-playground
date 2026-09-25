import { useState } from "react";
import styled, { css } from "styled-components";

import Button from "../../Button";
import Modal from "../../Modal";
import Text from "../../Text";
import { Warning } from "../../Icons";
import { PgWallet, PgWeb3 } from "../../../utils";

export const Setup = () => {
  const [text, setText] = useState("");
  const [keypair] = useState(PgWeb3.Keypair.generate);

  const handleSetup = () => {
    if (!PgWallet.accounts.length) PgWallet.add({ keypair });
    return true; // Indicate the setup has been completed successfully
  };

  const handleExport = () => {
    if (!PgWallet.accounts.length) {
      PgWallet.export({
        name: PgWallet.getNextAvailableAccountName(),
        keypair,
      });
    } else {
      PgWallet.export();
    }
  };

  const handleImport = async () => {
    try {
      if (PgWallet.accounts.length) PgWallet.remove(0);
      const keypair = await PgWallet.import();
      if (keypair) setText("Imported address: " + keypair.publicKey.toBase58());
    } catch (err: any) {
      console.log(err.message);
    }
  };

  return (
    <Modal
      title="Playground Wallet"
      buttonProps={{
        text: "Continue",
        onSubmit: handleSetup,
      }}
    >
      <Content>
        <ContentTitle>What is it?</ContentTitle>
        <ContentText>
          Playground wallet is a native wallet that speeds up development by
          auto-approving transactions.
        </ContentText>
      </Content>
      <Content>
        <ContentTitle>How to setup?</ContentTitle>
        <ContentText>
          You don't need to do anything other than saving the keypair for future
          use. You can also choose to import an existing wallet.
        </ContentText>
        <WarningTextWrapper>
          <Text kind="warning" icon={<Warning color="warning" />}>
            Wallet information is stored in your browser's local storage. You
            are going to lose the wallet if you clear your browser history
            unless you save the keypair.
          </Text>
        </WarningTextWrapper>
        <WalletButtonsWrapper>
          <Button onClick={handleExport} kind="primary-outline">
            Save keypair
          </Button>
          <Button onClick={handleImport}>Import keypair</Button>
        </WalletButtonsWrapper>
        {text && <KeypairText>{text}</KeypairText>}
      </Content>
    </Modal>
  );
};

const Content = styled.div`
  &:not(:first-child) {
    margin-top: 1.125rem;
  }
`;

const ContentTitle = styled.div`
  margin-bottom: 0.25rem;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.default.textPrimary};
`;

const ContentText = styled.p`
  margin: 0;
  line-height: 1.55;
  color: ${({ theme }) => theme.colors.default.textSecondary};
`;

const WarningTextWrapper = styled.div`
  margin-top: 1.25rem;
  display: flex;
  align-items: center;

  & div {
    justify-content: flex-start;
    padding: 0.75rem 0.875rem;
  }

  & div > svg {
    flex-shrink: 0;
    height: 1.25rem;
    width: 1.25rem;
    margin-right: 0.75rem;
  }
`;

const WalletButtonsWrapper = styled.div`
  margin-top: 1rem;
  display: flex;
  gap: 0.5rem;
`;

const KeypairText = styled.div`
  ${({ theme }) => css`
    margin-top: 1rem;
    font-size: ${theme.font.code.size.small};
    color: ${theme.colors.default.textSecondary};
  `}
`;
