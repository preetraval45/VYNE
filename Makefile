.PHONY: dev build test lint clean setup docker-up docker-down deploy-dev

dev:
	pnpm dev

build:
	pnpm build

test:
	pnpm test

lint:
	pnpm lint

clean:
	pnpm clean

setup:
	bash scripts/setup.sh

docker-up:
	docker compose up -d

docker-down:
	docker compose down

db-migrate:
	bash scripts/db-migrate.sh

db-seed:
	bash scripts/db-seed.sh

format:
	pnpm format

typecheck:
	pnpm typecheck
