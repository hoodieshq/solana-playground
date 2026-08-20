# Какие модели используют похожие системы — независимый обзор

> Internal research snapshot, 2026-08-20. Describes two providers; the
> shipped client-v2 has four (Demo, Anthropic, OpenAI-compatible,
> Gemini/OpenRouter presets).

Дата сбора: 2026-08-20. Четыре независимых прохода по открытым источникам:
(1) какие модели стоят в продакшене у похожих продуктов, (2) каталог моделей
и цен всех вендоров по их официальным страницам, (3) бенчмарки, включая
Rust, (4) open-weights и то, как открытые проекты платят за AI анонимам.

Правила этого документа: каждая строка — со ссылкой и датой; «UNV» — не
подтверждено на первоисточнике; цифры вендоров помечены как вендорские.
**Разделы 1–5 — факты. Раздел 6 — интерпретация, и она так и подписана.**

Оговорка: часть моделей 2026 года (Opus 5, Fable 5, GPT-5.6, Kimi K3,
DeepSeek V4, Qwen 3.7/3.8) новее обучающих данных исследователя; цифры по
ним взяты с цитируемых страниц как есть.

---

## 1. Что стоит в продакшене у похожих продуктов

### 1.1 Web3-IDE и блокчейн-инструменты — ближайшие аналоги

