import { FC, useEffect } from "react";
import styled from "styled-components";

import Connect from "./Connect";
import type { ConnectPreset } from "./Connect";
import Modal from "../../../../components/Modal";
import { PgView } from "../../../../utils";
import { PgAssistant } from "../store";

/**
 * The connect form, as a dialog over whatever you were doing.
 *
 * It used to take the chat's place: touching the composer swapped the whole
 * pane for a form, with a Back button to get the conversation again. Now it is
 * asked for only when a pick needs something — a key, a base URL — and it
 * closes itself the moment a connection is made, leaving the chat where it was.
 */
const ConnectDialog: FC<{ preset?: ConnectPreset }> = ({ preset }) => {
  useEffect(() => {
    const before = PgAssistant.connection;
    return PgAssistant.onDidChange(() => {
      const now = PgAssistant.connection;
      if (now && now !== before) PgView.closeModal(true);
    }).dispose;
  }, []);

  return (
    <Modal title="Connect a model" closeButton>
      <Body>
        <Connect preset={preset} />
      </Body>
    </Modal>
  );
};

/** @returns whether a connection was made before the dialog closed */
export const openConnectDialog = async (preset?: ConnectPreset) =>
  !!(await PgView.setModal<boolean, { preset?: ConnectPreset }>(ConnectDialog, {
    preset,
  }));

/* The form was laid out for a side pane; a dialog gives it the same width and
   lets it scroll rather than run off the screen */
const Body = styled.div`
  width: min(26rem, calc(100vw - 3rem));
  max-height: min(38rem, calc(100vh - 10rem));
  display: flex;
  flex-direction: column;
  overflow: hidden;
  margin: -0.5rem -1rem;
`;

export default ConnectDialog;
