import { useLayoutEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { createPortal } from "react-dom";

/**
 * A DOM node that outlives the places it is shown in. Content portaled into
 * it keeps its React state and its DOM (an editor, a terminal) while the
 * layout around it changes, because only the node moves.
 */
export const useOutletNode = (className: string) => {
  const [node] = useState(() => {
    const div = document.createElement("div");
    div.className = className;
    return div;
  });
  return node;
};

/** The content, rendered into `node` from one place that never unmounts */
export const OutletContent = ({
  node,
  children,
}: {
  node: HTMLDivElement;
  children: ReactNode;
}) => createPortal(children, node);

/** Where `node` shows now; the last `Outlet` mounted for a node holds it */
export const Outlet = ({
  node,
  className,
}: {
  node: HTMLDivElement;
  className?: string;
}) => {
  const ref = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const host = ref.current!;
    host.appendChild(node);
    return () => {
      // Another Outlet may already have taken it in the same commit
      if (node.parentNode === host) host.removeChild(node);
    };
  }, [node]);
  return <div ref={ref} className={className} />;
};
