/**
 * The layer rule from `CLAUDE.md` ("Layers") as ESLint errors. `package.json`
 * `eslintConfig` extends this file, so `yarn lint` and the dev server read it,
 * and so does `yarn lint:layers`, the first step of the production build,
 * which drops CRA's own lint (`BUILD_ONLY_CHECKS` in `craco.config.js`). It is
 * a module rather than part of `package.json` so the exception below can
 * carry its comment.
 *
 * Only the five layers are checked. The legacy roots (`components/`,
 * `views/`, `utils/` and the rest) sit outside `boundaries/include`: a layer
 * may import them, and what they import is not checked.
 */

const SLICE_LAYERS = ["widgets", "features", "entities"];

/** What each layer may import besides itself: the layers below it */
const BELOW = {
  app: ["widgets", "features", "entities", "shared"],
  widgets: ["features", "entities", "shared"],
  features: ["entities", "shared"],
  entities: ["shared"],
  shared: [],
};

/** A slice's doors: `index.ts(x)` for the browser, `server.mjs` for `api/` */
const ENTRY_POINT = "{index.ts,index.tsx,server.mjs}";

const LAYER_MESSAGE =
  "{{from.element.type}} may import only the layers below it (app -> widgets -> features -> entities -> shared), and no other slice of its own layer: {{to.element.type}}/{{to.element.captured.slice}} is not allowed here. See client-v2/CLAUDE.md, Layers";

const ENTRY_MESSAGE =
  "Import {{to.element.type}}/{{to.element.captured.slice}} through its public entry (index.ts, or server.mjs from api/), not {{to.element.fileInternalPath}}. See client-v2/CLAUDE.md, Layers";

const slice = (type, name) => ({
  element: { type, captured: { slice: name } },
});

module.exports = {
  plugins: ["boundaries"],
  settings: {
    // Relative paths and `@/` (tsconfig `paths`) both resolve to files, which
    // is what places an import in a layer; one that resolves to nothing is
    // not checked
    "import/resolver": {
      typescript: { project: "./tsconfig.json" },
      node: { extensions: [".js", ".jsx", ".ts", ".tsx", ".mjs", ".mts"] },
    },
    "boundaries/include": ["src/{app,widgets,features,entities,shared}/**"],
    "boundaries/elements": [
      { type: "app", pattern: "src/app" },
      ...SLICE_LAYERS.map((type) => ({
        type,
        pattern: `src/${type}/*`,
        capture: ["slice"],
      })),
      { type: "shared", pattern: "src/shared" },
    ],
  },
  rules: {
    // Imports inside one element (the app, a slice, shared) are not checked.
    // Two slices of one layer are two elements, so a widget importing a
    // widget, or a feature a feature, matches no policy and is disallowed.
    // The last matching policy wins, so the entry-point one comes last.
    "boundaries/dependencies": [
      "error",
      {
        default: "disallow",
        message: LAYER_MESSAGE,
        policies: [
          ...Object.entries(BELOW)
            .filter(([, below]) => below.length > 0)
            .map(([type, below]) => ({
              from: { element: { type } },
              allow: { to: { element: { type: below } } },
            })),
          // The one recorded exception: `auth`'s server module uses
          // `persistence`'s pool, and `persistence` reads the session.
          // `ui-migration` task 1.4 breaks the cycle and deletes this policy.
          {
            from: slice("features", "{auth,persistence}"),
            allow: { to: slice("features", "{auth,persistence}") },
          },
          {
            to: { element: { type: SLICE_LAYERS } },
            disallow: {
              to: { element: { fileInternalPath: `!${ENTRY_POINT}` } },
            },
            message: ENTRY_MESSAGE,
          },
        ],
      },
    ],
  },
};
