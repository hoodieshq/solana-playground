import { Component, useCallback, useRef, useState } from "react";
import type { ErrorInfo, ReactElement, ReactNode } from "react";

import { createLogger } from "@/shared/lib/logger";
import { Modal } from "@/shared/ui/modal";
import { useSetStatic } from "@/hooks/useSetStatic";
import { PgCommon } from "@/utils/common";
import type { Elementable } from "@/utils/types";
import { PgView } from "@/utils/view";
import { ModalDismissContext, ModalLayerContext } from "./modal-layer";

const log = createLogger("overlays:modal-host");

/**
 * Keeps a dialog that throws while rendering from taking the IDE with it:
 * the failure is reported, the user is told, and the dialog closes with no
 * answer, so the code awaiting it goes on. `PgView.setModal` never rejects,
 * so this is the only place that can tell the user who opened it.
 */
class ModalBoundary extends Component<
  { children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    log.error(error, {
      report: true,
      context: { componentStack: info.componentStack },
    });
    PgView.setToast(
      () => (
        <span>
          <strong>Could not open.</strong> Try again.
        </span>
      ),
      { options: { name: "modal-failed" } }
    );
    PgView.closeModal(null);
  }

  render() {
    return this.state.failed ? null : this.props.children;
  }
}

/**
 * Renders the dialogs opened with `PgView.setModal` in the design system's
 * `Modal`. A dialog opened from another stacks on it. The one below stays
 * mounted but draws nothing: state held above its `ModalFrame` survives, the
 * frame's own subtree remounts when it is on top again. Escape, a press
 * outside and the header's Close close the top dialog with no answer, except
 * while its submit runs.
 */
export const ModalHost = () => {
  const [modals, setModals] = useState<{ id: string; element: ReactElement }[]>(
    []
  );
  // Set by the top dialog's `ModalFrame` while its submit runs
  const dismissBlocked = useRef(false);
  const blockDismiss = useCallback((blocked: boolean) => {
    dismissBlocked.current = blocked;
  }, []);

  const setModalStatic = useCallback(
    (
      detail:
        | {
            id: string;
            elementable: Elementable;
            props?: Record<string, unknown>;
          }
        | { elementable: null }
    ) => {
      // `PgView.closeModal` closes the top dialog
      if (detail.elementable === null) {
        setModals((modals) => modals.slice(0, -1));
        return;
      }

      const { id, elementable, props } = detail;
      const element = PgView.normalizeElement(
        elementable,
        props
      ) as ReactElement;
      setModals((modals) => [...modals, { id, element }]);
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
        if (!open && !dismissBlocked.current) PgView.closeModal(null);
      }}
    >
      <ModalDismissContext.Provider value={blockDismiss}>
        {modals.map((modal, i) => (
          <ModalLayerContext.Provider
            key={modal.id}
            value={i === modals.length - 1}
          >
            <ModalBoundary>{modal.element}</ModalBoundary>
          </ModalLayerContext.Provider>
        ))}
      </ModalDismissContext.Provider>
    </Modal>
  );
};
