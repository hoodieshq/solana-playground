import { useEffect, useRef } from "react"

import { useSettings } from "../settings/store"
import { reducedMotion } from "./type"

/* Sole, the cat on the roof (Almaz, 25 Nov). The composer's top edge is a roof ridge: in an empty chat a small grey
   pixel cat climbs onto it and, the first time in a day, plays with a ball of yarn; every chat after it only hops up
   and sits. It is there to make the panel feel lived in, not to help: after the entrance it only blinks, it moves
   again only when you touch the ball, it sleeps once the pointer has left the panel, and it is gone with the first
   message. Grey on purpose, in the interface's own tones: the motion already draws the eye, and purple and green
   mean "current" and "success" here. Board and rules: prototype/review-high/sole-character/roof.html.
   ?sole=full|short|off overrides the once a day rule for a review. Settings has its switch (Assistant, "Sole the
   cat"), the assistant turns it off or back on when asked (programs/store.ts, soleAsk), ⌘K has the action, and a
   small cat under the field (SoleToggle) does both right where it lives */

const CSS = `
.sole-cat svg { display: block; shape-rendering: crispEdges; }
.sole-cat .b { fill: color-mix(in srgb, var(--text-tertiary) 72%, var(--surface-base)); }
.sole-cat .s { fill: color-mix(in srgb, var(--text-tertiary) 58%, var(--surface-base)); }
.sole-cat .f { fill: color-mix(in srgb, var(--text-tertiary) 46%, var(--surface-base)); }
.sole-cat .l { fill: color-mix(in srgb, var(--text-tertiary) 36%, var(--surface-base)); }
.sole-cat .e { fill: color-mix(in srgb, var(--foreground) 88%, var(--surface-base)); }
.sole-cat .o { fill: var(--muted-foreground); }
.sole-cat .y { fill: color-mix(in srgb, var(--text-tertiary) 72%, var(--surface-base)); }`

type Cell = [x: number, y: number, tone: string]
type Sprite = { cells: Cell[]; box: string; side?: boolean; w?: number; h?: number }
type Eyes = "open" | "blink" | "happy" | "left" | "right" | "up" | "down"
type Front = { back?: boolean; dy?: number; sq?: boolean; eyes?: Eyes; tail?: "up" | "mid" | "down"; ears?: "up" | "perk" | "flat"; paw?: 0 | 1 | 2; z?: 0 | 1 | 2 }
type Step = "stand" | "w1" | "w2" | "w3" | "g1" | "g2" | "g3" | "skid" | "trap" | "roll1" | "roll2" | "crouch" | "leap" | "wind" | "hit" | "follow"
type Side = { f?: Step; tail?: "up" | "mid" | "low" | "run"; eyes?: "open" | "blink" | "down" }

/* Both views share one 20 by 16 box, a head 6 rows tall under 2 rows of ear, 2 by 2 eyes, a body 4 rows thick and
   paws on rows 11 and 12, so the cat keeps its size when it turns. Ground is y 13 */

/** Facing you, sitting. Centre x 5 */
export function front(pose: Front): Sprite {
  const p = { back: false, dy: 0, sq: false, eyes: "open", tail: "up", ears: "up", paw: 0, z: 0, ...pose }
  const out: Cell[] = []
  const put = (x: number, y: number, c = "b") => out.push([x, y + p.dy, c])
  const [x0, x1, top] = p.sq ? [1, 9, 10] : [2, 8, 8]
  for (let y = top; y <= 11; y++) for (let x = x0; x <= x1; x++) put(x, y, y === 11 ? "s" : "b")
  for (const x of [x0 + 1, x0 + 2, x1 - 2, x1 - 1]) put(x, 12, "s")
  const tails = { up: [[1, 11], [2, 11], [3, 10], [3, 9], [3, 8], [3, 7]], mid: [[1, 11], [2, 11], [3, 11], [4, 10], [4, 9], [5, 8]], down: [[1, 11], [2, 11], [3, 11], [4, 11], [5, 12], [6, 12]] }
  if (!p.back) tails[p.tail as "up"].forEach(([dx, y], i) => put(x1 + dx, y, i === 5 && !p.sq ? "e" : "b"))
  if (p.paw) {
    put(x0 - 1, 10)
    put(x0 - 2, p.paw === 2 ? 11 : 10, "s")
  }
  const hd = p.sq ? 2 : 0
  const H = (x: number, y: number, c = "b") => put(x, y + hd, c)
  for (let x = 1; x <= 9; x++) {
    H(x, 2)
    H(x, 7)
  }
  for (let y = 3; y <= 6; y++) for (let x = 0; x <= 10; x++) H(x, y)
  for (const [a, d] of [[0, 1], [10, -1]]) {
    H(a, 1)
    H(a + d, 1)
    if (p.ears !== "flat") {
      H(a + 2 * d, 1)
      H(a, 0)
    }
    if (p.ears === "perk") H(a, -1)
  }
  const lx = 2, rx = 7, ey = 4 + hd
  const E = (list: number[][], c = "e") => list.forEach(([x, y]) => put(x, y, c))
  // From behind: no face, and the tail lies up its back
  if (p.back) E([[5, 11], [5, 10], [6, 9], [7, 8]], "f"), E([[8, 8]])
  else if (p.eyes === "blink") E([[lx, ey + 1], [lx + 1, ey + 1], [rx, ey + 1], [rx + 1, ey + 1]], "l")
  else if (p.eyes === "happy") E([[lx - 1, ey + 1], [lx, ey], [lx + 1, ey + 1], [rx, ey + 1], [rx + 1, ey], [rx + 2, ey + 1]])
  else {
    const [dx, dy] = ({ left: [-1, 0], right: [1, 0], down: [0, 1], up: [0, -1] } as Record<string, number[]>)[p.eyes] ?? [0, 0]
    E([lx, rx].flatMap((x) => [[x + dx, ey + dy], [x + 1 + dx, ey + dy], [x + dx, ey + 1 + dy], [x + 1 + dx, ey + 1 + dy]]))
  }
  const zs = [[], [[12, 3], [13, 3], [12, 4], [13, 4]], [[12, -2], [13, -2], [14, -2], [13, -1], [12, 0], [13, 0], [14, 0]]][p.z]
  zs.forEach(([x, y]) => out.push([x, y, "s"]))
  return { cells: out.filter(([, y]) => y < 13), box: "-5 -3 20 16" }
}

