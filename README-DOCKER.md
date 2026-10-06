# Rummy Club — Docker deployment

[English](README-DOCKER.md) | [Русский](README_RU.md)

Rummy Club can be deployed with Docker Compose using an application container, Nginx, and Certbot. The SQLite database and TLS certificates are stored in named Docker volumes.

## First deployment

1. Point the domain's DNS record to the server.
2. Make sure TCP ports 80 and 443 are available.
3. Copy `.env.example` to `.env` and set `DOMAIN` and `CERTBOT_EMAIL`.
4. Start the stack:

```bash
make up
```

Certbot obtains the initial certificate through HTTP-01. Nginx serves the application over HTTPS after the certificate is available.

## Updating a running server

Keep your existing `.env` file and persistent Docker volumes, then rebuild the stack:

```bash
make rebuild
make status
make logs-app
```

The application container is exposed only to the Docker network; Nginx handles public HTTP/HTTPS traffic.

The database migration script is safe to run against an existing installation. It records applied migrations and can adopt the original schema when upgrading older installations that do not have migration history.

## Useful commands

```bash
make up
make rebuild
make down
make restart
make status
make logs
make logs-app
make logs-nginx
make logs-certbot
make shell
```

`make down` preserves named volumes. Do not use `docker compose down -v` unless you intentionally want to delete the database and TLS certificates.

## Data and backups

The game database is stored in the `rummiclub_db` Docker volume. TLS certificates use the `rummiclub_certbot_www` and `rummiclub_certbot_certs` volumes.

Back up the database volume before destructive maintenance or server migration.

## Configuration

`.env.example` contains the required variables:

- `DOMAIN` — public domain;
- `CERTBOT_EMAIL` — email used by Certbot.

`RUMMY_DB_PATH` can be used to override the SQLite path inside the application container when needed.

For the full project documentation, see [`README.md`](README.md) or [`README_RU.md`](README_RU.md).
