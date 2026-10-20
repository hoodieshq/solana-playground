import path from "node:path"
import tailwindcss from "@tailwindcss/vite"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"

// Builds only the tutorial prototype, so the design system page and its
// snapshot step stay untouched
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    outDir: "dist-prototype",
    rollupOptions: {
      input: path.resolve(__dirname, "prototype/tutorial/index.html"),
    },
  },
})
