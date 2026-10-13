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
 * Set by `ModalPages`: reports the dialog as opened, and only the first call
 * counts, so a dialog of several pages is counted once. A `ModalFrame`
 * outside `ModalPages` has none and reports itself.
 */
export const ModalOpenReportContext = createContext<
  ((name: string) => void) | null
>(null);

export const useOpenReport = () => useContext(ModalOpenReportContext);
