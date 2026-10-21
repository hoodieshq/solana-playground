# Деплой прототипа туториала

Отдельный проект `playground-tutorial-prototype` в команде Hoodies на Vercel, к основному Playground не относится.

```bash
git commit ...                     # в /source/ попадает только закоммиченное
sh prototype/vercel/build.sh
cd prototype/vercel && vercel deploy --prod --scope hoodies
```

`build.sh` собирает прототип в `public/`. В `public/source/` кладёт zip папки `design-system` и git bundle ветки поверх `saving-chats-history`, чтобы код можно было забрать, пока ветки нет на GitHub.

Стенд закрыт basic auth в `middleware.js`. Логин, пароль и `X-Robots-Tag` лежат в env проекта (`BASIC_AUTH_USER`, `BASIC_AUTH_PASSWORD`, `ROBOTS_TAG`). Без логина или пароля стенд отвечает 401 всем.

После деплоя проверь анонимным запросом корень, глубокий путь, ассет, `/source/` и 404: везде должен быть 401 с `X-Robots-Tag`.
