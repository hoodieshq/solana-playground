import { useEffect, useState, type RefObject } from "react"

/** Whether a scroll box has more above and below what shows, for fade-edges' data-more-top and
 * data-more-bottom. ui/useMoreBelow.ts does the foot; this adds the top the same way */
export function useScrollEdges(box: RefObject<HTMLElement | null>) {
  const [edges, setEdges] = useState({ top: false, bottom: false })
  useEffect(() => {
    const el = box.current
    if (!el) return
    const check = () => {
      const top = el.scrollTop > 1
      const bottom = el.scrollHeight - el.scrollTop - el.clientHeight > 1
      setEdges((e) => (e.top === top && e.bottom === bottom ? e : { top, bottom }))
    }
    check()
    el.addEventListener("scroll", check, { passive: true })
    const ro = new ResizeObserver(check)
    ro.observe(el)
    if (el.firstElementChild) ro.observe(el.firstElementChild)
    return () => {
      el.removeEventListener("scroll", check)
      ro.disconnect()
    }
  }, [box])
  return edges
}
