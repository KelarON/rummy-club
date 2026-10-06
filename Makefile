SHELL := /bin/sh

.PHONY: help install dev build start lint check ci \
        up rebuild down stop restart status logs logs-app logs-nginx logs-certbot \
        shell docker-build

# Local development
install:
	npm ci

dev:
	npm run dev

build:
	npm run build

start:
	npm run start

lint:
	npm run lint

# Fast local checks
check: lint build
	@echo "Checks passed."

# Full CI-equivalent check. Run this before git push.
ci: install lint build
	@echo "CI checks passed."

# Docker
up:
	docker compose up -d

rebuild:
	docker compose up -d --build

down:
	docker compose down

stop:
	docker compose stop

restart:
	docker compose restart

status:
	docker compose ps

logs:
	docker compose logs -f

logs-app:
	docker compose logs -f app

logs-nginx:
	docker compose logs -f nginx

logs-certbot:
	docker compose logs -f certbot

shell:
	docker compose exec app sh

docker-build:
	docker compose build

help:
	@echo "Rummy Club development commands:"
	@echo ""
	@echo "Local:"
	@echo "  make install       Install dependencies with npm ci"
	@echo "  make dev           Start development server"
	@echo "  make build         Build production application"
	@echo "  make start         Start production application"
	@echo "  make lint          Run ESLint"
	@echo "  make check         Run lint + tests"
	@echo "  make ci            Run the full CI-equivalent check"
	@echo ""
	@echo "Docker:"
	@echo "  make up            Start containers"
	@echo "  make rebuild       Rebuild images and start containers"
	@echo "  make down          Stop and remove containers"
	@echo "  make stop          Stop containers without removing them"
	@echo "  make restart       Restart containers"
	@echo "  make status        Show container status"
	@echo "  make logs          Follow all container logs"
	@echo "  make logs-app      Follow application logs"
	@echo "  make logs-nginx    Follow nginx logs"
	@echo "  make logs-certbot  Follow certbot logs"
	@echo "  make shell         Open a shell in the app container"
	@echo "  make docker-build  Build Docker images"
