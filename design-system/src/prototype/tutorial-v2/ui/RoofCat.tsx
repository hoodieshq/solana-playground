import { useEffect, useRef } from "react"
import { Cat } from "lucide-react"

import { catShown, useSettings } from "../settings/store"
import { reducedMotion } from "./type"

/* Sole, the cat on the roof (Almaz, 25 Nov). The composer's top edge is a roof ridge, and a small grey pixel cat
   lives on it in every chat of a project or a program, until its switch under the field hides it. The first time in
   a day it climbs up and plays a round with a ball of yarn; after that it only hops up, and a ball drops beside it.
   It is there to make the panel feel lived in, not to help: it blinks, follows the pointer with its eyes, listens
   while you type, plays one of six games when you press it or its ball, plays by itself now and then, and sleeps
   once the pointer has left the panel. After its first game a triangle drops in as a second toy, and every third
   game it puts the triangle and the ball side by side, which is the Playground mark (26 Nov). Grey on purpose, in the interface's own tones: the motion already draws the
   eye, and purple and green mean "current" and "success" here. Board: prototype/review-high/sole-character/roof.html.
   ?sole=full|short|off overrides the once a day rule for a review. It is switched by the small cat under the field
   (SoleToggle), in Settings (Assistant, "Sole the cat"), from ⌘K, or by asking the assistant (programs/store.ts,
   soleAsk) */

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
type Step = "stand" | "w1" | "w2" | "w3" | "g1" | "g2" | "g3" | "skid" | "trap" | "roll1" | "roll2" | "up1" | "up2" | "crouch" | "leap" | "wind" | "hit" | "follow"
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
    // The ear's hollow, a shade down; from behind it is the ear's back
    if (p.ears !== "flat" && !p.back) H(a + d, 1, "f")
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
  if (!p.back) put(5, ey + 2, "l")
  const zs = [[], [[12, 3], [13, 3], [12, 4], [13, 4]], [[12, -2], [13, -2], [14, -2], [13, -1], [12, 0], [13, 0], [14, 0]]][p.z]
  zs.forEach(([x, y]) => out.push([x, y, "s"]))
  return { cells: out.filter(([, y]) => y < 13), box: "-5 -3 20 16" }
}