/** In profile, facing right. Centre x 7.5. The step is w1 w2 w3 w2; the swipe is wind, hit, follow */
export function side(pose: Side): Sprite {
  const p = { f: "stand", tail: "up", eyes: "open", ...pose }
  const out: Cell[] = []
  /* The run is a gallop in three frames: gathered (back humped, all four feet under it), stretched (in the air, front
     legs out ahead, hind legs trailing), and landed on the front feet. Head low, ears back, tail straight out */
  const run = p.f === "g1" || p.f === "g2" || p.f === "g3"
  const air = p.f === "leap" || p.f === "g2"
  // On its back: the body on the roof, the head lifted to look, and the legs in the air, one pair higher each frame
  const roll = p.f === "roll1" || p.f === "roll2"
  const sh = roll ? 2 : p.f === "crouch" || p.f === "skid" || p.f === "trap" ? 1 : p.f === "leap" ? -3 : p.f === "g2" ? -1 : 0
  const put = (x: number, y: number, c = "b") => out.push([x, y + sh, c])
  for (let x = 2; x <= 7; x++) put(x, 7)
  if (p.f === "g1") for (let x = 4; x <= 7; x++) put(x, 6)
  for (let y = 8; y <= 10; y++) for (let x = p.f === "g2" ? 1 : 2; x <= 10; x++) put(x, y, y === 10 ? "s" : "b")
  const tails = { up: [[1, 8], [0, 7], [0, 6], [0, 5], [0, 4]], mid: [[1, 8], [0, 8], [-1, 7], [-1, 6], [-1, 5]], low: [[1, 9], [0, 9], [-1, 9], [-2, 8], [-2, 7]], run: [[1, 8], [0, 8], [-1, 8], [-2, 7], [-3, 7]] }
  tails[(run ? "run" : p.tail) as "up"].forEach(([x, y], i) => put(x, y, i === 4 ? "e" : "b"))
  const nod = p.f === "wind" || p.f === "hit" || p.f === "trap" || run ? 1 : 0
  const H = (x: number, y: number, c = "b") => put(x, y + nod, c)
  for (let x = 8; x <= 14; x++) {
    H(x, 2)
    H(x, 7)
  }
  for (let y = 3; y <= 6; y++) for (let x = 7; x <= 15; x++) H(x, y)
  for (const [x, y] of [[8, 1], [9, 1], [12, 1], [13, 1]]) H(x, y)
  if (!run) {
    H(8, 0)
    H(13, 0)
  }
  if (p.eyes === "blink") {
    H(12, 5, "l")
    H(13, 5, "l")
  } else {
    const d = p.eyes === "down" ? 1 : 0
    for (const [x, y] of [[12, 4], [13, 4], [12, 5], [13, 5]]) H(x, y + d, "e")
  }
  // Legs stay on the ground whatever the body does, except in the air
  const L = (list: number[][], c: string) => list.forEach(([x, y]) => out.push([x, y + (air ? sh : 0), c]))
  const back = [[3, 11], [3, 12]], far = [[5, 11], [5, 12], [8, 11], [8, 12]]
  if (roll) {
    L([[4, 8], [5, 8]], "f")
    L(p.f === "roll1" ? [[3, 8], [3, 7], [6, 8], [6, 7], [6, 6]] : [[3, 8], [3, 7], [3, 6], [6, 8], [6, 7]], "s")
  } else if (p.f === "w1") {
    L([[5, 11], [6, 12], [8, 11], [7, 12]], "f")
    L([[3, 11], [2, 12], [10, 11], [11, 12]], "s")
  } else if (p.f === "w2") {
    // The body stays level through the step: a walking cat's back doesn't bob
    L([[6, 11], [6, 12], [7, 11], [7, 12]], "f")
    L([[4, 11], [4, 12], [9, 11], [9, 12]], "s")
  } else if (p.f === "w3") {
    L([[3, 11], [2, 12], [10, 11], [11, 12]], "f")
    L([[5, 11], [6, 12], [8, 11], [7, 12]], "s")
  } else if (p.f === "g1") {
    L([[5, 11], [6, 12], [8, 11], [7, 12]], "f")
    L([[4, 11], [5, 12], [9, 11], [8, 12]], "s")
  } else if (p.f === "g2") L([[2, 11], [1, 11], [0, 12], [11, 11], [12, 11], [13, 12]], "s")
  else if (p.f === "g3") {
    L([[9, 11], [9, 12]], "f")
    L([[2, 11], [1, 11], [11, 11], [11, 12], [12, 12]], "s")
  } else if (p.f === "skid") {
    L([[9, 12]], "f")
    L([[3, 12], [4, 12], [11, 12], [12, 12]], "s")
  } else if (p.f === "trap") {
    L([[5, 12]], "f")
    L([[3, 12], [11, 12], [12, 12], [13, 12]], "s")
  } else if (p.f === "crouch") {
    L([[5, 12], [8, 12]], "f")
    L([[3, 12], [10, 12]], "s")
  } else if (p.f === "leap") L([[2, 11], [1, 11], [11, 11], [12, 11], [13, 12]], "s")
  else {
    L(far, "f")
    const paw = { wind: [[11, 10], [12, 9]], hit: [[11, 11], [12, 11], [13, 11]], follow: [[11, 10], [12, 10], [13, 9]] }[p.f as "wind"] ?? [[10, 11], [10, 12]]
    L([...back, ...paw], "s")
  }
  return { cells: out, box: "-2.5 -3 20 16", side: true }
}

