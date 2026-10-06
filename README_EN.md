# Rummy Club

[English](README_EN.md) | [Русский](README.md)

A small multiplayer web game for a break with colleagues. Create a room, invite 2–4 players, play with optional bots, and use the built-in chat.

## Features

- private rooms and an optional public lobby list;
- join by nickname without registration;
- invite links for rooms;
- 2–4 players, with optional bots and replacement of players who leave;
- three deal modes: classic, balanced, and easy;
- turn timer: off, 30 seconds, 1, 2, 3, or 5 minutes;
- inactivity protection: with a turn timer, a player is removed after 3 timed-out turns; without a timer, after 30 minutes without completing a turn;
- room chat with up to 80 recent messages;
- local move drafts stored only in the browser;
- automatic room expiration and physical deletion of old room data;
- privacy policy at `/privacy` and terms at `/terms`.

## Stack

- TypeScript
- React
- Vinext / Vite
- SQLite with Drizzle-compatible schema and migrations
- Docker
- Nginx and Certbot for production HTTPS

## Requirements

- Node.js `>=22.13.0`
- npm
- Docker and Docker Compose for production deployment

## Local development

Install dependencies and start the development server:

```bash
make install
make dev
```

Useful commands:

```bash
make help
make build
make start
make lint
make test
make test-smoke
```

The local SQLite database is created at `data/rummy-club.db` unless `RUMMY_DB_PATH` is set.

## Docker deployment

Create an environment file from the example:

```bash
cp .env.example .env
```

Set `DOMAIN` and `CERTBOT_EMAIL`, then start the stack:

```bash
make up
```

For a rebuild after updating the source:

```bash
make rebuild
```

Useful production commands:

```bash
make status
make logs
make logs-app
make logs-nginx
make logs-certbot
make shell
```

Stop the services without deleting persistent volumes:

```bash
make down
```

Do not run `docker compose down -v` unless you intentionally want to delete the SQLite database and TLS certificates stored in Docker volumes.

More Docker details are available in [`README-DOCKER.md`](README-DOCKER.md).

## Environment variables

- `DOMAIN` — public domain used by Nginx and Certbot;
- `CERTBOT_EMAIL` — email address used by Certbot;
- `RUMMY_DB_PATH` — SQLite database path. Defaults to `/app/data/rummy-club.db`.

Use `.env.example` as the template. Real `.env` files and local database files are ignored by Git.

## Data retention

Room state, including player nicknames and room chat, is stored in the SQLite database while the room is active. Closed or finished rooms are physically removed after the retention period; inactive lobbies are removed after their longer expiration period.

The application does not require player accounts or email addresses. The browser uses a technical player cookie to keep a player associated with their seat.

## Project structure

- `app/` — pages, privacy/terms pages, and API routes;
- `components/` — reusable UI components;
- `lib/` — game rules, bots, chat, rooms, validation, and utilities;
- `db/`, `drizzle/` — database adapter, schema, and migrations;
- `docker/`, `nginx/`, `Dockerfile`, `docker-compose.yml` — production deployment;
- `scripts/` — database migration utilities;
- `tests/` — game, API, feature, and smoke tests;
- `Makefile` — common development and Docker commands.

## Testing

Run the main automated checks with:

```bash
make lint
make test
make build
```

The optional smoke test expects a running local server:

```bash
make test-smoke
```

## Security

Please do not report security vulnerabilities through public issues. See [`SECURITY.md`](SECURITY.md) for the reporting policy.

## License

Rummy Club is released under the MIT License. See [`LICENSE`](LICENSE).
