# Deploying the tutorial prototype v2

A separate Vercel project, `playground-tutorial-prototype-v2`, in the Hoodies team. It serves only v2 (the chat driven flow after the 10/23 client call); v1 stays on `playground-tutorial-prototype` as the client saw it. The code lives on the `almaz/tutorial-prototype` branch in `hoodieshq/solana-playground` and is never merged into the main code.

```bash
sh prototype/vercel-v2/build.sh
cd prototype/vercel-v2 && vercel deploy --prod --scope hoodies
```

The site is behind basic auth in `middleware.js`, with the same login and password as the v1 stand. The username, password and `X-Robots-Tag` are in the project env (`BASIC_AUTH_USER`, `BASIC_AUTH_PASSWORD`, `ROBOTS_TAG`). If the username or password is missing, the site answers 401 to everyone. The root sends a signed in visitor to `/prototype/tutorial-v2/`.

After a deploy, send anonymous requests to the root, a deep path, an asset and a 404: every one must return 401 with `X-Robots-Tag`.
