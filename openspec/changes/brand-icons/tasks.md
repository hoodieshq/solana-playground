# Tasks

## 1. Brand icons in the static markup (HOO-2568)

- [x] 1.1 `brand-head.mjs` rewrites the generated `index.html` head, with `node --test` cases; `update-static.mjs` calls it after the overlay ([plan](plans/1-brand-icons.md))
- [x] 1.2 Renders and `manifest.json` under `client-v2/static/` (depends on nothing)
- [x] 1.3 Remove `applyFavicon`, `src/app/favicon.svg` and the colour check's exemption (depends on 1.1, 1.2)
- [ ] 1.4 Fill `name` / `short_name` with the values Kat approved (depends on 1.2; values pending)
