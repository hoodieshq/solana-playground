# Deploying Oak for sharing

A separate Vercel project, `playground-oak-prototype`, in the Hoodies team, so Almaz can send a link to
people outside the client stand. It serves the same build as `prototype/vercel-v2` (the tutorial v2
prototype, codename Oak) under its own login.

```bash
sh prototype/vercel-oak/build.sh
cd prototype/vercel-oak && vercel deploy --prod --scope hoodies
```

The site is behind basic auth in `middleware.js`. The username, password and `X-Robots-Tag` are in the
project env (`BASIC_AUTH_USER`, `BASIC_AUTH_PASSWORD`, `ROBOTS_TAG`). If the username or password is
missing, the site answers 401 to everyone. The root sends a signed in visitor to `/prototype/tutorial-v2/?view=desktop`.

After a deploy, send anonymous requests to the root, a deep path, an asset and a 404: every one must
return 401 with `X-Robots-Tag`.
