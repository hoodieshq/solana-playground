import path from "node:path"
import tailwindcss from "@tailwindcss/vite"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"

// Builds only the tutorial prototype v2, for its own stand (prototype/vercel-v2)
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    outDir: "dist-prototype-v2",
    rollupOptions: {
      input: path.resolve(__dirname, "prototype/tutorial-v2/index.html"),
    },
  },
})
