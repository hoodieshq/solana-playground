"use strict";

// CRA's default Jest file transform turns every non-JS/CSS/JSON import
// into just its basename -- fine for images, wrong for `.md`. Webpack
// (see `craco.config.js`'s `asset/source` rule) already treats `.md` as
// raw text, which is what `HelloAnchor.tsx` and the lesson paths'
// `readPage` loaders rely on `require`-ing. Jest has no such rule, so a
// step's `readPage()` test would otherwise see "1.md" instead of the
// tutorial's prose.
//
// This overrides CRA's catch-all file transform (same regex key in
// `package.json`'s `jest.transform`) to special-case `.md` and delegate
// everything else -- svg, images, fonts -- to the original transform
// unchanged.

const upstream = require("react-scripts/config/jest/fileTransform");

module.exports = {
  process(src, filename, ...rest) {
    if (/\.md$/.test(filename)) {
      return `module.exports = ${JSON.stringify(src)};`;
    }
    return upstream.process(src, filename, ...rest);
  },
};
