import { useRef, useState } from "react";
import type { FC } from "react";

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
  const openReport = useRef({ sent: false });
  return (
    <ModalOpenReportContext.Provider value={openReport.current}>
      <page.Component {...page.props} setPage={setPage} />
    </ModalOpenReportContext.Provider>
  );
};
