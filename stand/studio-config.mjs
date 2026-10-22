// The Studio config is the one solana-playground-ds ships, copied into design-system/studio/tools.
// It knows that site's pages, so its home, views and the design system's page are pointed at
// what this stand has: the product and its tutorial here, the design system on the site
import { readFileSync, writeFileSync } from "node:fs"

const file = process.argv[2]
const DS = "https://solana-playground-ds.vercel.app"
let config = readFileSync(file, "utf8")

const views = `home: '/#app',
  homeLabel: 'Playground',

  views: [
    { group: 'App', items: [
      { label: 'Playground', href: '/#app', note: 'The product, with the Hello Anchor tutorial in it', kind: 'app' },
      { label: 'Hello Anchor', href: '/tutorials/hello-anchor', note: 'The tutorial flow under review', kind: 'app' },
      { label: 'Proposal deck', href: '/', note: 'Nikita\'s redesign, told in slides', kind: 'app' },
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
writeFileSync(file, config)