const BALL = [[1, 0], [2, 0], [0, 1], [1, 1], [2, 1], [3, 1], [0, 2], [1, 2], [2, 2], [3, 2], [1, 3], [2, 3]]
const YARN = [[[1, 0], [2, 1], [3, 2]], [[2, 0], [1, 1], [0, 2]], [[0, 1], [1, 2], [2, 3]], [[3, 1], [2, 2], [1, 3]]]
const ballSprite = (spin: number): Sprite => ({ cells: BALL.map(([x, y]) => [x, y, YARN[spin % 4].some(([a, b]) => a === x && b === y) ? "y" : "o"]), box: "0 0 4 4", w: 4, h: 4 })

const NS = "http://www.w3.org/2000/svg"
/* The stage is laid out half as wide again as the composer and scaled to two thirds: a 3 px cell draws as 2, and
   every distance and speed below shrinks with the cat. Numbers are in the stage's own px */
const K = 3, SCALE = 2 / 3
/* A cat walks about one body length a second and runs four or five; it gets to speed in a couple of strides */
const G = 900, BOUNCE = 0.45, FRICTION = 180, ACCEL = 420, BURST = 950, STRIDE = 8, BOUND = 11, RUN = 230, WALK = 42, REACH = 24
const STEPS: Step[] = ["w1", "w2", "w3", "w2"]
const BOUNDS: Step[] = ["g1", "g2", "g3"]
const DAY = "oak.sole.day"
/** Chats it has already climbed into since the page loaded */
const entered = new Set<string>()
/** ?sole= from this page, or from the page round the phone's frame */
const asked = () => {
  const own = new URLSearchParams(location.search).get("sole")
  if (own) return own
  try {
    return new URLSearchParams(window.top?.location.search ?? "").get("sole")
  } catch {
    return null
  }
}

function draw(svg: SVGElement, s: Sprite) {
  svg.setAttribute("viewBox", s.box)
  svg.setAttribute("width", String((s.w ?? 20) * K))
  svg.setAttribute("height", String((s.h ?? 16) * K))
  svg.innerHTML = s.cells.map(([x, y, c]) => `<rect x="${x}" y="${y}" width="1" height="1" class="${c}"/>`).join("")
}

