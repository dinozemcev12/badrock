# Badrock

Локальное приложение для заметок в духе Obsidian. Заметки хранятся обычными
Markdown-файлами в папке хранилища, интерфейс работает в браузере, а серверная
часть написана на Rust.

## Быстрый запуск

Запустите `start.bat`. Скрипт:

1. соберёт Rust-сервер, если исполняемого файла ещё нет;
2. запустит `target\release\bedrock-server.exe`;
3. дождётся готовности API;
4. откроет приложение в отдельном окне Edge или Chrome.

После закрытия окна приложения сервер останавливается.

## Ручной запуск

```powershell
cargo build --release -p bedrock-server
target\release\bedrock-server.exe
```

Приложение откроется по адресу <http://127.0.0.1:5176/>.

Полезные команды:

```powershell
cargo run --release -p bedrock-server     # собрать и запустить
cargo build --release -p bedrock-server   # только собрать
cargo build --release --offline -p bedrock-server  # сборка без сети
```

`npm start` и `npm run build` также вызывают Cargo.

## Настройки

- `PORT` — порт сервера, по умолчанию `5176`.
- `HOST` — адрес прослушивания, по умолчанию `127.0.0.1`.
- `BEDROCK_ROOT` — корень приложения (папка с `public/index.html`).

Путь к активному хранилищу сохраняется в `bedrock.config.json`. По умолчанию
используется папка `vault`, при первом запуске она наполняется демонстрационными
заметками.

## Структура

- `server-rs/` — Rust-сервер (axum + tokio): API, индексация хранилища, поиск,
  обратные ссылки, граф, работа с файлами.
- `public/` — интерфейс приложения (HTML, CSS, JavaScript).
- `vault/` — хранилище заметок по умолчанию.
- `server.js` — прежняя Node.js-реализация, оставлена для справки.
- `src-tauri/` — ранний экспериментальный вариант оболочки, в сборку не входит.

## API

HTTP API не изменился по сравнению с Node.js-версией: `/api/vault/*`,
`/api/note/*`, `/api/folder/*`, `/api/search`, `/api/tags`, `/api/backlinks`,
`/api/graph`, `/api/resolve`, `/api/random`, `/api/file`. Поэтому фронтенд из
`public/` работает с Rust-сервером без изменений.
