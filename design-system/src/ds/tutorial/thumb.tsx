import { Thumb } from "@/components/ui/thumb"

import { Block } from "../parts"

const svg = (body: string, w: number, h: number) =>
  `data:image/svg+xml,${encodeURIComponent(`<svg xmlns='http://www.w3.org/2000/svg' width='${w}' height='${h}' viewBox='0 0 ${w} ${h}'>${body}</svg>`)}`

/* Two stand ins for upstream's covers: square art, and a 4:3 card with its title near the edges */
const SQUARE = svg(
  "<rect width='512' height='512' fill='#1b1530'/><circle cx='256' cy='256' r='150' fill='#9945ff'/><circle cx='256' cy='256' r='80' fill='#14f195'/>",
  512,
  512
)
const CARD = svg(
  "<rect width='640' height='480' fill='#f4efe6'/><rect x='40' y='150' width='560' height='180' rx='24' fill='#7a56da'/><text x='320' y='265' font-family='sans-serif' font-size='64' font-weight='700' fill='#fff' text-anchor='middle'>Hello Seahorse</text>",
  640,
  480
)
const DARK_CARD = svg(
  "<rect width='640' height='480' fill='#0e2a3a'/><text x='320' y='260' font-family='sans-serif' font-size='72' font-weight='700' fill='#2dcea9' text-anchor='middle'>Token Vault</text>",
  640,
  480
)

function ThumbBlock() {
  return (
    <Block
      id="thumb"
      title="Thumb"
      source="playground"
      registry="thumb"
      note="One frame for covers that do not agree on a shape. Square art fills the rounded square. A cover that is not square fits whole with room round it, on the colour of its own edges, read off a tiny canvas, so the square is still full and the title is neither cut nor pressed to the edge. A hairline is drawn over the picture, so a white cover still has an edge on a dark card. A cover from another origin needs crossOrigin for its edge colour; without it the frame keeps its own ground."
    >
      <Thumb src={SQUARE} className="size-16" />
      <Thumb src={CARD} className="size-16" />
      <Thumb src={DARK_CARD} className="size-16" />
      <Thumb src={CARD} className="size-24 rounded-xl" />
    </Block>
  )
}

export { ThumbBlock }
