import { StrictMode } from "react"
import { createRoot } from "react-dom/client"

import "@/index.css"

import { App } from "./App"
import { DeviceFrame } from "./DeviceFrame"
import { Store } from "./store"

const embedded = window.self !== window.top || new URLSearchParams(location.search).has("embed")
const wide = window.matchMedia("(min-width: 600px)").matches

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
