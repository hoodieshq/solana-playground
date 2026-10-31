import { createCn } from "cn/config"

/* cn, told about the theme's own names. Out of the box it reads text-caption
   as a colour, so a text colour in the same call drops the size; it reads
   font-label as a family and shadow-panel as a shadow colour the same way.
   Keep these lists in step with the @theme blocks in styles/theme.css. */
const cn = createCn({
  extend: {
    theme: {
      text: ["display", "title", "body", "control", "caption", "code"],
      "font-weight": ["read", "label", "headline", "act"],
      shadow: ["panel", "modal", "glow", "thumb", "sheet", "composer"],
      radius: ["control", "panel", "card"],
      spacing: [
        "gap",
        "head",
        "subhead",
        "bar",
        "rail",
        "inset",
        "phone-bar",
        "phone-head",
        "phone-row",
        "target",
        "safe-bottom",
      ],
      ease: ["out", "move", "pop", "standard", "menu"],
      animate: [
        "rise",
        "pop",
        "pulse-dot",
        "caret",
        "menu-in",
        "squiggle",
        "arrive",
        "print",
        "draw",
        "sweep",
        "shake",
        "anchor-flash",
        "key-flash",
        "key-leave",
      ],
    },
  },
})

export { cn }
