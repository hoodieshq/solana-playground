import path from "path";
import { execSync } from "child_process";
import { createRequire } from "module";

import PgImportChunkPlugin from "./plugins/pg-import-chunk.js";

export const require = createRequire(import.meta.url);
export const webpack = require(path.join(
  execSync("yarn global dir", { encoding: "utf-8" }).trim(),
  "node_modules",
  "webpack"
));

export const base = {
  mode: "production",
  target: ["web", "es2020"],
  entry: {
    /* <DYNAMIC_ENTRIES> */
  },
  output: {
    path: path.resolve("dist"), // already the default but keep for safety
    filename: "[name]/bundle.js", // split each package to a its own dir
    library: { type: "module" }, // required ESM
    chunkLoading: "import", // required for `PgImportChunkPlugin`
  },
  experiments: {
    outputModule: true,
  },
  plugins: [new PgImportChunkPlugin()],
};
