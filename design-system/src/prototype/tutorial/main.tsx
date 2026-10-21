import { StrictMode } from "react"
import { createRoot } from "react-dom/client"

import "@/index.css"
import "./prototype.css"

import { App } from "./App"
import { DesktopApp } from "./desktop/DesktopApp"
import { DeviceFrame } from "./DeviceFrame"
import { resetStorage, Store } from "./store"
import { view } from "./view"
import { ViewSwitch } from "./ViewSwitch"

const embedded = window.self !== window.top || new URLSearchParams(location.search).has("embed")
const wide = window.matchMedia("(min-width: 600px)").matches

// Inside the desktop frame the page has no safe area of its own, see prototype.css
if (window.self !== window.top) document.documentElement.classList.add("framed")

const resetDesktop = () => {
  resetStorage()
  location.reload()
}

// A real phone always gets the phone. A wide screen gets the phone in its frame, or the desktop
// screen when the address asks for it
createRoot(document.getElementById("root")!).render(
  <StrictMode>
    {wide && !embedded ? (
      view === "desktop" ? (
        <>
          <Store>
            <DesktopApp />
          </Store>
          <ViewSwitch floating onReset={resetDesktop} />
        </>
      ) : (
        <DeviceFrame />
      )
    ) : (
      <Store>
        <App />
      </Store>
    )}
  </StrictMode>
)
