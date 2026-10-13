import { createContext, useContext } from "react";

/**
 * Whether the dialog around a `ModalFrame` is the top of `PgView`'s stack.
 * `ModalHost` keeps every stacked dialog mounted, so a dialog under another
 * keeps its state, and only the top one draws its content. A stacked dialog
 * keeps its body's state, but the components under its frame remount.
 */
export const ModalLayerContext = createContext(true);

export const useIsTopModal = () => useContext(ModalLayerContext);

/**
 * Set by `ModalPages`: whether one of its pages already reported the dialog
 * as opened, so a dialog of several pages is counted once.
 */
export const ModalOpenReportContext = createContext<{ sent: boolean } | null>(
  null
);

export const useOpenReport = () => useContext(ModalOpenReportContext);
