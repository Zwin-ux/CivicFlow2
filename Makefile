.PHONY: help build up down logs shell test migrate seed clean

# Default target
help:
	@echo "Government Lending CRM - Docker Commands"
	@echo ""
	@echo "Available commands:"
	@echo "  make build       - Build Docker images"
	@echo "  make up          - Start all services"
	@echo "  make up-dev      - Start services in development mode"
	@echo "  make down        - Stop all services"
	@echo "  make logs        - View logs from all services"
	@echo "  make logs-api    - View API logs"
	@echo "  make shell       - Open shell in API container"
	@echo "  make test        - Run tests in container"
	@echo "  make migrate     - Run database migrations"
	@echo "  make seed        - Seed database with test data"
	@echo "  make clean       - Stop services and remove volumes"
	@echo "  make restart     - Restart all services"
	@echo "  make ps          - Show running containers"
	@echo "  make health      - Check service health"

# Build Docker images
build:
	docker-compose build

# Build without cache
build-no-cache:
	docker-compose build --no-cache

# Start services in production mode
up:
	docker-compose up -d

# Start services in development mode with hot-reload
up-dev:
	docker-compose -f docker-compose.yml -f docker-compose.dev.yml up

# Stop all services
down:
	docker-compose down

# View logs from all services
logs:
	docker-compose logs -f

# View API logs only
logs-api:
	docker-compose logs -f api

# View PostgreSQL logs
logs-db:
	docker-compose logs -f postgres

# View Redis logs
logs-redis:
	docker-compose logs -f redis

# Open shell in API container
shell:
	docker-compose exec api sh

# Open PostgreSQL shell
db-shell:
	docker-compose exec postgres psql -U postgres -d lending_crm

# Open Redis CLI
redis-shell:
	docker-compose exec redis redis-cli

# Run tests
test:
	docker-compose exec api npm test

# Run linter
lint:
	docker-compose exec api npm run lint

# Run database migrations
migrate:
	docker-compose exec api npm run migrate

# Seed database
seed:
	docker-compose exec api npm run seed

# Clean up - stop services and remove volumes
clean:
	docker-compose down -v
	rm -rf uploads/* logs/*

# Restart all services
restart:
	docker-compose restart

# Restart API only
restart-api:
	docker-compose restart api

# Show running containers
ps:
	docker-compose ps

# Check service health
health:
	@echo "Checking API health..."
	@curl -s http://localhost:3000/api/v1/health | jq . || echo "API not responding"
	@echo ""
	@echo "Container health status:"
	@docker-compose ps

# Backup database
backup-db:
	@mkdir -p backups
	docker-compose exec -T postgres pg_dump -U postgres lending_crm > backups/backup-$$(date +%Y%m%d-%H%M%S).sql
	@echo "Database backed up to backups/"

# Restore database from latest backup
restore-db:
	@if [ -z "$$(ls -A backups/*.sql 2>/dev/null)" ]; then \
		echo "No backup files found in backups/"; \
		exit 1; \
	fi
	@LATEST=$$(ls -t backups/*.sql | head -1); \
	echo "Restoring from $$LATEST..."; \
	docker-compose exec -T postgres psql -U postgres lending_crm < $$LATEST

# View resource usage
stats:
	docker stats

# Prune unused Docker resources
prune:
	docker system prune -f

# Full reset - clean everything and rebuild
reset: clean
	docker-compose build --no-cache
	docker-compose up -d
	@echo "Waiting for services to be ready..."
	@sleep 10
	$(MAKE) migrate
	$(MAKE) seed
	@echo "Reset complete!"
