# Deploying the tutorial prototype

A separate project, `playground-tutorial-prototype`, in the Hoodies team on Vercel. It has nothing to do with the main Playground. The prototype code lives on the `almaz/tutorial-prototype` branch in `hoodieshq/solana-playground` and is never merged into the main code.

```bash
sh prototype/vercel/build.sh
cd prototype/vercel && vercel deploy --prod --scope hoodies
```

The site is behind basic auth in `middleware.js`. The username, password and `X-Robots-Tag` are in the project env (`BASIC_AUTH_USER`, `BASIC_AUTH_PASSWORD`, `ROBOTS_TAG`). If the username or password is missing, the site answers 401 to everyone.

After a deploy, send anonymous requests to the root, a deep path, an asset and a 404: every one must return 401 with `X-Robots-Tag`.
