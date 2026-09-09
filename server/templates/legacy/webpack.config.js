import { base, require, webpack } from "./webpack.base.config.js";

export default {
  ...base,
  plugins: [
    ...base.plugins,

    // Resolve Node polyfills
    new webpack.ProvidePlugin({ Buffer: ["buffer", "Buffer"] }),
    new webpack.ProvidePlugin({ process: "process/browser" }),
  ],
  resolve: {
    fallback: {
      // Fix `Module not found: Error: Can't resolve 'perf_hooks'` from typescript
      perf_hooks: false,

      // `mocha`
      stream: require.resolve("stream-browserify"),

      // `@metaplex-foundation/js` polyfills
      crypto: require.resolve("crypto-browserify"),
      fs: false,
      process: false,
      path: false,
      zlib: false,
    },
  },
};
