# Deploying the files toggle prototype (DES-205)

A separate Vercel project, `playground-files-toggle`, in the Hoodies team. It shows one thing: on an ordinary Playground screen the file tree leaves the layout, and the editor head's Files icon opens and closes it. The page is `../files-toggle/index.html`, with a Before and After switch at the top.

```bash
sh prototype/vercel-files-toggle/build.sh
cd prototype/vercel-files-toggle && vercel deploy --prod --scope hoodies
```

The site is behind basic auth in `middleware.js`, with the same login and password as the tutorial prototype stands. The username, password and `X-Robots-Tag` are in the project env (`BASIC_AUTH_USER`, `BASIC_AUTH_PASSWORD`, `ROBOTS_TAG`). If the username or password is missing, the site answers 401 to everyone.

After a deploy, send anonymous requests to the root, a deep path and a 404: every one must return 401 with `X-Robots-Tag`.