/** In profile, facing right. Centre x 7.5. The step is w1 w2 w3 w2; the swipe is wind, hit, follow */
export function side(pose: Side): Sprite {
  const p = { f: "stand", tail: "up", eyes: "open", ...pose }
  const out: Cell[] = []
  // Up on its hind legs, looking up, front paws out: low for the wait, high for the hit
  if (p.f === "up1" || p.f === "up2") {
    const at = (x: number, y: number, c = "b") => out.push([x, y, c])
    for (let y = 6; y <= 11; y++) for (let x = 5; x <= 9; x++) at(x, y, y === 11 ? "s" : "b")
    for (const x of [5, 6, 8, 9]) at(x, 12, "s")
    for (const [x, y] of [[4, 11], [3, 11], [2, 10], [1, 9]]) at(x, y)
    at(1, 8, "e")
    for (let x = 6; x <= 12; x++) {
      at(x, 0)
      at(x, 5)
    }
    for (let y = 1; y <= 4; y++) for (let x = 5; x <= 13; x++) at(x, y)
    for (const [x, y] of [[6, -1], [7, -1], [6, -2], [10, -1], [11, -1], [11, -2]]) at(x, y)
    for (const [x, y] of [[10, 1], [11, 1], [10, 2], [11, 2]]) at(x, y, "e")
    at(14, 3)
    at(14, 4, "l")
    const paws = p.f === "up1" ? [[10, 7], [11, 7], [12, 7], [13, 6]] : [[10, 6], [11, 6], [12, 6], [13, 6], [14, 5], [14, 4]]
    for (const [x, y] of paws) at(x, y, "s")
    return { cells: out, box: "-2.5 -3 20 16", side: true }
  }
  /* The run is a gallop in three frames: gathered (back humped, all four feet under it), stretched (in the air, front
     legs out ahead, hind legs trailing), and landed on the front feet. Head low, ears back, tail straight out */
  const run = p.f === "g1" || p.f === "g2" || p.f === "g3"
  const air = p.f === "leap" || p.f === "g2"
  // On its back: the body on the roof, the head lifted to look, and the legs in the air, one pair higher each frame
  const roll = p.f === "roll1" || p.f === "roll2"
  const sh = roll ? 2 : p.f === "crouch" || p.f === "skid" || p.f === "trap" ? 1 : p.f === "leap" ? -3 : p.f === "g2" ? -1 : 0
  const put = (x: number, y: number, c = "b") => out.push([x, y + sh, c])
  for (let x = 3; x <= 7; x++) put(x, 7)
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
  for (const [x, y] of [[8, 1], [9, 1], [12, 1], [13, 1]]) H(x, y, x < 10 ? "s" : "b")
  if (!run) {
    H(8, 0, "s")
    H(13, 0)
  }
  H(16, 5, "l")
  H(16, 6)
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
    // Two legs up over the belly, bent at the paw, one higher each frame
    L(p.f === "roll1" ? [[3, 8], [3, 7], [2, 6], [6, 8], [6, 7], [6, 6], [5, 5]] : [[3, 8], [3, 7], [3, 6], [2, 5], [6, 8], [6, 7], [5, 6]], "s")
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

/* Two toys, each five cells tall: a ball of yarn and a triangle. Side by side, the triangle first, they are the
   Playground mark, a play triangle and a ring (Nikita, 26 Nov). The ball stays a ball of yarn there: drawn as a ring
   it grew a hole, which a ball of yarn can't (Almaz, 26 Nov) */
const round = (x: number, y: number) => (x % 4 !== 0 || y % 4 !== 0) && x >= 0 && x < 5 && y >= 0 && y < 5
const grid = (on: (x: number, y: number) => string | false): Cell[] => [0, 1, 2, 3, 4].flatMap((y) => [0, 1, 2, 3, 4].flatMap((x): Cell[] => (on(x, y) ? [[x, y, on(x, y) as string]] : [])))
const ballSprite = (spin: number): Sprite => ({ cells: grid((x, y) => round(x, y) && ((x + y + spin) % 4 === 0 ? "y" : "o")), box: "0 0 5 5", w: 5, h: 5 })
/* Three plain points. With its corners a shade down to round them it stopped reading as a triangle (Almaz, 26 Nov) */
const TRI: Sprite = { cells: grid((x, y) => x <= 2 - Math.abs(y - 2) && "o"), box: "0 0 3 5", w: 3, h: 5 }

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
    // Sized nought until it is drawn: an undrawn svg is 300 by 150, and it took presses over the chat
    const svg = document.createElementNS(NS, "svg")
    svg.setAttribute("width", "0")
    svg.setAttribute("height", "0")
    d.append(svg)
    stage.append(d)
    return d
  }
  const cat = { el: el(), x: 0, v: 0, dir: 1, target: null as number | null, vmax: WALK, odo: 0, follow: false, air: false, flip: false, carry: false }
  const toy = (sprite: (spin: number) => Sprite, fr: number, bounce: number) => {
    const t = { el: el(), x: 0, h: 0, vx: 0, vh: 0, on: false, spin: 0, odo: 0, held: false, squash: 0, fr, bounce, sprite }
    t.el.style.transformOrigin = "50% 100%"
    t.el.style.padding = "8px 8px 0"
    t.el.style.opacity = "0"
    return t
  }
  // The yarn rolls; the triangle slides a little way and stops
  const yarn = toy(ballSprite, FRICTION, BOUNCE)
  const tri = toy(() => TRI, 420, 0.25)
  const toys = [yarn, tri]
  /** The toy the cat is playing with now */
  let ball = yarn
  const paint = (t: typeof yarn) => draw(t.el.firstChild as SVGElement, t.sprite(t.spin))
  cat.el.title = "Sole. Click it and it plays"
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
    for (const ball of toys) {
      if (!ball.on || ball.held) continue
      const over = ball.x < -4 || ball.x > W() + 4
      ball.vh -= G * dt
      ball.h += ball.vh * dt
      if (ball.h <= 0 && !over) {
        ball.h = 0
        if (ball.vh < -120) ball.squash = now + 60
        ball.vh = ball.vh < -70 ? -ball.vh * ball.bounce : 0
        if (ball.vh === 0) {
          const s = Math.sign(ball.vx)
          ball.vx -= s * ball.fr * dt
          if (Math.sign(ball.vx) !== s) ball.vx = 0
        }
      }
      ball.x += ball.vx * dt
      ball.odo += Math.abs(ball.vx) * dt
      if (ball.odo > 6) {
        ball.odo = 0
        ball.spin++
        paint(ball)
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
        // Not for the last few px: a stop that runs a little past its mark would turn it round, ball and all
        if (d > 8) cat.dir = dx > 0 ? 1 : -1
        const running = cat.vmax > 100, acc = running ? BURST : ACCEL
        // Toward the target whichever way it faces: steered by its facing, a step past the mark sent it on
        // away from it, and it paced to and fro before it stopped
        const want = Math.sign(dx) * Math.min(cat.vmax, Math.sqrt(2 * acc * d) + 12)
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
    if (cat.carry) {
      ball.x = cat.x + cat.dir * 24
      ball.h = 12
    }
    cat.el.style.left = `${cat.x}px`
    for (const t of toys) {
      t.el.style.left = `${t.x}px`
      t.el.style.transform = `translate(-50%, ${-t.h}px)${t.squash > now ? " scale(1.2, 0.8)" : ""}`
    }
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
    if (cat.carry) ball.h = 0
    cat.carry = false
    for (const t of toys) t.held = false
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
    paint(ball)
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
    ball.vx = dir * Math.sqrt(2 * ball.fr * far * 0.55) * (0.9 + Math.random() * 0.2)
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
      ball.spin++
      paint(ball)
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
  /** Up on its hind legs, keeping the ball in the air with its front paws; the fifth time it gets away */
  const juggle = async (id: number) => {
    if (!ball.on) return
    const dir = ball.x < cat.x ? -1 : 1
    await turn(id, dir)
    if (Math.abs(cat.x - (ball.x - dir * 21)) > 5) await goTo(id, ball.x - dir * 21, WALK)
    cat.dir = dir
    S({ f: "crouch", eyes: "down" })
    await wait(180, id)
    ball.vx = 0
    ball.x = cat.x + dir * 21
    ball.h = 4
    ball.vh = 310
    for (let i = 0; i < 4; i++) {
      S({ f: "up1" })
      await until(() => ball.vh < 0 && ball.h <= 31, id)
      S({ f: "up2" })
      ball.h = 31
      ball.vh = 230 + Math.random() * 60
      ball.spin++
      paint(ball)
      await wait(100, id)
    }
    S({ f: "up1" })
    ball.vx = dir * 80
    await until(() => ball.h === 0, id)
    S({ f: "crouch", tail: "mid" })
    await wait(150, id)
    S()
    await watch(id, 300)
  }
  /** An ambush: it drops behind the field until only its ears and eyes show, watches the ball, and springs on it */
  const ambush = async (id: number) => {
    if (!ball.on) return
    const dir = ball.x < cat.x ? -1 : 1
    const gap = Math.abs(ball.x - cat.x)
    if (gap < 55 || gap > 120) {
      const spot = clamp(ball.x - dir * 80)
      await turn(id, spot < cat.x ? -1 : 1)
      await goTo(id, spot, WALK)
    }
    const look: Eyes = ball.x < cat.x ? "left" : "right"
    F({ eyes: look, ears: "perk" })
    await wait(220, id)
    for (const dy of [3, 7]) {
      F({ dy, eyes: look, ears: "flat" })
      await wait(90, id)
    }
    for (let i = 0; i < 5; i++) {
      F({ dy: 7, eyes: i === 2 ? "blink" : look, ears: i % 2 ? "perk" : "up" })
      await wait(i === 2 ? 120 : 260, id)
    }
    F({ dy: 2, eyes: look, ears: "perk" })
    await wait(70, id)
    cat.dir = ball.x < cat.x ? -1 : 1
    await leap(id, clamp(ball.x - cat.dir * 20), 280, "trap")
    ball.vx = 0
    ball.held = true
    await wait(320, id)
    ball.held = false
  }
  /** It walks the ball along the roof with small taps, keeping just behind it, toward the roof's longer side */
  const dribble = async (id: number) => {
    if (!ball.on) return
    const dir = ball.x > W() / 2 ? -1 : 1
    const spot = clamp(ball.x - dir * REACH)
    if (Math.sign(cat.x - ball.x) === dir) await leap(id, spot, 260)
    else {
      await turn(id, spot < cat.x ? -1 : 1)
      await goTo(id, spot, 70)
    }
    cat.dir = dir
    for (let i = 0; i < 4 && ball.on; i++) {
      S({ f: "hit", eyes: "down" })
      ball.vx = dir * (105 + Math.random() * 30)
      await wait(80, id)
      cat.vmax = 95
      cat.follow = true
      await until(() => !ball.on || (Math.abs(ball.vx) < 25 && Math.abs((cat.target ?? cat.x) - cat.x) < 3), id)
      cat.follow = false
      cat.target = null
      cat.v = 0
    }
    S()
  }
  /** It takes the ball in its mouth, carries it to the other side of the roof, and puts it down */
  const carryTo = async (id: number, to: number) => {
    const dir = ball.x < cat.x ? -1 : 1
    await turn(id, dir)
    if (Math.abs(cat.x - (ball.x - dir * 24)) > 5) await goTo(id, ball.x - dir * 24, WALK)
    cat.dir = dir
    S({ f: "trap", eyes: "down" })
    await wait(240, id)
    ball.vx = 0
    ball.held = true
    cat.carry = true
    S()
    await wait(160, id)
    await turn(id, to < cat.x ? -1 : 1)
    await goTo(id, to, 80)
  }
  const putDown = async (id: number) => {
    S({ f: "trap", eyes: "down" })
    await wait(220, id)
    cat.carry = false
    ball.held = false
    ball.h = 0
    S()
    await wait(220, id)
  }
  const carry = async (id: number) => {
    if (!ball.on) return
    await carryTo(id, cat.x > W() / 2 ? W() * 0.22 : W() * 0.78)
    await putDown(id)
  }
  /* The mark. Side by side, the triangle first, the two toys are the Playground mark, and now and then the cat puts
     them so, a different way each time (Almaz, 26 Nov): it carries the triangle over, nudges it along with its paw,
     bats the ball across to it, or tosses the triangle up so it lands in place. Then it sits by them, pleased */
  // Centre to centre with the triangle's tip against the ball, as in the mark: half of three cells and half of five
  const PAIR = 12
  const bring = async (id: number) => {
    // Room for the cat and the triangle on the ball's left; a ball too near the roof's end is carried in first
    if (yarn.x < 96) {
      ball = yarn
      await carryTo(id, 96 + 30)
      await turn(id, -1)
      await putDown(id)
    }
    ball = tri
    await carryTo(id, yarn.x - PAIR - 24)
    await turn(id, 1)
    await wait(120, id)
    await putDown(id)
  }
  const nudge = async (id: number) => {
    ball = tri
    const dest = yarn.x - PAIR
    await turn(id, tri.x - REACH < cat.x ? -1 : 1)
    await goTo(id, tri.x - REACH, 70)
    cat.dir = 1
    for (let i = 0; i < 12 && dest - tri.x > 2; i++) {
      S({ f: "hit", eyes: "down" })
      // As far as one tap slides it, and no further than the ball
      tri.vx = Math.sqrt(2 * tri.fr * Math.min(dest - tri.x, 34))
      await wait(80, id)
      cat.vmax = 95
      cat.follow = true
      await until(() => Math.abs(tri.vx) < 5 && Math.abs((cat.target ?? cat.x) - cat.x) < 3, id)
      cat.follow = false
      cat.target = null
      cat.v = 0
    }
    S()
  }
  const batOver = async (id: number) => {
    ball = yarn
    const dest = tri.x + PAIR
    await turn(id, yarn.x + REACH < cat.x ? -1 : 1)
    await goTo(id, yarn.x + REACH, 70)
    cat.dir = -1
    S({ f: "crouch", tail: "low", eyes: "down" })
    await wait(160, id)
    S({ f: "wind", eyes: "down", tail: "mid" })
    await wait(90, id)
    S({ f: "hit", eyes: "down" })
    await wait(50, id)
    // Rolled, not hopped: friction alone stops it, right by the triangle
    yarn.vx = -Math.sqrt(2 * yarn.fr * (yarn.x - dest))
    S({ f: "follow" })
    await wait(170, id)
    S()
    await until(() => yarn.vx === 0, id)
    yarn.x = dest
    await wait(200, id)
  }
  const toss = async (id: number) => {
    ball = tri
    const dest = yarn.x - PAIR
    const dir = dest < tri.x ? -1 : 1
    const spot = clamp(tri.x - dir * 21)
    await turn(id, spot < cat.x ? -1 : 1)
    if (Math.abs(cat.x - spot) > 5) await goTo(id, spot, WALK)
    cat.dir = dir
    S({ f: "crouch", eyes: "down" })
    await wait(180, id)
    tri.vx = 0
    tri.x = cat.x + dir * 21
    tri.h = 4
    tri.vh = 300
    for (let i = 0; i < 3; i++) {
      S({ f: "up1" })
      await until(() => tri.vh < 0 && tri.h <= 31, id)
      S({ f: "up2" })
      tri.h = 31
      tri.vh = 240
      if (i < 2) await wait(100, id)
    }
    // The third one sends it over in an arc, down beside the ball
    tri.held = true
    const from = tri.x, t0 = now
    await until(() => {
      const k = Math.min(1, (now - t0) / 560)
      tri.x = from + (dest - from) * k
      tri.h = 31 * (1 - k) + 190 * k * (1 - k)
      return k === 1
    }, id)
    tri.held = false
    tri.vh = 0
    tri.squash = now + 80
    S({ f: "up1" })
    await wait(160, id)
    S({ f: "crouch", tail: "mid" })
    await wait(150, id)
    S()
  }
  let marks = Math.floor(Math.random() * 4)
  const mark = async (id: number) => {
    const k = marks++ % 4, gap = yarn.x - tri.x, fly = Math.abs(yarn.x - PAIR - tri.x)
    if (yarn.x < 40) await bring(id)
    else if (k === 1 && gap > 45 && tri.x - REACH >= LO) await nudge(id)
    else if (k === 2 && gap > 45 && yarn.x + REACH <= HI()) await batOver(id)
    else if (k === 3 && fly > 30 && fly < 170) await toss(id)
    else await bring(id)
    for (const t of toys) Object.assign(t, { vx: 0, vh: 0, h: 0 })
    // On whole cells, so the two meet edge to edge with no seam
    yarn.x = Math.round((yarn.x - 1.5) / K) * K + 1.5
    tri.x = yarn.x - PAIR
    // It comes and sits right by the pair, on the side it is nearer to
    const left = tri.x - 26, right = yarn.x + 26
    const to = (cat.x < yarn.x - 7 && left >= LO) || right > HI() ? left : right
    if (Math.abs(cat.x - to) > 4) {
      await turn(id, to < cat.x ? -1 : 1)
      await goTo(id, to, 60)
    }
    cat.flip = cat.x < tri.x
    F({ eyes: cat.x < tri.x ? "right" : "left", ears: "perk" })
    await wait(900, id)
    F({ eyes: "happy", ears: "perk" })
    await wait(1900, id)
    ball = yarn
  }
  /* The games, taken in turn so the same one doesn't come twice running. A phone has no room to run */
  const GAMES = phone ? [backPlay, juggle, ambush] : [(id: number) => playWith(id, 1), backPlay, juggle, ambush, dribble, carry]
  let next = Math.floor(Math.random() * GAMES.length)
  let plays = 0
  const game = async (id: number) => {
    plays++
    if (tri.on && yarn.on && plays % 3 === 0) return mark(id)
    ball = tri.on && plays % 2 === 0 ? tri : yarn
    if (!ball.on) {
      throwBall(clamp(cat.x + (cat.x > W() / 2 ? -60 : 60)), 120, 0)
      await watch(id)
    }
    await GAMES[next++ % GAMES.length](id)
    await hold(id, 700)
    // After its first game a second toy drops in, on the roof's emptier side
    if (!tri.on) {
      ball = tri
      throwBall(clamp(yarn.x > W() / 2 ? W() * 0.25 : W() * 0.7), 120, 0)
      await watch(id, 500)
      ball = yarn
    }
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
  /* Sitting: blink, a sway of the tail, the eyes on the pointer. Forty seconds with the pointer out of the panel
     and it lies down to sleep */
  const gaze = (): Eyes => (pointer ? (pointer.y > 0 && Math.abs(pointer.x - cat.x) < 30 ? "down" : pointer.x < cat.x - 14 ? "left" : pointer.x > cat.x + 14 ? "right" : "open") : "open")
  const rest = async (id: number) => {
    resting = true
    idle = window.setTimeout(() => id === act && !pointer && play(sleep), 40000)
    // Now and then it plays by itself, three times at most in one chat, a different game each time
    if (solo < 3 && ball.on && !gone)
      fun = window.setTimeout(() => {
        if (id !== act || gone || !ball.on) return
        solo++
        play(async (i) => {
          await game(i)
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
  for (const t of toys)
    t.el.onclick = () => {
      if (!t.on || gone) return
      // First, so the last act lets go of what it held
      play(after)
      ball = t
      t.vx = (t.x < W() / 2 ? 1 : -1) * (phone ? 80 : 150 + Math.random() * 60)
      t.vh = 240
    }
  cat.el.onclick = () => !gone && play(game)

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
    for (const t of toys) t.el.remove()
  }

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
      // What it held or tossed is let go where it is
      if (ball.on) ball.h = Math.max(0, ball.h)
      const id = ++act
      halt()
      F({ ears: "perk", eyes: "down" })
      window.clearTimeout(typed)
      typed = window.setTimeout(() => id === act && rest(id), 1600)
    },
    /** Off the field: switched off, sent away, or a message was sent. Whatever it was doing, it stops, shows its
     * back and jumps away behind the field, as if behind a stage (Almaz, 25 Nov: it used to run for the roof's end
     * on a message, now left, now right). `quick` on a message: no turn through its side first */
    duck(quick = false) {
      if (dead) return
      gone = true
      window.clearTimeout(typed)
      if (reducedMotion()) return stop()
      play(async (id) => {
        for (const t of toys) {
          t.on = false
          t.el.style.transition = "opacity 160ms"
          t.el.style.opacity = "0"
        }
        cat.flip = false
        cat.dir = 1
        if (!quick) {
          S({ tail: "mid" })
          await wait(150, id)
        }
        F({ back: true })
        await wait(quick ? 130 : 230, id)
        F({ back: true, dy: 1, ears: "flat" })
        await wait(quick ? 90 : 130, id)
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

/** The cat's own switch, at the end of the line under the field: it hides the cat and brings it back, in every chat */
export function SoleToggle({ on, onToggle, className }: { on: boolean; onToggle: () => void; className?: string }) {
  return (
    <button
      type="button"
      aria-pressed={on}
      aria-label="Sole the cat"
      title={on ? "Hide Sole the cat" : "Bring Sole the cat back"}
      onClick={onToggle}
      // As tall as the network and the model beside it; the tap area reaches 44 without moving the line
      className={`relative flex h-6 w-7 shrink-0 cursor-pointer items-center justify-center rounded-md before:absolute before:-inset-x-1 before:-inset-y-2.5 hover:bg-foreground/[0.05] hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-brand-purple ${on ? "text-muted-foreground" : "text-muted-foreground/45"} ${className ?? ""}`}
    >
      {/* A line drawing like the icons beside it, not the cat's own pixels: three tries at a pixel head read as a
          mask, an owl and a lump at this size, and the switch is the interface's, the pixels are the cat's (Almaz,
          26 Nov) */}
      <Cat aria-hidden="true" className="size-4" strokeWidth={1.5} />
    </button>
  )
}

/**
 * The cat over the composer. `id` names the chat, `on` while the chat is empty; when it turns false the cat leaves. `text` is the field's
 * value, so it can listen while you type. The parent must be `relative`, with the composer as the roof under it
 */
export function RoofCat({ id, on: here, text, phone = false }: { id: string; on: boolean; text: string; phone?: boolean }) {
  // It sits on the field in every chat, empty or not, until its switch hides it (Almaz, 25 Nov: it used to leave
  // with the first message). `here` is false only where the field has something else over it
  const shown = catShown(useSettings())
  const on = shown && here
  // Whether the switch was off a moment ago: then it hops back up from behind the field, not just "is there"
  const wasOff = useRef(!shown)
  const stage = useRef<HTMLDivElement>(null)
  const cat = useRef<ReturnType<typeof start> | null>(null)
  const wanted = useRef(on)
  wanted.current = on
  useEffect(() => {
    const el = stage.current
    const want = asked()
    if (!on || !el || want === "off") return
    let seen = false
    try {
      seen = localStorage.getItem(DAY) === new Date().toDateString()
    } catch {
      // Storage blocked: treat every chat as the day's first
    }
    // On a phone the chat is mounted beside the code, out of view: it climbs up when you get there, not before
    let c: ReturnType<typeof start> | null = null
    const seeing = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting || c) return
      seeing.disconnect()
      const mode = entered.has(id) ? (wasOff.current ? "short" : "there") : want === "full" ? "full" : want === "short" || seen ? "short" : "full"
      wasOff.current = false
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
      // Switched off: it shows its back and jumps behind the field
      window.setTimeout(c.stop, 1400)
      c.duck()
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