/** Puts the cat on `stage`, watching the pointer over `panel`. Returns what the composer tells it */
function start(stage: HTMLElement, panel: HTMLElement, phone: boolean, mode: "full" | "short" | "there", entered: () => void) {
  const el = () => {
    const d = document.createElement("div")
    d.style.cssText = "position:absolute;bottom:0;left:0;transform:translateX(-50%);pointer-events:auto;cursor:pointer"
    d.append(document.createElementNS(NS, "svg"))
    stage.append(d)
    return d
  }
  const cat = { el: el(), x: 0, v: 0, dir: 1, target: null as number | null, vmax: WALK, odo: 0, follow: false, air: false, flip: false }
  const ball = { el: el(), x: 0, h: 0, vx: 0, vh: 0, on: false, spin: 0, odo: 0, held: false, squash: 0 }
  cat.el.title = "Sole. The cat under the field hides it"
  ball.el.style.transformOrigin = "50% 100%"
  ball.el.style.padding = "8px 8px 0"
  const W = () => stage.clientWidth
  const LO = 26, HI = () => W() - 26
  const clamp = (x: number) => Math.max(LO, Math.min(HI(), x))
  const setCat = (s: Sprite) => {
    const svg = cat.el.firstChild as SVGElement
    draw(svg, s)
    svg.style.transform = (s.side ? cat.dir < 0 : cat.flip) ? "scaleX(-1)" : ""
  }
  const F = (p: Front = {}) => setCat(front(p))
  const S = (p: Side = {}) => setCat(side(p))

  /* One clock for everything. An act is a chain of waits on it; starting another act, or the composer speaking,
     moves `act` on and the old chain's next wait rejects */
  let now = 0, last = performance.now(), act = 0, dead = false
  let resting = false, asleep = false, gone = false, idle = 0, typed = 0, fun = 0, solo = 0
  let pointer: { x: number; y: number } | null = null
  type Waiter = { cond: () => boolean; id: number; ok: () => void; no: (why: string) => void }
  const waiters: Waiter[] = []
  const until = (cond: () => boolean, id: number) => new Promise<void>((ok, no) => waiters.push({ cond, id, ok, no }))
  const wait = (ms: number, id: number) => {
    const t = now + ms
    return until(() => now >= t, id)
  }

  /* The ball: gravity, a bounce that loses over half its speed, rolling friction; off the roof's end it falls.
     The cat: speeds up, slows before its target, and changes its step by distance so its feet don't slide */
  const tick = () => {
    const t = performance.now()
    const dt = Math.min(0.05, (t - last) / 1000)
    last = t
    now += dt * 1000
    if (ball.on && !ball.held) {
      const over = ball.x < -4 || ball.x > W() + 4
      ball.vh -= G * dt
      ball.h += ball.vh * dt
      if (ball.h <= 0 && !over) {
        ball.h = 0
        if (ball.vh < -120) ball.squash = now + 60
        ball.vh = ball.vh < -70 ? -ball.vh * BOUNCE : 0
        if (ball.vh === 0) {
          const s = Math.sign(ball.vx)
          ball.vx -= s * FRICTION * dt
          if (Math.sign(ball.vx) !== s) ball.vx = 0
        }
      }
      ball.x += ball.vx * dt
      ball.odo += Math.abs(ball.vx) * dt
      if (ball.odo > 6) {
        ball.odo = 0
        draw(ball.el.firstChild as SVGElement, ballSprite(++ball.spin))
      }
      if (ball.h < -130) {
        ball.on = false
        ball.el.style.opacity = "0"
      }
    }
    if (cat.follow && ball.on) cat.target = clamp(ball.x - Math.sign(ball.x - cat.x || 1) * REACH)
    if (cat.target != null) {
      const dx = cat.target - cat.x, d = Math.abs(dx)
      if (d < 1 && Math.abs(cat.v) < 40) {
        cat.x = cat.target
        cat.v = 0
        if (!cat.follow) {
          cat.target = null
          if (!cat.air) S()
        }
      } else {
        if (d > 2) cat.dir = dx > 0 ? 1 : -1
        const running = cat.vmax > 100, acc = running ? BURST : ACCEL
        const want = cat.dir * Math.min(cat.vmax, Math.sqrt(2 * acc * d) + 12)
        cat.v += Math.max(-acc * dt, Math.min(acc * dt, want - cat.v))
        cat.x += cat.v * dt
        cat.odo += Math.abs(cat.v) * dt
        if (!cat.air) {
          // It gallops only while it is really moving; the last strides of a run are steps
          if (running && Math.abs(cat.v) > 90) S({ f: BOUNDS[Math.floor(cat.odo / BOUND) % 3] })
          else {
            const i = Math.floor(cat.odo / STRIDE)
            S({ f: STEPS[i % 4], tail: i % 6 < 3 ? "up" : "mid" })
          }
        }
      }
    }
    cat.el.style.left = `${cat.x}px`
    ball.el.style.left = `${ball.x}px`
    ball.el.style.transform = `translate(-50%, ${-ball.h}px)${ball.squash > now ? " scale(1.2, 0.8)" : ""}`
    for (let i = waiters.length - 1; i >= 0; i--) {
      const w = waiters[i]
      if (w.id !== act) {
        waiters.splice(i, 1)
        w.no("cancelled")
      } else if (w.cond()) {
        waiters.splice(i, 1)
        w.ok()
      }
    }
  }
  const clock = window.setInterval(tick, 1000 / 60)

  const halt = () => {
    cat.target = null
    cat.follow = false
    cat.air = false
    cat.v = 0
    cat.flip = false
    ball.held = false
    resting = false
    asleep = false
    window.clearTimeout(idle)
    window.clearTimeout(fun)
  }
  const play = (fn: (id: number) => Promise<unknown>) => {
    const id = ++act
    halt()
    fn(id).then(
      () => {
        if (id === act && !dead) rest(id)
      },
      () => {}
    )
  }

  const eyesOn = (x: number, h = 0): Eyes => (h > 26 ? "up" : x < cat.x - 14 ? "left" : x > cat.x + 14 ? "right" : "down")
  const goTo = async (id: number, x: number, vmax = WALK) => {
    cat.vmax = vmax
    cat.target = clamp(x)
    await until(() => cat.target == null, id)
  }
  /** Sit and follow the ball with the eyes until it lies still */
  const watch = async (id: number, min = 300) => {
    const t = now + min
    while (now < t || Math.abs(ball.vx) > 8 || ball.h > 0) {
      F({ ears: "perk", eyes: ball.on ? eyesOn(ball.x, ball.h) : "open" })
      await wait(70, id)
      if (!ball.on) break
    }
  }
  const throwBall = (x: number, h: number, vx = 0) => {
    Object.assign(ball, { x, h, vx, vh: 0, on: true, held: false })
    // Placed now, not on the next tick: it showed for a frame at the roof's left end
    ball.el.style.left = `${x}px`
    ball.el.style.transform = `translate(-50%, ${-h}px)`
    cat.el.style.left = `${cat.x}px`
    ball.el.style.opacity = "1"
    draw(ball.el.firstChild as SVGElement, ballSprite(ball.spin))
  }
  /** The swipe: down, the paw back, the paw on the ball, the carry through. Nothing moves before the paw meets the
   * ball; both hold still for a beat on contact, then the ball leaves with a small hop */
  const swipe = async (id: number, dir: number, far: number) => {
    cat.dir = dir
    S({ f: "crouch", tail: "low", eyes: "down" })
    await wait(160, id)
    S({ f: "wind", eyes: "down", tail: "mid" })
    await wait(90, id)
    S({ f: "hit", eyes: "down" })
    await wait(50, id)
    ball.held = false
    ball.vx = dir * Math.sqrt(2 * FRICTION * far * 0.55) * (0.9 + Math.random() * 0.2)
    ball.vh = 150
    S({ f: "follow" })
    await wait(170, id)
    S()
  }
  /** Turning round goes through a glance at you, not a flip */
  const turn = async (id: number, dir: number) => {
    if (cat.dir === dir) return
    F({ eyes: dir < 0 ? "left" : "right", ears: "perk" })
    await wait(90, id)
    cat.dir = dir
  }
  /** After the ball as a cat goes: it watches a beat, drops and wiggles, bursts into a gallop, and takes the last
   * stretch in one pounce that lands with its front paws on the ball */
  const dash = async (id: number) => {
    await watch(id, 280)
    if (!ball.on) return
    await turn(id, ball.x < cat.x ? -1 : 1)
    if (Math.abs(ball.x - cat.x) > 70) {
      for (let i = 0; i < 3; i++) {
        S({ f: "crouch", tail: i % 2 ? "low" : "mid" })
        await wait(100, id)
      }
      cat.vmax = RUN
      cat.follow = true
      await until(() => !ball.on || (Math.abs(ball.x - cat.x) < 64 && Math.abs(ball.vx) < 90 && ball.h < 12), id)
      cat.follow = false
      cat.target = null
    }
    if (!ball.on) {
      cat.v = 0
      return S({ f: "skid" })
    }
    const dir = ball.x < cat.x ? -1 : 1
    await leap(id, clamp(ball.x - dir * 20), 230, "trap")
    cat.v = 0
    ball.vx = 0
    ball.h = 0
    ball.vh = 0
    ball.held = true
    await wait(260, id)
    ball.held = false
  }
  const leap = async (id: number, to: number, ms = 300, land: Step = "crouch") => {
    cat.dir = to > cat.x ? 1 : -1
    cat.air = true
    S({ f: "leap" })
    const from = cat.x, t0 = now
    await until(() => {
      const k = Math.min(1, (now - t0) / ms)
      cat.x = from + (to - from) * (1 - (1 - k) * (1 - k))
      return k === 1
    }, id)
    S({ f: land, eyes: land === "trap" ? "down" : "open" })
    await wait(90, id)
    cat.air = false
    if (land === "crouch") S()
  }
  /** A round of play: catch it, then bat it and catch it again, `bats` times. It bats toward the roof's longer side so
   * the ball stays up, hopping over the ball when it is on the wrong side of it */
  const playWith = async (id: number, bats: number) => {
    await dash(id)
    for (let i = 0; i < bats && ball.on; i++) {
      const dir = ball.x > W() / 2 ? -1 : 1
      const spot = clamp(ball.x - dir * REACH)
      if (Math.sign(cat.x - ball.x) === dir) await leap(id, spot, 260)
      else if (Math.abs(cat.x - spot) > 5) await goTo(id, spot, 60)
      await swipe(id, dir, 70 + Math.random() * 50)
      await dash(id)
    }
  }
  /** On its back with the ball over its paws, tossing it from one pair to the other */
  const backPlay = async (id: number) => {
    if (!ball.on) return
    const dir = ball.x < cat.x ? -1 : 1
    await turn(id, dir)
    if (Math.abs(ball.x - cat.x) > 34) await goTo(id, ball.x - dir * 28, WALK)
    cat.dir = dir
    S({ f: "crouch", tail: "low" })
    await wait(180, id)
    ball.held = true
    ball.vx = 0
    const over = cat.x - dir * 9
    for (let i = 0; i < 9; i++) {
      S({ f: i % 2 ? "roll2" : "roll1", tail: "low" })
      ball.x = over + (i % 2 ? 4 : -4) * dir
      ball.h = i === 0 ? 14 : i % 2 ? 36 : 26
      draw(ball.el.firstChild as SVGElement, ballSprite(++ball.spin))
      await wait(190, id)
    }
    ball.held = false
    ball.vh = 90
    ball.vx = dir * 40
    S({ f: "crouch", tail: "mid" })
    await wait(170, id)
    S()
    await watch(id, 300)
  }
  /** Caught: sit by the ball, face out, a paw on it */
  const hold = async (id: number, ms: number) => {
    if (ball.on) {
      const right = cat.x >= ball.x
      if (Math.abs(cat.x - (ball.x + (right ? 22 : -22))) > 8) await goTo(id, ball.x + (right ? 22 : -22), 60)
      cat.flip = !right
      ball.vx = 0
      ball.held = true
      F({ paw: 2, eyes: "happy" })
      await wait(ms, id)
      ball.held = false
    }
    F({ eyes: "happy" })
    await wait(350, id)
  }
  /** On a phone it doesn't run: a pat from where it sits, and the ball rolls a little way */
  const pat = async (id: number, n: number) => {
    for (let i = 0; i < n && ball.on; i++) {
      if (Math.abs(cat.x - 22 - ball.x) > 6) await goTo(id, ball.x + 22, 60)
      F({ paw: 1, eyes: "left", ears: "perk" })
      await wait(130, id)
      F({ paw: 2, eyes: "left", ears: "perk" })
      ball.vx = -(70 + i * 16)
      await wait(110, id)
      await watch(id, 260)
    }
  }
  const climb = async (id: number, look: boolean) => {
    F({ dy: 13 })
    await wait(250, id)
    F({ dy: 6, ears: "perk", eyes: look ? "left" : "open" })
    await wait(450, id)
    if (look) {
      F({ dy: 6, ears: "perk", eyes: "right" })
      await wait(400, id)
    }
    for (const [dy, ms] of [[3, 80], [-2, 120], [1, 70]]) {
      F({ dy })
      await wait(ms, id)
    }
    entered()
  }
  const home = () => W() * (phone ? 0.78 : 0.74)
  /** The first chat of the day: up over the edge, a ball drops in, one swipe, the chase, and it sits with a paw on it */
  const show = async (id: number) => {
    cat.x = home()
    cat.dir = -1
    await climb(id, true)
    try {
      localStorage.setItem(DAY, new Date().toDateString())
    } catch {
      // Storage blocked: the full entrance plays again next time, which is no harm
    }
    F()
    await wait(260, id)
    if (phone) {
      throwBall(cat.x - 40, 130, 14)
      await watch(id)
      await pat(id, 3)
      F({ eyes: "happy" })
      return wait(500, id)
    }
    throwBall(W() * 0.4, 120, 40)
    await playWith(id, 1)
    await hold(id, 800)
  }
  /** Every chat after: it hops up and sits, alone. A moment later a ball drops beside it and bounces to rest, and
   * the cat follows it down with its ears up (Almaz, 25 Nov: the ball lay there before the cat came) */
  const again = async (id: number) => {
    cat.x = home()
    await climb(id, false)
    F()
    await wait(700, id)
    throwBall(cat.x - 36, 120, 8)
    await watch(id, 400)
    F({ eyes: "left" })
    await wait(500, id)
  }
  /** The ball was sent off by a click: it goes after it and plays a round or two. If the ball went over the edge it
   * runs there, looks down, and a new one drops in */
  const after = async (id: number) => {
    if (phone) {
      await watch(id, 200)
      if (ball.on) await pat(id, 2)
    } else await playWith(id, 1 + (Math.random() < 0.5 ? 1 : 0))
    if (!ball.on) {
      await turn(id, ball.x > W() / 2 ? 1 : -1)
      await goTo(id, ball.x > W() / 2 ? HI() : LO, RUN)
      S({ f: "skid" })
      await wait(120, id)
      F({ eyes: "down", ears: "flat", tail: "down" })
      await wait(1300, id)
      throwBall(W() * 0.5, 130, cat.x > W() / 2 ? 16 : -16)
      await watch(id)
    }
    await hold(id, 800)
  }
  const pet = async (id: number) => {
    for (const [dy, ms] of [[-2, 140], [1, 90], [-1, 140]]) {
      F({ eyes: "happy", dy })
      await wait(ms, id)
    }
    F({ eyes: "happy" })
    await wait(700, id)
  }
  const sleep = async (id: number) => {
    asleep = true
    for (;;) {
      F({ sq: true, eyes: "blink", ears: "flat", tail: "down", z: 1 })
      await wait(1600, id)
      F({ sq: true, eyes: "blink", ears: "flat", tail: "down", z: 2 })
      await wait(1600, id)
    }
  }
  const wake = async (id: number) => {
    F({ sq: true, ears: "flat", tail: "down" })
    await wait(350, id)
    F({ eyes: "blink", ears: "perk" })
    await wait(200, id)
    F({ dy: -1, ears: "perk" })
    await wait(160, id)
  }
  const leave = async (id: number) => {
    await turn(id, 1)
    await goTo(id, HI(), RUN)
    cat.dir = 1
    S({ f: "crouch" })
    await wait(160, id)
    S({ f: "leap" })
    cat.el.animate([{ transform: "translateX(-50%)", opacity: 1 }, { transform: "translate(-10%, -16px)", opacity: 1, offset: 0.4 }, { transform: "translate(60%, 90px)", opacity: 0 }], { duration: 520, easing: "ease-in", fill: "forwards" })
    ball.on = false
    ball.el.style.opacity = "0"
    await wait(520, id)
    stop()
  }

  /* Sitting: blink, a sway of the tail, the eyes on the pointer. Forty seconds with the pointer out of the panel
     and it lies down to sleep */
  const gaze = (): Eyes => (pointer ? (pointer.y > 0 && Math.abs(pointer.x - cat.x) < 30 ? "down" : pointer.x < cat.x - 14 ? "left" : pointer.x > cat.x + 14 ? "right" : "open") : "open")
  const rest = async (id: number) => {
    resting = true
    idle = window.setTimeout(() => id === act && !pointer && play(sleep), 40000)
    // Now and then it plays by itself, three times at most in one chat: a round with the ball, or on its back
    if (solo < 3 && ball.on && !gone)
      fun = window.setTimeout(() => {
        if (id !== act || gone || !ball.on) return
        solo++
        play(async (i) => {
          if (Math.random() < 0.45) await backPlay(i)
          else if (phone) await pat(i, 2)
          else await playWith(i, 1)
          await hold(i, 700)
        })
      }, 14000 + Math.random() * 12000)
    try {
      for (;;) {
        F({ eyes: gaze() })
        await wait(1800 + Math.random() * 1500, id)
        F({ eyes: "blink" })
        await wait(120, id)
        F({ eyes: gaze() })
        await wait(2400 + Math.random() * 2000, id)
        for (const tail of ["mid", "up", "mid"] as const) {
          F({ eyes: gaze(), tail })
          await wait(260, id)
        }
      }
    } catch {
      // Another act took over
    }
  }

  const onMove = (e: PointerEvent) => {
    const r = stage.getBoundingClientRect()
    pointer = { x: (e.clientX - r.left) / SCALE, y: e.clientY - r.bottom }
    if (asleep) play(wake)
    else if (resting) F({ eyes: gaze() })
  }
  const onOut = () => {
    pointer = null
    if (resting) F()
  }
  panel.addEventListener("pointermove", onMove)
  panel.addEventListener("pointerleave", onOut)
  ball.el.onclick = () => {
    if (!ball.on || gone) return
    ball.held = false
    ball.vx = (ball.x < W() / 2 ? 1 : -1) * (phone ? 80 : 150 + Math.random() * 60)
    ball.vh = 240
    play(after)
  }
  cat.el.onclick = () => !gone && play(pet)

  function stop() {
    dead = true
    act++
    window.clearInterval(clock)
    window.clearTimeout(idle)
    window.clearTimeout(fun)
    window.clearTimeout(typed)
    panel.removeEventListener("pointermove", onMove)
    panel.removeEventListener("pointerleave", onOut)
    cat.el.remove()
    ball.el.remove()
  }

  ball.el.style.opacity = "0"
  if (reducedMotion()) {
    cat.x = home()
    throwBall(cat.x - 26, 0)
    F()
    tick()
    window.clearInterval(clock)
  } else if (mode === "there") {
    // Back on a chat it already climbed into (the phone's Code and Ask, the panel hidden and shown): it is just there
    cat.x = home()
    throwBall(cat.x - 26, 0)
    play(async () => {})
  } else play(mode === "full" ? show : again)

  return {
    /** A key in the field: it stops where it is, sits and listens, and doesn't move while you type */
    typing() {
      if (gone || dead || reducedMotion()) return
      const id = ++act
      halt()
      F({ ears: "perk", eyes: "down" })
      window.clearTimeout(typed)
      typed = window.setTimeout(() => id === act && rest(id), 1600)
    },
    /** The first message is sent: off the roof's end, and that is all of it until the next empty chat */
    leave() {
      if (gone || dead) return
      gone = true
      window.clearTimeout(typed)
      if (reducedMotion()) stop()
      else play(leave)
    },
    /** Switched off under the field, in Settings or by a word: a small hop and it drops behind the field, as if
     * behind a stage, the way it came (Almaz, 25 Nov: the run off the roof's end was too much for a switch) */
    duck() {
      if (dead) return
      gone = true
      window.clearTimeout(typed)
      if (reducedMotion()) return stop()
      play(async (id) => {
        ball.on = false
        ball.el.style.transition = "opacity 160ms"
        ball.el.style.opacity = "0"
        // It doesn't go back down the way it came up: it turns round, shows its back, and jumps away from you
        cat.flip = false
        cat.dir = 1
        S({ tail: "mid" })
        await wait(150, id)
        F({ back: true })
        await wait(230, id)
        F({ back: true, dy: 1, ears: "flat" })
        await wait(130, id)
        for (const [dy, ms] of [[-3, 120], [-1, 70], [4, 70], [9, 70], [13, 90]]) {
          F({ back: true, dy })
          await wait(ms, id)
        }
        stop()
      })
    },
    stop,
  }
}

