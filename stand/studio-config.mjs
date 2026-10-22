// The Studio config is the one solana-playground-ds ships, copied into design-system/studio/tools.
// It knows that site's pages, so its home, views and the design system's page are pointed at
// what this stand has: the product and its tutorial here, the design system on the site
import { readFileSync, writeFileSync } from "node:fs"

const file = process.argv[2]
const DS = "https://solana-playground-ds.vercel.app"
let config = readFileSync(file, "utf8")

// Every page here is the product. Left to guess, the ribbon takes a page it
// does not list (a tutorial's step, say) for a landing and offers the Builder
const views = `kind: 'app',
  home: '/#app',
  homeLabel: 'Playground',

  views: [
    { group: 'App', items: [
      { label: 'Playground', href: '/#app', note: 'The product, with the Hello Anchor tutorial in it', kind: 'app' },
      { label: 'Hello Anchor', href: '/tutorials/hello-anchor', note: 'The tutorial flow under review', kind: 'app' },
      { label: 'Proposal deck', href: '/', note: 'The redesign by Nikita, told in slides', kind: 'app' },
      { label: 'Design system', href: '${DS}/design-system/', note: 'On solana-playground-ds', kind: 'app' }
    ]},
    { group: 'Archive', items: [] }
  ],

  `
const start = config.indexOf("home:")
const end = config.indexOf("/* First the system's own parts")
if (start === -1 || end === -1) throw new Error("studio.config.js has changed shape, update studio-config.mjs")
config = config.slice(0, start) + views + config.slice(end)

config = config.replace("systemPage: '/design-system/'", `systemPage: '${DS}/design-system/'`)
config = config.replace("systemCss: '/design-system/ds-inject.css'", `systemCss: '${DS}/design-system/ds-inject.css'`)
// The product fills the window, so the ribbon, which floats over a product,
// would cover its head. It docks instead: the product reads this offset and
// gives up the ribbon's 34px while the ribbon shows. Not inside the viewport
// frame, where the ribbon is not drawn
config += `
if (window.top && window.self === window.top && document.head) {
  var studioOffset = document.createElement('style');
  studioOffset.textContent = 'html:not(.studio-rib-off){--studio-offset:34px}';
  document.head.appendChild(studioOffset);
}
`
writeFileSync(file, config)
