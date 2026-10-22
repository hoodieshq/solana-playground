# Tutorial-in-product stand

A separate `playground-tutorial-product` project in the Hoodies team on Vercel. The client-v2 product from Nikita's branch with the Hello Anchor tutorial, with the Studio ribbon on top (Viewport, Components, Annotate, Narrate), same as on solana-playground-ds. The code lives in the `almaz/tutorial-in-product` branch in `hoodieshq/solana-playground` and doesn't get merged into the main code.

```bash
sh stand/build.sh
cd stand && vercel deploy --prod --scope hoodies
```

The build runs on WASM stubs (`yarn build-fast`), no Rust toolchain needed. The build server only accepts origins it knows, so the stand talks to it through itself: `vercel.json` proxies `/build-server/` to the Solana Foundation server. The Studio files are copied from the deployed solana-playground-ds into `design-system/studio/tools`, and `studio-config.mjs` points them at the stand's pages.

The stand is behind basic auth in `middleware.js`. The login, password and `X-Robots-Tag` are in the project env (`BASIC_AUTH_USER`, `BASIC_AUTH_PASSWORD`, `ROBOTS_TAG`). Without the login or password the stand answers 401 to everyone.

After a deploy, check the root, a deep path, an asset and a 404 with an anonymous request: every one should return 401 with `X-Robots-Tag`.
