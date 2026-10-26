import { useEffect, useState, type RefObject } from "react"

/** Whether a scroll box has more below what shows: for the fade at its foot, which goes once the
 * end is reached so the last line is never dimmed. Watches the scroll and the box's and its
 * content's size, since content can grow without the box moving */
export function useMoreBelow(box: RefObject<HTMLElement | null>) {
  const [more, setMore] = useState(false)
  useEffect(() => {
    const el = box.current
    if (!el) return
    const check = () => setMore(el.scrollHeight - el.scrollTop - el.clientHeight > 1)
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
  return more
}
