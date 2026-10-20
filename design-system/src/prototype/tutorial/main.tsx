import { StrictMode } from "react"
import { createRoot } from "react-dom/client"

import "@/index.css"
import "./prototype.css"

import { App } from "./App"
import { DeviceFrame } from "./DeviceFrame"
import { Store } from "./store"

const embedded = window.self !== window.top || new URLSearchParams(location.search).has("embed")
const wide = window.matchMedia("(min-width: 600px)").matches

// Inside the desktop frame the page has no safe area of its own, see prototype.css
if (window.self !== window.top) document.documentElement.classList.add("framed")

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    {wide && !embedded ? (
      <DeviceFrame />
    ) : (
      <Store>
        <App />
      </Store>
    )}
  </StrictMode>
)
