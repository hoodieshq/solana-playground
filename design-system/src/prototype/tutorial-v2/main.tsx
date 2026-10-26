import { StrictMode } from "react"
import { createRoot } from "react-dom/client"

import "@/index.css"
import "./prototype.css"

import { App } from "./App"
import { DesktopApp } from "./desktop/DesktopApp"
import { DeviceFrame } from "./DeviceFrame"
import { installScrollIndicator } from "./scrollIndicator"
import { resetStorage, Store } from "./store"
import { DECK, view } from "./view"
import { PrototypeBar } from "./PrototypeBar"

const embedded = window.self !== window.top || new URLSearchParams(location.search).has("embed")
const wide = window.matchMedia("(min-width: 600px)").matches

// iOS zooms the page in on any field set under 16px. Capping the scale stops that, and iOS still
// lets you pinch to zoom, so fields here can take the composer's 15px. Android would lose pinch
// zoom with the same cap, so it's only set on iOS
if (/iPhone|iPad|iPod/.test(navigator.userAgent)) {
  const meta = document.querySelector('meta[name="viewport"]')
  meta?.setAttribute("content", `${meta.getAttribute("content")}, maximum-scale=1`)
}

// Inside the desktop frame the page has no safe area of its own and no phone scroll indicator,
// see prototype.css and scrollIndicator.ts
if (window.self !== window.top && DECK === null) {
  document.documentElement.classList.add("framed")
  installScrollIndicator()
}

// The desktop screen hides the browser's scrollbars too, and shows the overlay pill macOS draws
const desktop = wide && !embedded && view === "desktop"
if (desktop) {
  document.documentElement.classList.add("desktop")
  installScrollIndicator("desktop")
}

const resetDesktop = () => {
  resetStorage()
  location.reload()
}

// A real phone always gets the phone. A wide screen gets the phone or the tablet in a frame, or the
// desktop screen when the address asks for it. Inside the tablet's frame the page draws the desktop
// screens, filling the frame
const inTablet = embedded && view === "tablet"

// The phone app: its type floor and its taller head hang off this class (prototype.css), so the
// desktop screens never see them
if (DECK === null && !inTablet && !(wide && !embedded)) document.documentElement.classList.add("phone")

// A slide of the deck: the desktop screens alone, filling the slide's frame
if (DECK !== null) {
  document.documentElement.classList.add("desktop")
  installScrollIndicator("desktop")
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    {DECK !== null ? (
      <div className="h-dvh">
        <Store>
          <DesktopApp />
        </Store>
      </div>
    ) : inTablet ? (
      <div className="h-dvh">
        <Store>
          <DesktopApp />
        </Store>
      </div>
    ) : wide && !embedded ? (
      desktop ? (
        <div className="flex h-dvh flex-col">
          <PrototypeBar onReset={resetDesktop} />
          <div className="min-h-0 flex-1">
            <Store>
              <DesktopApp />
            </Store>
          </div>
        </div>
      ) : (
        <DeviceFrame device={view === "tablet" ? "tablet" : "phone"} />
      )
    ) : (
      <Store>
        <App />
      </Store>
    )}
  </StrictMode>
)
