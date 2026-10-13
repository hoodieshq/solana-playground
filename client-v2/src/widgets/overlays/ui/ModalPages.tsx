import { useCallback, useRef, useState } from "react";
import type { FC } from "react";

import { overlayTelemetry } from "../model/telemetry";
import { ModalOpenReportContext } from "./modal-layer";

export type ModalPageProps = { setPage: <P>(page: ModalPage<P>) => void };

export type ModalPage<P = any> = {
  Component: FC<P & ModalPageProps>;
  props?: P;
};

/**
 * A dialog of several pages. Each page renders its own `ModalFrame` and moves
 * to another with `setPage`; the dialog stays open throughout.
 */
export const ModalPages = ({ defaultPage }: { defaultPage: ModalPage }) => {
  const [page, setPage] = useState<ModalPage>(defaultPage);
  const reported = useRef(false);
  const reportOpened = useCallback((name: string) => {
    if (reported.current) return;
    reported.current = true;
    overlayTelemetry.track("overlay_modal_opened", { name });
  }, []);
  return (
    <ModalOpenReportContext.Provider value={reportOpened}>
      <page.Component {...page.props} setPage={setPage} />
    </ModalOpenReportContext.Provider>
  );
};
