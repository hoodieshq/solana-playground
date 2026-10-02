import { defineConfig } from "vitest/config";
import type { Plugin } from "vite";

// Webpack loads `.md` as raw text (`asset/source` in `craco.config.js`), and
// the lesson loaders `require` it that way. Same here: a string export.
const markdownAsText: Plugin = {
  name: "markdown-as-text",
  transform(src, id) {
    if (!id.endsWith(".md")) return null;
    return { code: `export default ${JSON.stringify(src)};`, map: null };
  },
};

export default defineConfig({
  plugins: [markdownAsText],
  resolve: {
    alias: [
      // monaco-editor declares only `module`, no `main`. Webpack takes
      // `module`; vite's server-side resolution does not, so point it there.
      {
        find: /^monaco-editor$/,
        replacement: "monaco-editor/esm/vs/editor/editor.main.js",
      },
    ],
  },
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: ["src/setupTests.ts"],
    // CRA's `testMatch`, so the same files are collected: not `e2e/`
    // (Playwright), not `*.test.mjs` (`node --test`).
    include: [
      "src/**/__tests__/**/*.{js,jsx,ts,tsx}",
      "src/**/*.{spec,test}.{js,jsx,ts,tsx}",
    ],
    css: false,
    // CRA 5's Jest config sets `resetMocks: true`; this is vitest's name
    // for it.
    mockReset: true,
  },
});