/* The switch's own drawing, 9 by 7 at two px a cell so every cell lands on whole pixels: the same head, ears up in
   both states, since the ears are what say "cat". On, the eyes are open; off, they are two shut lines and the
   head is dim */
const ICON = ["X.......X", "XX.....XX", "XXXXXXXXX", "XooXXXooX", "XccXXXccX", "XXXXXXXXX", ".XXXXXXX."]

/** The cat's own switch, at the end of the line under the field. In an empty chat it is the setting: the cat shows
 * in empty chats or it doesn't. Once the chat has started it calls the cat to play, until the next message */
export function SoleToggle({ on, started = false, onToggle, className }: { on: boolean; started?: boolean; onToggle: () => void; className?: string }) {
  return (
    <button
      type="button"
      aria-pressed={on}
      aria-label="Sole the cat"
      title={started ? (on ? "Send Sole away" : "Call Sole to play") : on ? "Hide Sole the cat" : "Bring Sole the cat back"}
      onClick={onToggle}
      // As tall as the network and the model beside it; the tap area reaches 44 without moving the line
      className={`relative flex h-6 w-7 shrink-0 cursor-pointer items-center justify-center rounded-md before:absolute before:-inset-x-1 before:-inset-y-2.5 hover:bg-foreground/[0.05] hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-brand-purple ${on ? "text-muted-foreground" : "text-muted-foreground/45"} ${className ?? ""}`}
    >
      <svg viewBox="0 0 9 7" width="18" height="14" shapeRendering="crispEdges" aria-hidden="true">
        {ICON.flatMap((row, y) =>
          [...row].map((c, x) => {
            // The eyes are cut out of the head, so they read on any ground: two by two when open, one shut line when off
            if (c === "." || c === "c" || (on && c === "o")) return null
            return <rect key={`${x}-${y}`} x={x} y={y} width="1" height="1" fill="currentColor" />
          })
        )}
      </svg>
    </button>
  )
}

