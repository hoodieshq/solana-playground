# Deploying the design system preview

A separate Vercel project, `playground-design-system-preview`, in the Hoodies team. It serves only the design system's page, with the section of components moved in from the tutorial prototype, for review before it goes to the live site. The live site, https://solana-playground-ds.vercel.app, is deployed by `scripts/site.sh`, which also carries the proposal's product and Studio; this stand does not, so deploying it touches nothing there.

```bash
sh prototype/vercel-ds/build.sh
cd prototype/vercel-ds && vercel deploy --prod --scope hoodies
```

The site is behind basic auth in `middleware.js`, with the same login and password as the tutorial prototype stands. The username, password and `X-Robots-Tag` are in the project env (`BASIC_AUTH_USER`, `BASIC_AUTH_PASSWORD`, `ROBOTS_TAG`). If the username or password is missing, the site answers 401 to everyone. The root sends a signed in visitor to `/design-system/`.

After a deploy, send anonymous requests to the root, a deep path, an asset and a 404: every one must return 401 with `X-Robots-Tag`.
