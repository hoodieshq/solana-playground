/** An overlay scroll indicator, where the browser's own scrollbar is hidden (see prototype.css):
 * iPhone's in the phone frame, macOS's on the desktop screen. A thin pill floats over the right
 * edge of whatever is scrolling, shows while it moves and fades once it stops. It takes no width,
 * so nothing shifts. A real phone draws its own, so there it doesn't run */

// iOS: 3 wide, 3 from the edge. macOS draws a wider pill closer in. Never shorter than 36
const SIZES = { phone: { width: 3, inset: 3 }, desktop: { width: 6, inset: 2 } }
const MIN = 36
// How long it stays after the last scroll, and how long it takes to fade (matches prototype.css)
const IDLE = 600
const FADE = 300

type Bar = { el: HTMLDivElement; idle: number; gone: number }

export function installScrollIndicator(kind: keyof typeof SIZES = "phone") {
  const { width: WIDTH, inset: INSET } = SIZES[kind]
  const bars = new Map<Element, Bar>()

  const draw = (box: Element) => {
    const { scrollHeight, clientHeight, scrollTop } = box
    if (scrollHeight <= clientHeight + 1) return

    let bar = bars.get(box)
    if (!bar) {
      const el = document.createElement("div")
      el.className = "pg-scroll-indicator"
      el.setAttribute("aria-hidden", "true")
      document.body.append(el)
      bar = { el, idle: 0, gone: 0 }
      bars.set(box, bar)
    }

    const r = box.getBoundingClientRect()
    const track = clientHeight - INSET * 2
    const length = Math.max(MIN, (clientHeight / scrollHeight) * track)
    // Clamped, so a rubber band past either end doesn't carry the pill off its track
    const at = Math.min(1, Math.max(0, scrollTop / (scrollHeight - clientHeight)))
    const s = bar.el.style
    s.top = `${r.top + box.clientTop + INSET + at * (track - length)}px`
    s.left = `${r.left + box.clientLeft + box.clientWidth - INSET - WIDTH}px`
    s.width = `${WIDTH}px`
    s.height = `${length}px`
    bar.el.dataset.visible = ""

    // Fade after the last scroll, then drop the pill, so screens that come and go leave nothing behind
    const { el } = bar
    window.clearTimeout(bar.idle)
    window.clearTimeout(bar.gone)
    bar.idle = window.setTimeout(() => {
      delete el.dataset.visible
      bars.get(box)!.gone = window.setTimeout(() => {
        el.remove()
        bars.delete(box)
      }, FADE)
    }, IDLE)
  }

  document.addEventListener(
    "scroll",
    (e) => {
      const box = e.target instanceof Element ? e.target : document.scrollingElement
      if (box) draw(box)
    },
    { capture: true, passive: true }
  )
}