| Продукт | Тип | Модель по умолчанию | Выбор модели | Своя модель | BYOK | Как оплачивается | Источник |
| --- | --- | --- | --- | --- | --- | --- | --- |
| **Remix IDE** (Ethereum Foundation) | web3 IDE в браузере | **Mistral Medium** (по docs); список моделей приходит с сервера, **OpenRouter — дефолтный роутер** (коммит 2026-08-17) | Anthropic, OpenAI, Mistral, Moonshot/Kimi, OpenRouter, Bedrock, Ollama (локально) | «solcoder» — в текущем коде нет (UNV: снят без анонса) | **Да** + Ollama | Бесплатно 20 000 кредитов на старте; Starter $9.99 / Pro $19.99 | [docs](https://remix-ide.readthedocs.io/en/latest/ai.html), `libs/remix-ai-core/src/types/models.ts` |
| thirdweb AI (ex-Nebula) | web3-ассистент/API | «t1»/«t0_003», базовая модель не раскрыта | Нет | Заявляют свою | Нет | Не указано | [blog](https://blog.thirdweb.com), [portal](https://portal.thirdweb.com/ai/chat) |
| ChainIDE | web3 IDE | «Code Sage powered by OpenAI» (пост 2023) | Неизвестно | Неизвестно | Неизвестно | Неизвестно | Medium 2023 |
| Tenderly, Alchemy, Helius, QuickNode, Aptos, **Solana Foundation** | инфраструктура | **Модели нет — только MCP-серверы и skills** | Клиентская | Нет | — | Платит клиент | [mcp.solana.com](https://mcp.solana.com), [helius.dev/agents](https://helius.dev/agents), [tenderly](https://docs.tenderly.co/ai-tools/overview) |
| SendAI solana-agent-kit | Solana SDK | Нет (адаптеры Vercel AI / LangChain / OpenAI, MCP) | Любая | Нет | Да | Провайдер пользователя | [repo](https://github.com/sendaifun/solana-agent-kit) |
| **Solana Playground upstream** | web3 IDE | **AI-функций нет**; ноль issues/PR про AI | — | — | — | — | `git grep` по master |
| Blueshift | обучение Solana | «Blueshift Bot», MCP-сервер; модель не названа | — | — | — | — | — |

Вывод-факт: в web3 собственный инференс держат только Remix и thirdweb.
Remix — не self-hosted open-weights, а роутер по коммерческим API + BYOK +
Ollama для локального режима. Все Solana-инфраструктурные игроки, включая
Фонд, дают **знания** (MCP/skills), а модель оставляют клиенту.

### 1.2 Браузерные IDE и app-builders

| Продукт | Модель по умолчанию | Выбор | Своя модель | BYOK | Оплата | Источник |
| --- | --- | --- | --- | --- | --- | --- |
| Replit Agent 4 | Роутинг по режиму; Power = Claude Opus 4.7 | Только режимы | Нет | Нет | Подписка + кредиты | [changelog 2026-04-17](https://docs.replit.com/updates/2026/04/17/changelog) |
| Bolt.new (StackBlitz) | Скрытый роутинг (история — только Claude; Sonnet 4.6 в апр. 2026) | Только Standard/Max | Нет | Нет (форк bolt.diy — любая) | Free 300K токенов/день + подписка | [release notes](https://support.bolt.new/release-notes), [pricing](https://bolt.new/pricing) |
| Lovable | Claude Opus 4.6 «core model» (фев. 2026) | Нет | Нет | Нет | Free + кредиты | [blog](https://lovable.dev/blog/opus-4-6-now-in-lovable) |
| Vercel v0 | Композит v0-1.5 поверх Claude Sonnet 4 (2025; текущая база UNV) | Через AI Gateway | Композит (RAG + frontier + свой постпроцессор) | Нет | Free + кредиты | [blog](https://vercel.com/blog/v0-composite-model-family) |
| Codespaces + Copilot | GPT-5.3-Codex (LTS); «Auto» роутер | 34 модели | MAI-Code-1, Raptor mini | Да (Business/Ent) | Free + кредиты | [supported models](https://docs.github.com/en/copilot/reference/ai-models/supported-models) |
| Firebase Studio (Google) | Gemini; закрывается 2027-03 | Любой Gemini со своим ключом | Gemini | Только Gemini-ключ | Free / свой ключ | docs |
| Gitpod → Ona | Claude Opus 4.6; Sonnet 5 с июля 2026 | Семейство Claude | Нет | Bedrock/OpenAI/Anthropic/Vertex | Кредиты или BYOK | [changelog](https://ona.com/docs/changelog) |
| Figma Make | Не назван, «может меняться» | Gemini 3.6 Flash/3.1 Pro, Claude Sonnet 4.6/Opus, GPT-5.6 | Нет | Нет | AI-кредиты | [help](https://help.figma.com/hc/en-us/articles/36400680326551) |

### 1.3 Десктопные IDE, расширения, CLI-агенты

| Продукт | Модель по умолчанию | Выбор | Своя модель | BYOK | Источник |
| --- | --- | --- | --- | --- | --- |
| Cursor | Composer 2.5 Fast (своя) | 50+ (OpenAI, Anthropic, Google, Z.ai, Moonshot, xAI) | Composer 2.5 | Да (только чат) | [docs](https://cursor.com/docs/models/cursor-composer-2-5) |
| Windsurf / Devin (Cognition) | «Adaptive» роутер | 150+ | SWE-1.6/1.7 | Anthropic (UNV) | [blog](https://cognition.com/blog/devin-fusion) |
| GitHub Copilot | «Auto»; LTS GPT-5.3-Codex | GPT-5.x/5.6 Luna/Sol/Terra; Claude Fable 5, Opus 4.5–5, Sonnet 4.5–5, Haiku 4.5; Gemini 3.1 Pro, 3.5–3.7 Flash; MAI-Code; Kimi K2.7/K3; Grok 4.5/4.6 | MAI-Code-1 | Да | [docs](https://docs.github.com/en/copilot/reference/ai-models/supported-models) |
| JetBrains Junie / AI Assistant | «Default» (динамика цена/качество) | Sonnet 5, Opus 4.8, GPT-5.4, GPT-5.3-codex, Gemini 3.1 Pro, Gemini 3 Flash, Grok 4.3 | Mellum (автодополнение) | Да, включая Ollama | [docs](https://junie.jetbrains.com/docs/junie-cli-model-selection.html) |
| Zed | Не задан | Claude Fable 5/Opus 5/Sonnet 5; GPT-5.6; Gemini 3.x | Zeta (edit prediction) | Да | [docs](https://zed.dev/docs/ai/models) |
| Cline / Roo Code / Aider / OpenHands | Не задан | Любая (100+ провайдеров / LiteLLM) | Нет | Да | docs |
| Amazon Kiro | «Auto» | GPT-5.6 Sol/Terra/Luna; Claude Opus 5/4.8/4.7/4.6/4.5, Sonnet 5/4.6/4.5, Haiku 4.5; MiniMax, GLM-5, DeepSeek 3.2, Qwen3 Coder | Нет | Не указан | [docs](https://kiro.dev/docs/models/available-models) |
| Sourcegraph Amp | Medium = GPT-5.6 Sol (был Claude Opus 4.8) | Low GLM-5.2 / High Sol+Fable / Ultra Fable 5 | Нет | Fable 5 со своим ключом | [news](https://ampcode.com/news/who-cares-about-the-model) |
| Augment Code | По выбору организации; роутеры «Prism» | Claude Fable 5/Opus/Sonnet, Gemini 3.1 Pro, GLM 5.2, GPT-5.1–5.6, Kimi K3 | Роутеры | UNV | [docs](https://docs.augmentcode.com/models/available-models) |
| Claude Code | Дефолт аккаунта; Fable 5 по `/model fable` | Только Anthropic | — | API/Bedrock/Vertex/Foundry | [docs](https://code.claude.com/docs/en/model-config) |
| OpenAI Codex CLI | GPT-5.5 (UNV) | gpt-5.6-sol/terra/luna, gpt-5.3-codex-spark, gpt-5.5, gpt-5.4 | Только OpenAI | API/Bedrock | [docs](https://learn.chatgpt.com/docs/models) |
| Gemini CLI | Gemini Flash на бесплатном ключе | Только Gemini | — | API/Vertex | [quota](https://geminicli.com/docs/resources/quota-and-pricing) |

### 1.4 Что вендоры продуктов говорят о выборе модели (дословно)

- **Sourcegraph Amp**, сменив дефолт с Claude Opus 4.8 на GPT-5.6 Sol
  (2026-07-29): *«The differences between frontier models are now small.
  Small enough that for one engineer on one task, switching models won't
  visibly change the result»*; *«69% never set it to anything but medium»*.
  [ampcode.com](https://ampcode.com/news/who-cares-about-the-model)
- **Cognition / Devin Fusion** (2026-06-29): *«It's no longer sustainable to
  use the most expensive models on every task»*. [cognition.com](https://cognition.com/blog/devin-fusion)
- **Lovable** об Opus 4.6 (2026-02-05): *«21% better on our app building
  benchmark»*, *«runs twice as long on complex tasks»*. [lovable.dev](https://lovable.dev/blog/opus-4-6-now-in-lovable)
- **Vercel v0** (2025-06-01): *«proprietary models outperform open models on
  tasks relevant to v0»*. [vercel.com](https://vercel.com/blog/v0-composite-model-family)
- **Bolt**, спрятав выбор модели (май 2026): *«gives Bolt more flexibility to
  improve how agents perform as the technology behind them evolves»*.
- **GitHub Copilot BYOK** (2026-04-22): *«Usage is billed directly by your
  chosen provider and does not count against GitHub Copilot request quotas»*.

**Паттерн 2026 года (факт, не рекомендация):** почти все продукты
model-agnostic — роутер с дефолтом + выбор + BYOK. Собственные/дообученные
модели есть только у Cursor, Cognition, Microsoft, Vercel, JetBrains,
thirdweb — и у всех это либо автодополнение, либо «быстрый дешёвый» режим, а
не замена frontier-модели для сложных правок.

---

## 2. Каталог моделей и цен (официальные страницы вендоров)

USD за 1M токенов, стандартный тариф. «Cache» — цена чтения кэша. «Browser» —
задокументирован ли прямой вызов из браузера с ключом пользователя.

### 2.1 Проприетарные API

| Вендор | Model ID | Релиз | Контекст / вывод | Вход / Выход | Cache | Batch | Tools | Browser | Retention / ZDR | Источник |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Anthropic | `claude-fable-5` | 2026-06-09 | 1M / 128K | 10 / 50 | 1.00 | -50% | Да | Да (флаг) | 30 дней обязательно; **ZDR нет** | [pricing](https://platform.claude.com/docs/en/about-claude/pricing) |
| Anthropic | `claude-opus-5` | 2026-07-24 | 1M / 128K | 5 / 25 | 0.50 | -50% | Да | Да (флаг) | ZDR есть | там же |
| Anthropic | `claude-sonnet-5` | 2026-06-30 | 1M / 128K | **2 / 10** (цена запуска сделана постоянной 2026-08-10) | 0.20 | -50% | Да | Да (флаг) | ZDR | там же |
| Anthropic | `claude-opus-4-8` / `4-7` / `4-6` | 2026-05 / 04 / 02 | 1M / 128K | 5 / 25 | 0.50 | -50% | Да | Да (флаг) | ZDR | там же |
| Anthropic | `claude-sonnet-4-6` | 2026-02-17 | 1M / 128K | 3 / 15 | 0.30 | -50% | Да | Да (флаг) | ZDR | там же |
| Anthropic | `claude-haiku-4-5` | 2025-10-15 | 200K / 64K | 1 / 5 | 0.10 | -50% | Да | Да (флаг) | ZDR | там же |
| OpenAI | `gpt-5.6-sol` | 2026-07-09 | 1.05M / 128K | 5 / 30 | 0.50 | -50% | Да | Да (флаг) | 30 дней; ZDR по одобрению | [pricing](https://developers.openai.com/api/docs/pricing) |
| OpenAI | `gpt-5.6-terra` | 2026-07-09 | 1.05M / 128K | 2 / 12 | 0.20 | -50% | Да | Да (флаг) | то же | там же |
| OpenAI | `gpt-5.6-luna` | 2026-07-09 | 1.05M / 128K | 0.20 / 1.20 | 0.02 | -50% | Да | Да (флаг) | то же | там же |
| OpenAI | `gpt-5.5` | 2026-04-23 | 1.05M / 128K | 5 / 30 | 0.50 | -50% | Да | Да (флаг) | то же | там же |
| OpenAI | `gpt-5.4` / `-mini` / `-nano` | 2026-03 | 1.05M / 128K | 2.50/15 · 0.75/4.50 · 0.20/1.25 | 0.25 · 0.075 · 0.02 | -50% | Да | Да (флаг) | то же | там же |
| OpenAI | `gpt-5.3-codex` | 2026-02-24 | 400K / 128K | 1.75 / 14 | 0.175 | нет | Да | Да (флаг) | то же | там же |
| Google | `gemini-3.7-flash` | 2026-08-13 | 1M / 64K | **0.75 / 3.75 до 2026-12-31**, затем 1.50 / 7.50 | 0.075 | -50% | Да | Да (SDK) | платный — не для обучения; ZDR по одобрению | [pricing](https://ai.google.dev/gemini-api/docs/pricing) |
| Google | `gemini-3.5-flash` / `-lite` | 2026 | 1M / 64K | 1.50/9 · 0.30/2.50 | 0.15 · 0.03 | -50% | Да | Да (SDK) | то же | там же |
| Google | `gemini-3.1-pro-preview` | 2026-02 | 1M / 64K | 2 / 12 (4 / 18 >200K) | 0.20 | -50% | Да | Да (SDK) | то же; free tier нет | там же. **Gemini 3.5+ Pro не существует** |
| Google | `gemini-2.5-pro` / `-flash` | 2025 | 1M / 64K | 1.25/10 · 0.30/2.50 | 0.125 · 0.03 | -50% | Да | Да (SDK) | то же | там же |
| xAI | `grok-4.6` | 2026-08-12 | 500K | 2 / 6 | 0.50 | нет | Да | n/d | 30 дней; ZDR-переключатель | [models](https://docs.x.ai/docs/models) |
| xAI | `grok-4.3` | 2026 | 1M | 1.25 / 2.50 | 0.20 | нет | Да | n/d | то же | там же |
| xAI | `grok-build-0.1` (ex grok-code-fast-1) | 2026-05-29 beta | 256K | 1 / 2 | 0.20 | нет | Да | n/d | то же | [model](https://docs.x.ai/docs/models/grok-build-0.1) |
| DeepSeek | `deepseek-v4-pro` | 2026-08-13 | 1M / 384K | 1.32 / 3.96 (off-peak 0.66 / 1.98) | 0.044 | n/d | Да | n/d | данные в КНР, используются для обучения (opt-out); ZDR нет | [pricing](https://api-docs.deepseek.com/quick_start/pricing/) |
| DeepSeek | `deepseek-v4-flash` | 2026-07-31 | 1M / 384K | 0.44 / 1.32 (off-peak 0.22 / 0.66) | 0.014 | n/d | Да | n/d | то же | там же |
| Alibaba | `qwen3.7-plus` | 2026-06 UNV | 1M UNV | 0.40 / 1.60 | есть | n/d | Да | n/d | не для обучения; ZDR n/d | [pricing](https://www.alibabacloud.com/help/en/model-studio/model-pricing) |
| Alibaba | `qwen3-coder-plus` / `-flash` | n/d | до 1M (тарифы по тирам) | 1/5…6/60 · 0.30/1.50…1.60/9.60 | есть | n/d | Да | n/d | то же | там же |
| Moonshot | `kimi-k3` | 2026-07-16 UNV | 1M | 3 / 15 | 0.30 | n/d | Да | n/d | хранится, для обучения; ZDR нет | [pricing](https://platform.kimi.ai/docs/pricing/chat-k3) |
| Moonshot | `kimi-k2.7-code` | 2026-06 | 262K | 0.95 / 4 | 0.19 | n/d | Да | n/d | то же | там же |
| Z.ai | `glm-5.3` / `glm-5.2` / `glm-4.7` | 2026-08 UNV / 06 / — | 1M | 1.40/4.40 · 1.40/4.40 · 0.60/2.20 | 0.26 · 0.26 · 0.11 | n/d | Да | n/d | n/d | [pricing](https://docs.z.ai/guides/overview/pricing) |
| MiniMax | `MiniMax-M3` / `M2.7` | 2026-06 UNV / 04 | 1M | 0.30 / 1.20 | 0.06 | n/d | Да | n/d | n/d | [pricing](https://platform.minimax.io/docs/guides/pricing-paygo.md) |
| Mistral | `mistral-medium-2604` (3.5) | 2026-04-28 | 256K | 1.50 / 7.50 | до -90% | -50% | Да | n/d | платный: изоляция + ZDR бесплатно; free tier обучается по умолчанию | [pricing](https://mistral.ai/pricing) |
| Mistral | `mistral-large-2512` | 2025-12-02 | 256K | 0.50 / 1.50 | до -90% | -50% | Да | n/d | то же | там же |
| Mistral | `codestral-2508` | 2025-07-30 | 128K | 0.30 / 0.90 | до -90% | -50% | Да | n/d | то же | там же |
| Mistral | Devstral 2 | 2025-12-09 | 256K | — | — | — | — | — | **снят 2026-07-31**; замена — Medium 3.5 | там же |

### 2.2 Агрегаторы и хостинги open-weights

| Хост | Модель оплаты | Browser | DeepSeek V4 Pro | V4 Flash | Kimi K3 | GLM 5.2 | MiniMax M3 | gpt-oss-120B | Источник |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| **OpenRouter** | без наценки на токены; 5.5% на пополнение; BYOK бесплатно до $25K/мес | **Да** — CORS проверен вживую 2026-08-20 (`access-control-allow-origin: *`), задокументирован PKCE-флоу для ключа в браузере | 1.19 / 3.56 | — | 3 / 15 | 1.40 / 4.40 | 0.30 / 1.20 | — | [faq](https://openrouter.ai/docs/faq), [pkce](https://openrouter.ai/docs/use-cases/oauth-pkce) |
| Together | за токен | n/d | 1.32 / 3.96 | 0.14 / 0.28 | 3 / 15 | 1.40 / 4.40 | 0.30 / 1.20 | 0.15 / 0.60 | [pricing](https://www.together.ai/pricing) |
| Fireworks | за токен | n/d | 1.74 / 3.48 | 0.14 / 0.28 | 3 / 15 | 1.40 / 4.40 | 0.30 / 1.20 | 0.15 / 0.60 | [pricing](https://fireworks.ai/pricing) |
| Groq | за токен | n/d | — | — | K2 снят 2026-04 | — | M2.7 preview | 0.15 / 0.60 | [models](https://console.groq.com/docs/models) |
| Cerebras | за токен / dedicated | n/d | только dedicated | — | — | — | — | 0.35 / 0.75 | [pricing](https://www.cerebras.ai/pricing) |

### 2.3 Облака (один счёт для enterprise)

- **Claude**: Fable 5, Opus 5, Sonnet 5, Haiku 4.5 и legacy — на Bedrock,
  Vertex, Microsoft Foundry. Bedrock/Vertex — партнёрские цены (региональные
  эндпоинты +10%); Foundry и «Claude Platform on AWS» — по ценам первого лица.
- **OpenAI**: GPT-5…5.6 на Azure Foundry; GPT-5.6 на Bedrock с 2026-07-09.
- **Gemini**: только Vertex.
- **Open-weights**: Bedrock добавил DeepSeek, MiniMax, GLM, Kimi, Qwen3-Coder
  (фев. 2026); Foundry — DeepSeek V4, Kimi, Mistral, Llama 4; Vertex Model
  Garden — DeepSeek, GLM, Llama, Mistral, Qwen.

### 2.4 Бесплатные тиры и акции (для вопроса «кто платит за анонимов»)

- Anthropic: «небольшие» стартовые кредиты, сумма не указана.
- OpenAI: программа data-sharing — до 1M frontier / 10M mini токенов в день
  для согласившихся организаций.
- Google: бесплатный тир AI Studio на всех Flash/2.5 (не на 3.1 Pro);
  контент free tier «используется для улучшения продуктов».
- Qwen: 1M токенов на модель на 90 дней. Fireworks $1, Cerebras $5, Groq —
  rate-limited free. Mistral «Experiment» бесплатен, но обучается на данных.
- Акции с датой: Gemini 3.7/3.6 Flash — 0.75/3.75 до 2026-12-31; DeepSeek
  off-peak -50% с 2026-08-16; Sonnet 5 — $2/$10 сделано постоянным.

---

## 3. Бенчмарки

Ни один лидерборд не публикует Rust-срез для моделей 2026 года. Aider
Polyglot (содержит Rust) не обновлялся с 2025-11. Где цифра только от
вендора — помечено.

### 3.1 SWE-bench Verified (Python; близок к насыщению)

Источники: [vals.ai](https://www.vals.ai/benchmarks/swebench) (независимый, 2026-08-19), [benchlm.ai](https://benchlm.ai/benchmarks/sweVerified) (агрегатор вендорских).

| Модель | Балл | Кто | 
| --- | --- | --- |
| Claude Opus 5 | 97.0% / 96.0% | vals.ai / вендор |
| DeepSeek V4 Pro | 96.4% / 80.6% | vals.ai / вендор — **расхождение не объяснено** |
| Claude Fable 5 | 95.0% | вендор |
| Kimi K3 | 93.4% | vals.ai |
| Claude Opus 4.8 | 88.6% | вендор, подтверждено vals.ai |
| Grok 4.5 | 86.6% | vals.ai |
| Claude Sonnet 5 | 85.2% | вендор |
| GPT-5.3 Codex | 85.0% | вендор |
| Gemini 3.1 Pro | 80.6% | вендор |
| MiniMax M3 / Qwen3.7 Max / Kimi K2.6 | 80.5 / 80.4 / 80.2% | вендор |

GPT-5.5/5.6: OpenAI не публиковал SWE-bench Verified для 5.6.

### 3.2 SWE-bench Pro (сложнее; Scale AI, независимый harness)

[labs.scale.com/leaderboard/swe_bench_pro_public](https://labs.scale.com/leaderboard/swe_bench_pro_public)

| Модель | Балл (Scale) |
| --- | --- |
| Muse Spark 1.1 (Meta, закрытая) | 61.5 |
| GPT-5.4 (xHigh) | 59.1 |
| Claude Opus 4.6 (thinking) | 51.9 |
| Gemini 3.1 Pro (thinking) | 46.1 |
| Claude Opus 4.5 | 45.9 |
| Claude Sonnet 4.5 | 43.6 |
| GPT-5.2-codex | 41.0 |
| Claude Haiku 4.5 | 39.5 |
| Qwen3-Coder-480B | 38.7 |
| MiniMax 2.1 | 36.8 |

Вендорские (свой harness, Scale не подтверждал): Fable 5 80.3, Opus 5 79.2,
Opus 4.8 69.2, GPT-5.6 Sol 64.6, GPT-5.5 58.6, Gemini 3.1 Pro 54.2, Qwen3.8
Max 67.7, GLM-5.2 62.1, Qwen3.8-27B 61.7.

### 3.3 Terminal-Bench 2.1 (агентные задачи в терминале; официальный борд)

[tbench.ai](https://www.tbench.ai/leaderboard/terminal-bench/2.1)

| Агент / модель | Балл | Дата |
| --- | --- | --- |
| Claude Code / Fable 5 | 83.8% | 2026-06-07 |
| Codex / GPT-5.5 | 83.1% | 2026-05-01 |
| Cursor CLI / Grok 4.5 | 79.3% | 2026-07-09 |
| Claude Code / Opus 4.8 | 78.9% | 2026-07-09 |
| Codex / GPT-5.6 Terra | 78.4% | 2026-07-11 |
| Claude Code / Sonnet 5 | 74.6% | 2026-07-09 |
| Terminus 2 / Gemini 3 Pro | 73.9% | 2026-05-01 |
| Gemini CLI / Gemini 3.1 Pro | 65.8% | 2026-05-05 |

Artificial Analysis (один harness Terminus 2): GPT-5.6 Sol 89.5, Opus 5 89.1,
Grok 4.6 88.4, Kimi K3 88.3. Opus 5 и Fable 5 на официальном борде ещё нет.

### 3.4 Aider Polyglot (225 задач Exercism, включая Rust) — устарел

[aider.chat/docs/leaderboards](https://aider.chat/docs/leaderboards/), последнее обновление 2025-11-20:
GPT-5 (high) 88.0 · o3-pro 84.9 · Gemini 2.5 Pro 83.1 · Grok 4 79.6 ·
DeepSeek V3.2 74.2 · Claude Opus 4 72.0. Поязыкового среза нет.

### 3.5 Rust-специфичное и «починка ошибок компилятора»

- **SWE-bench Multilingual** (включает ripgrep, tokio, axum): Fable 5 ~87
  (UNV), Opus 4.8 84.4 (вендор), Qwen 3.7 Max 78.3, DeepSeek V4 Pro 76.2
  (model card). Rust-среза нет.
- **Multi-SWE-bench** (ByteDance, [arxiv 2504.02605](https://arxiv.org/abs/2504.02605)):
  в оригинальной статье Rust был самым трудным срезом для моделей 2025 года —
  Claude 3.5 Sonnet 30% easy / 10.7% medium / 0% hard. Текущий борд — 6
  моделей, лидер MiniMax M2.7 52.7% (июль 2026), без поязыкового среза.
- **CRUST-Bench** (C→Rust, [arxiv 2504.15254](https://arxiv.org/abs/2504.15254)):
  one-shot 13–22%, **с циклом «компилятор → правка» 32–48%** — цикл починки
  примерно удваивает успех. Это прямой аргумент за архитектуру «агент с
  доступом к сборке», а не «чат».
- **RustEvo²** ([arxiv 2503.16922](https://arxiv.org/abs/2503.16922)): 65.8%
  успеха на стабильных API против 38.0% на API, изменивших поведение; 56.1% на
  API до cutoff против 32.5% после; **RAG даёт +13.5 п.п.** Прямо про нашу
  ситуацию с anchor-lang 0.29.
- **RustAssistant** (Microsoft, ICSE 2025, [arxiv 2308.05177](https://arxiv.org/abs/2308.05177)):
  LLM в цикле с rustc — до ~74% починенных реальных ошибок компиляции на
  моделях эпохи GPT-4. На современных моделях не перепрогонялось.
- **Solana Bench** (Solana Foundation, авг. 2025, [solana.com/news/solana-bench](https://solana.com/news/solana-bench)):
  агенты пишут **TypeScript**-транзакции, не Rust-программы. Медианы: Claude
  Sonnet 4 — 115, GPT-5 — 60, Gemini 2.5 Flash — 40, gpt-oss-120B — 23.
  Результатов на моделях 2026 года нет.
- **Бенчмарка «LLM чинит Anchor-программу» не существует.** SolBench и
  подобные — про Solidity/EVM.

---

## 4. Open-weights: что можно самохостить

| Модель | Лицензия | Параметры (всего/активн.) | Tool calling | Железо для self-host | Хостинг $/1M | Бенчмарк | Источник |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Qwen3-Coder-480B-A35B | Apache-2.0 | 480B/35B | Да | ~8×H100 (оценка) | DeepInfra 0.30/1.00 | SWE-V 69.6 | [HF](https://huggingface.co/Qwen/Qwen3-Coder-480B-A35B-Instruct) |
| Qwen3.6-35B-A3B | Apache-2.0 | 35B/3B | Да | 1×24GB 4-bit | DeepInfra 0.32/3.20 | SWE-V 73.4 | [HF](https://huggingface.co/Qwen/Qwen3.6-35B-A3B) |
| Qwen3.8-27B | Apache-2.0 | 27B dense | парсер в примерах | 1×80GB / 24GB 4-bit | — | SWE-Pro 61.7 | [HF](https://huggingface.co/Qwen/Qwen3.8-27B) |
| DeepSeek-V4-Flash | MIT | 284B/13B | Да, параллельные | ~4×80GB FP4 | Together 0.14/0.28 | SWE-V 79 | [HF](https://huggingface.co/deepseek-ai/DeepSeek-V4-Flash) |
| DeepSeek-V4-Pro | MIT | 1.6T/49B | как Flash | 8–16×B200/H200 | Together 1.32/3.96 | SWE-V 80.6 | [HF](https://huggingface.co/deepseek-ai/DeepSeek-V4-Pro) |
| Kimi K2.6 | Modified MIT (атрибуция >100M MAU) | 1T/32B | Да | 8×H200 INT4 | Together 1.20/4.50 | SWE-V 80.2 | [HF](https://huggingface.co/moonshotai/Kimi-K2.6) |
| Kimi K3 | custom | 2.8T/104B | Да | 8×B200 минимум | Together 3/15 | TB 2.1 88.3 | [HF](https://huggingface.co/moonshotai/Kimi-K3) |
| GLM-5 / 5.2 | MIT | ~750B/40B | Да | 8×H200 FP8 | Together 1.40/4.40 | SWE-V 77.8 / SWE-Pro 62.1 | [HF](https://huggingface.co/zai-org/GLM-5.2) |
| MiniMax M2.5 / M3 | Modified MIT / community | 229B/10B; 428B/23B | Да | 4–8×80GB | Together 0.30/1.20 | SWE-V 80.2 / 80.5 | [HF](https://huggingface.co/MiniMaxAI/MiniMax-M3) |
| gpt-oss-120b / 20b | Apache-2.0 | 117B/5B; 21B/4B | Да | 1×80GB / 16GB | Groq 0.15/0.60 | SWE-V 62.4 | [HF](https://huggingface.co/openai/gpt-oss-120b) |
| Gemma 4 31B | Apache-2.0 | 31B dense | Да | 1×80GB / 24GB Q4 | Together 0.39/0.97 | LCB 80.0 | [HF](https://huggingface.co/google/gemma-4-31B-it) |
| Devstral 2 123B / Small 24B | Modified MIT / Apache-2.0 | dense | Да | 4×H100 / 1×24GB | — | SWE-V 72.2 / 68.0 | [HF](https://huggingface.co/mistralai/Devstral-2-123B-Instruct-2512) |
| Llama 4 Maverick / Scout | Llama 4 Community | 400B/17B; 109B/17B | не указано | 8×H100 | DeepInfra 0.20/0.80 | LCB 43.4 | [HF](https://huggingface.co/meta-llama/Llama-4-Maverick-17B-128E-Instruct). Groq снял обе в 2026; Llama 5 нет |

Факт: open-weights модели класса SWE-bench Verified 80% (DeepSeek V4,
Kimi K2.6, GLM-5, MiniMax) требуют 4–8 GPU класса H200/B200 для self-host,
либо хостятся у Together/Fireworks по $0.14–4.50 за 1M — то есть дешевле
проприетарных в 3–10 раз, но с лицензионными оговорками и без ZDR у
первоисточника.

---

## 5. Как открытые проекты дают AI анонимам, и что разрешают вендоры

### 5.1 Прецеденты

| Проект | Как устроено | Источник |
| --- | --- | --- |
| **Remix IDE** | Дефолт Mistral Medium через роутер; 20 000 кредитов бесплатно на старте; Starter $9.99 / Pro $19.99; BYOK; Ollama локально. Не self-hosted open-weights. | [docs](https://remix-ide.readthedocs.io/en/latest/ai.html) |
| **Compiler Explorer (Godbolt)** | «Claude Explain»: opt-in, дешёвая модель (пример `claude-3-5-haiku`), кэш ответов в S3 на 2 дня, финансируется пожертвованиями; квота не опубликована | [blog](https://xania.org/202505/ai-and-compiler-explorer), [repo](https://github.com/compiler-explorer/explain) |
| bolt.new | Free 300K токенов/день, 1M/мес, без карты | [pricing](https://bolt.new/pricing) |
| Replit | Free «daily Agent credits», сумма не опубликована | [pricing](https://replit.com/pricing) |
| GitHub Copilot Free | 2000 автодополнений + 50 чатов/мес | [plans](https://github.com/features/copilot/plans) |
| Rust Playground | **AI нет**, issues нет | [repo](https://github.com/rust-lang/rust-playground) |
| Jupyter AI | Чистый BYOK, 17 провайдеров включая Ollama | [docs](https://jupyter-ai.readthedocs.io) |
| Hugging Face | $0.10/мес кредита, нужен токен (анонимно нельзя) | [pricing](https://huggingface.co/docs/inference-providers/pricing) |

### 5.2 Позиции вендоров по вызову из браузера с ключом пользователя

- **Anthropic**: SDK требует `dangerouslyAllowBrowser: true`, CORS — через
  заголовок `anthropic-dangerous-direct-browser-access: true`; BYOK-приложения
  названы легитимным кейсом. ZDR-организациям CORS недоступен. Логин через
  подписку claude.ai сторонним приложениям **запрещён** (ужесточено в 2026).
  [README](https://github.com/anthropics/anthropic-sdk-typescript/blob/main/README.md), [Agent SDK docs](https://code.claude.com/docs/en/agent-sdk/overview)
- **OpenAI**: тот же флаг в `openai-node`, «для внутренних инструментов /
  ключей ограниченной области»; «Sign in with ChatGPT» — только identity,
  без доступа к моделям. [README](https://github.com/openai/openai-node/blob/master/README.md)
- **Google**: «не хардкодьте ключи в web/mobile»; рекомендован backend-прокси
  либо Firebase AI Logic + App Check; ключи AI Studio можно ограничить по
  origin. [docs](https://ai.google.dev/gemini-api/docs/api-key)
- **OpenRouter**: единственный с задокументированным браузерным PKCE-флоу;
  CORS проверен вживую. [pkce](https://openrouter.ai/docs/use-cases/oauth-pkce)
- xAI, DeepSeek, Qwen, Kimi, Z.ai, MiniMax, Mistral, Together, Fireworks,
  Groq: позиции не задокументированы.

### 5.3 Провайдер-агностичные слои

| Слой | Нужен сервер | Лицензия | Цикл инструментов / ворота одобрения | Примечание | Источник |
| --- | --- | --- | --- | --- | --- |
| Vercel AI SDK | Ядро — нет; **`@ai-sdk/react` требует React ≥18** (у нас 17) | Apache-2.0 | `stopWhen`, `toolApproval` | Anthropic из браузера — через тот же опасный заголовок | [docs](https://ai-sdk.dev/docs/ai-sdk-core/tools-and-tool-calling) |
| OpenRouter | Нет | проприетарный | Tool calling нормализован между вендорами; цикл — свой | 5.5% на пополнение; BYOK бесплатно до $25K/мес | [docs](https://openrouter.ai/docs/guides/features/tool-calling) |
| LangChain.js / LangGraph.js | Нет (CORS провайдера) | MIT | `interrupt()` + checkpointer | Поддержка браузера в доках не заявлена | [docs](https://docs.langchain.com/oss/javascript/langgraph/interrupts) |
| LiteLLM | **Да** (Python-прокси) | MIT core | passthrough | — | [docs](https://docs.litellm.ai) |
| Portkey Gateway | **Да** | MIT | guardrails | полностью OSS с 2026-03 | [repo](https://github.com/Portkey-AI/gateway) |
| Cloudflare AI Gateway | CF-аккаунт | проприетарный | passthrough | 5% на unified billing | [docs](https://developers.cloudflare.com/ai-gateway/reference/pricing/) |

---

## 6. Интерпретация — это уже наше мнение, не факты

Что из собранного имеет значение для **нашего** решения. Всё ниже можно
оспорить; факты для спора — выше.

**6.1 Ни один аналог не обучает свою модель для таких задач.** Remix, Bolt,
Lovable, Replit, Ona — все берут frontier-модель по API. Свои модели у
Cursor/Cognition/JetBrains/Microsoft — это автодополнение или «быстрый
дешёвый» режим при миллионах пользователей. Для Playground вопрос «обучать
ли» закрыт практикой рынка.

**6.2 Ближайший аналог — Remix — выбрал роутер + BYOK + бесплатные кредиты.**
Дефолт у них средний по цене (Mistral Medium, $1.50/$7.50), роутер —
OpenRouter, список моделей управляется с сервера. Это ровно та архитектура,
которую мы описали как «ступень 1» (прокси), только у них она уже в
продакшене. Хороший референс для заказчика: «мы делаем, как Ethereum
Foundation сделал в Remix».

**6.3 Frontier-модели сблизились — об этом говорят сами продукты.** Amp
сменил дефолт с Claude на GPT и написал, что разница «небольшая». Это
аргумент не за конкретного вендора, а за **провайдер-агностичный слой** —
который у нас уже есть (`Provider` в `model/types.ts`). Выбор дефолта
становится вопросом цены, юрисдикции данных и наличия нужных фич API, а не
«кто умнее».

**6.4 Для нашей задачи важнее цикл, чем модель.** CRUST-Bench: цикл
«компилятор → правка» удваивает успех. RustEvo²: RAG по актуальным API даёт
+13.5 п.п., а API после cutoff роняют успех с 56% до 32%. Для Playground это
значит: доступ агента к реальной сборке и заземление в документации версии
0.29 дадут больше, чем переход между двумя frontier-моделями.

**6.5 Что делать с выбором дефолта — честные варианты для Фонда.**

| Вариант | Цена хода «ошибка → патч» (оценка) | Плюсы | Минусы |
| --- | --- | --- | --- |
| A. Anthropic напрямую (Opus 5 / Sonnet 5) | ~$0.12–0.20 / ~$0.05–0.08 | Уже работает; Tool Runner с хуками; MCP-коннектор на стороне API (обходит CORS `mcp.solana.com`); ZDR | Один вендор; браузерный вызов — через «опасный» флаг |
| B. OpenAI напрямую (GPT-5.6 Terra / Sol) | ~$0.05–0.08 / ~$0.15–0.25 | Сопоставимые бенчмарки; Responses API с tools | Нет MCP-коннектора из браузера; batch не для codex |
| C. Google (Gemini 3.7 Flash) | ~$0.02–0.04 до конца 2026 | Дешевле всех frontier; Google прямо предлагает Firebase-прокси | Pro-модели без free tier; акция до 2026-12-31 |
| D. OpenRouter как роутер (как Remix) | цена модели + 5.5% | Один ключ, любая модель, браузерный PKCE, BYOK бесплатно | Ещё одна сторона в цепочке данных; без серверных MCP-коннекторов |
| E. Open-weights через Together/Fireworks (DeepSeek V4 Flash, MiniMax M3) | ~$0.01–0.03 | В 5–10 раз дешевле; лицензия MIT | Нет ZDR у первоисточника; качество на сложных правках ниже по SWE-bench Pro |
| F. Self-host open-weights | железо 4–8×H200 | Полный контроль, «всё открыто» буквально | Отдельный продукт: инфраструктура, дежурство, обновления |

Оценки стоимости хода — по структуре нашего промпта (§3 предыдущего
документа), не замер. Замер даст прогон эталонных кейсов.

**6.6 Наша позиция для презентации (предложение, не решение).** Не «мы
выбрали модель X», а: *«Слой провайдера абстрактный. Для демо подключён
вариант A, потому что он единственный, где заземление в `mcp.solana.com`
работает без нашего бэкенда. Для продакшена предлагаем роутер с дефолтом по
цене/качеству и BYOK — как Remix, — а выбор дефолта зафиксировать после
прогона эталонных кейсов на A, B, C и E. Вопрос к Фонду — есть ли у вас
предпочтительный вендор или облачный счёт (Bedrock/Vertex/Foundry)»*.

Это формулировка, за которую можно отвечать цифрами из разделов 1–5.

---

## Что не удалось проверить

- Rust-срез любого современного лидерборда.
- Расхождение DeepSeek V4 Pro 96.4% (vals.ai) против 80.6% (вендор) на SWE-bench Verified.
- Вендорские SWE-bench Pro цифры Fable 5 / Opus 5 — независимого подтверждения нет.
- Судьба Remix «solcoder»; текущая база thirdweb t1; статус Explorer MCP.
- Совместимость `mcp_servers` с `toolRunner` в одном запросе Anthropic SDK.
