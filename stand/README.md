# Стенд туториала в продукте

Отдельный проект `playground-tutorial-product` в команде Hoodies на Vercel. Продукт client-v2 из ветки Никиты с туториалом Hello Anchor, сверху ленточка Studio (Viewport, Components, Annotate, Narrate), как на solana-playground-ds. Код живёт в ветке `almaz/tutorial-in-product` в `hoodieshq/solana-playground` и в основной код не вливается.

```bash
sh stand/build.sh
cd stand && vercel deploy --prod --scope hoodies
```

Сборка идёт на WASM заглушках (`yarn build-fast`), Rust toolchain не нужен. Сервер сборки пускает только знакомые ему origin, поэтому стенд ходит к нему через себя: `vercel.json` проксирует `/build-server/` на сервер Solana Foundation. Файлы Studio скопированы с задеплоенного solana-playground-ds в `design-system/studio/tools`, `studio-config.mjs` перенаправляет их на страницы стенда.

Стенд закрыт basic auth в `middleware.js`. Логин, пароль и `X-Robots-Tag` лежат в env проекта (`BASIC_AUTH_USER`, `BASIC_AUTH_PASSWORD`, `ROBOTS_TAG`). Без логина или пароля стенд отвечает 401 всем.

После деплоя проверь анонимным запросом корень, глубокий путь, ассет и 404: везде должен быть 401 с `X-Robots-Tag`.
