import { useCallback, useState } from "react";
import type { ReactElement } from "react";

import { Modal } from "@/shared/ui/modal";
import { useSetStatic } from "@/hooks/useSetStatic";
import { PgCommon } from "@/utils/common";
import type { Elementable } from "@/utils/types";
import { PgView } from "@/utils/view";
import { ModalLayerContext } from "./modal-layer";

/**
 * Renders the dialogs opened with `PgView.setModal` in the design system's
 * `Modal`. A dialog opened from another stacks on it; the one below stays
 * mounted, hidden, and shows again with its state when the top one closes.
 * Escape and a click outside close the top dialog with no answer.
 */
export const ModalHost = () => {
  const [modals, setModals] = useState<ReactElement[]>([]);

  const setModalStatic = useCallback(
    ({
      elementable,
      props,
    }: {
      elementable: Elementable | null;
      props?: Record<string, unknown>;
    }) => {
      // `PgView.setModal(null)` closes the top dialog
      if (elementable === null) {
        setModals((modals) => modals.slice(0, -1));
        return;
      }

      const modal = PgView.normalizeElement(elementable, props) as ReactElement;
      setModals((modals) => [...modals, modal]);
    },
    []
  );

  useSetStatic(
    PgCommon.getSendAndReceiveEventNames(PgView.events.MODAL_SET).send,
    setModalStatic
  );

  return (
    <Modal
      open={modals.length > 0}
      onOpenChange={(open) => {
        if (!open) PgView.closeModal(null);
      }}
    >
      {modals.map((modal, i) => (
        // The index is the dialog's place in the stack, which never changes
        // while it is open
        <ModalLayerContext.Provider key={i} value={i === modals.length - 1}>
          {modal}
        </ModalLayerContext.Provider>
      ))}
    </Modal>
  );
};
