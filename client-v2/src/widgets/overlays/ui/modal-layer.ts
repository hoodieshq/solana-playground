import { createContext, useContext } from "react";

/**
 * Whether the dialog around a `ModalFrame` is the top of `PgView`'s stack.
 * `ModalHost` keeps every stacked dialog mounted, so a dialog under another
 * keeps its state, and only the top one draws its content.
 */
export const ModalLayerContext = createContext(true);

export const useIsTopModal = () => useContext(ModalLayerContext);
