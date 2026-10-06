.PHONY: help install dev build start lint test test-smoke docker-build up down restart stop status logs logs-app logs-nginx logs-certbot shell clean

COMPOSE := docker compose

help:
	@echo "Rummy Club commands:"
	@echo ""
	@echo "  Local development:"
	@echo "    make install       Install dependencies"
	@echo "    make dev           Start the local development server"
	@echo "    make build         Build the application locally"
	@echo "    make start         Start the production build locally"
	@echo "    make lint          Run ESLint"
	@echo "    make test          Run automated tests"
	@echo "    make test-smoke    Run API smoke test against local server"
	@echo ""
	@echo "  Docker / production:"
	@echo "    make up            Start all Docker services"
	@echo "    make rebuild       Rebuild images and start services"
	@echo "    make down          Stop and remove containers"
	@echo "    make restart       Restart all services"
	@echo "    make status        Show service status"
	@echo "    make logs          Follow all service logs"
	@echo "    make logs-app      Follow app logs"
	@echo "    make logs-nginx    Follow Nginx logs"
	@echo "    make logs-certbot  Follow Certbot logs"
	@echo "    make shell         Open a shell in the app container"
	@echo "    make docker-build  Build the Docker image without starting it"
	@echo ""
	@echo "  Data volumes are preserved by make down/restart."
	@echo "  To remove the database and certificates, use Docker directly:"
	@echo "    docker compose down -v"

install:
	npm run install:ci

dev:
	npm run dev

build:
	npm run build

start:
	npm run start

lint:
	npm run lint

test:
	node --test tests/game.test.mjs tests/features.test.mjs tests/api.test.mjs

test-smoke:
	python tests/api-smoke.py $${URL:-http://127.0.0.1:5173}

docker-build:
	$(COMPOSE) build

up:
	$(COMPOSE) up -d

rebuild:
	$(COMPOSE) up -d --build

down:
	$(COMPOSE) down

stop:
	$(COMPOSE) stop

restart:
	$(COMPOSE) restart

status:
	$(COMPOSE) ps

logs:
	$(COMPOSE) logs -f --tail=100

logs-app:
	$(COMPOSE) logs -f --tail=100 app

logs-nginx:
	$(COMPOSE) logs -f --tail=100 nginx

logs-certbot:
	$(COMPOSE) logs -f --tail=100 certbot

shell:
	$(COMPOSE) exec app sh

clean:
	@echo "Refusing to remove Docker volumes automatically."
	@echo "Use 'docker compose down -v' only if you intentionally want to delete the database and certificates."
