# Деплой прототипа туториала

Отдельный проект `playground-tutorial-prototype` в команде Hoodies на Vercel, к основному Playground не относится.

```bash
npm run build:prototype
rm -rf prototype/vercel/public && cp -R dist-prototype prototype/vercel/public
cd prototype/vercel && vercel deploy --prod --scope hoodies
```

Стенд закрыт basic auth в `middleware.js`. Логин, пароль и `X-Robots-Tag` лежат в env проекта (`BASIC_AUTH_USER`, `BASIC_AUTH_PASSWORD`, `ROBOTS_TAG`). Без логина или пароля стенд отвечает 401 всем.

После деплоя проверь анонимным запросом корень, глубокий путь, ассет и 404: везде должен быть 401 с `X-Robots-Tag`.
