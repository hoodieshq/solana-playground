import { StrictMode } from "react"
import { createRoot } from "react-dom/client"

import "@/index.css"

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <div className="flex h-dvh items-center justify-center bg-surface-base text-title text-foreground">
      Prototype is wired
    </div>
  </StrictMode>
)
