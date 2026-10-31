import * as React from "react"

type Edges = { top: boolean; bottom: boolean; left: boolean; right: boolean }

const NONE: Edges = { top: false, bottom: false, left: false, right: false }

/**
 * Which edges of a scroll box have more past them, for a fade there. Kept
 * up as it scrolls and as the box or its content changes size, since
 * content can grow without the box moving. It also sets data-more-top,
 * -bottom, -left and -right on the box, so the fade-edges utility needs no
 * render to follow. Pass a ref of your own as target when the box needs
 * one for something else too.
 */
function useScrollEdges<T extends HTMLElement>(deps: React.DependencyList = [], target?: React.RefObject<T | null>) {
  const own = React.useRef<T | null>(null)
  const ref = target ?? own
  const [edges, setEdges] = React.useState<Edges>(NONE)

  React.useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    const measure = () => {
      const next = {
        top: el.scrollTop > 1,
        bottom: el.scrollTop + el.clientHeight < el.scrollHeight - 1,
        left: el.scrollLeft > 1,
        right: el.scrollLeft + el.clientWidth < el.scrollWidth - 1,
      }
      for (const side of ["top", "bottom", "left", "right"] as const) {
        el.toggleAttribute(`data-more-${side}`, next[side])
      }
      setEdges((e) =>
        e.top === next.top && e.bottom === next.bottom && e.left === next.left && e.right === next.right ? e : next
      )
    }
    measure()
    el.addEventListener("scroll", measure, { passive: true })
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    for (const child of el.children) ro.observe(child)
    return () => {
      el.removeEventListener("scroll", measure)
      ro.disconnect()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)

  return [ref, edges] as const
}

export { useScrollEdges }
export type { Edges as ScrollEdges }