/**
 * The cat over the composer. `id` names the chat, `on` while the chat is empty; when it turns false the cat leaves. `text` is the field's
 * value, so it can listen while you type. The parent must be `relative`, with the composer as the roof under it
 */
export function RoofCat({ id, on: empty, called = false, sent = 0, text, phone = false }: { id: string; on: boolean; called?: boolean; sent?: number; text: string; phone?: boolean }) {
  // In an empty chat it follows its switch. Once the chat has started it comes only when called, and goes with the
  // next message. `sent` counts the messages: it tells a message (it runs off) from a switch (it ducks away)
  const shown = useSettings().sole
  const on = called || (shown && empty)
  const mail = useRef(sent)
  mail.current = sent
  const summon = useRef(called)
  summon.current = called
  // Whether the switch was off a moment ago: then it hops back up from behind the field, not just "is there"
  const wasOff = useRef(!shown)
  const stage = useRef<HTMLDivElement>(null)
  const cat = useRef<ReturnType<typeof start> | null>(null)
  const wanted = useRef(on)
  wanted.current = on
  useEffect(() => {
    const el = stage.current
    const want = asked()
    if (!on || !el || (want === "off" && !called)) return
    let seen = false
    try {
      seen = localStorage.getItem(DAY) === new Date().toDateString()
    } catch {
      // Storage blocked: treat every chat as the day's first
    }
    // On a phone the chat is mounted beside the code, out of view: it climbs up when you get there, not before
    let c: ReturnType<typeof start> | null = null
    let had = mail.current
    const seeing = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting || c) return
      seeing.disconnect()
      const mode = summon.current ? "short" : entered.has(id) ? (wasOff.current ? "short" : "there") : want === "full" ? "full" : want === "short" || seen ? "short" : "full"
      wasOff.current = false
      had = mail.current
      c = start(el, (el.closest("aside, [data-sole-panel]") as HTMLElement | null) ?? el, phone, mode, () => entered.add(id))
      cat.current = c
    }, { threshold: 0.6 })
    seeing.observe(el)
    return () => {
      seeing.disconnect()
      if (!c) return
      if (cat.current === c) cat.current = null
      // The chat stopped being empty: the cat walks off by itself and clears up after. An unmount ends it now
      if (wanted.current) return c.stop()
      // Switched off or sent away: it jumps behind the field. A message: it runs to the roof's end and jumps
      const switched = mail.current === had
      window.setTimeout(c.stop, switched ? 1400 : 2600)
      if (switched) c.duck()
      else c.leave()
    }
  }, [id, on, phone])
  useEffect(() => {
    if (!shown) wasOff.current = true
  }, [shown])
  useEffect(() => {
    if (text) cat.current?.typing()
  }, [text])
  return (
    <div aria-hidden="true" className="sole-cat pointer-events-none absolute inset-x-0 bottom-[calc(100%-1px)] z-10 h-[35px]">
      <style>{CSS}</style>
      <div ref={stage} className="absolute bottom-0 left-0 h-[52px] w-[150%] origin-bottom-left scale-[0.66667]" />
    </div>
  )
}
