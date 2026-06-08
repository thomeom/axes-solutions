# Axes Solutions: запуск и публикация

## Локальный запуск

1. Откройте папку проекта.
2. Запустите файл:

```bash
./start_site.command
```

Скрипт поднимает:

- backend: `http://127.0.0.1:8000/api/health`
- сайт: `http://127.0.0.1:8080/html/index.html`
- кабинет: `http://127.0.0.1:8080/html/account.html`

Если порт `8080` занят, сайт автоматически откроется на следующем свободном порту, например `8081`.

## Что уже реализовано

- умная заявка с выбором услуги, стека/области работ, состава Junior/Middle/Senior, длительности и модели сотрудничества;
- live-калькулятор вилки аутсорсинга и сравнения со штатной командой с налогами, рабочими местами, подбором и HR-администрированием;
- клиентский кабинет с проектами, заявками, спринтами, часами, Kanban и диаграммой Ганта;
- PDF-генератор типового договора и NDA с водяным знаком в личном кабинете;
- backend API на FastAPI + SQLite, данные проектов и заявок сохраняются в `backend/axes.db`.

## Аккаунты

Клиент регистрируется на сайте:

- `frontend/html/login.html`
- после входа клиент попадает в `frontend/html/account.html`

Сотрудники входят через ту же форму, но после входа попадают в админку:

- Администратор: `admin@axessolution.com` / `Admin@123`
- Менеджер: `manager@axessolution.com` / `Manager@123`
- Модератор: `moderator@axessolution.com` / `Moderator@123`

## GitHub

```bash
git init
git add .
git commit -m "Initial Axes Solutions site"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPOSITORY.git
git push -u origin main
```

Не загружайте `.venv`, если он появится в проекте. Для этого можно добавить `.gitignore`.

## Хостинг

Проект состоит из двух частей:

- `frontend/` — статичный сайт, его можно разместить на Netlify, Vercel, GitHub Pages или обычном хостинге.
- `backend/` — FastAPI API, его нужно размещать отдельно на Render, Railway, VPS или другом сервере с Python.

Для продакшена в `frontend/js/app.js` замените:

```js
const API = "http://127.0.0.1:8000/api";
```

на адрес вашего backend, например:

```js
const API = "https://your-api.onrender.com/api";
```

Backend запускается командой:

```bash
python3 -m uvicorn backend.server:app --host 0.0.0.0 --port 8000
```

Для реального продакшена лучше заменить SQLite на PostgreSQL, потому что файл `backend/axes.db` на бесплатных хостингах может сбрасываться.
