import { act } from "react";
import type { ReactNode } from "react";
import { createRoot } from "react-dom/client";

(
  globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

const unmounts: Array<() => void> = [];

/** Renders `node` into a fresh container attached to `document.body` */
export const renderNode = (node: ReactNode): HTMLElement => {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  act(() => root.render(node));
  unmounts.push(() => {
    act(() => root.unmount());
    container.remove();
  });
  return container;
};

/** Unmounts everything `renderNode` rendered; call it in `afterEach` */
export const unmountAll = () =>
  unmounts.splice(0).forEach((unmount) => unmount());
