.PHONY: help install dev seed test clean logs health

help: ## Show this help message
	@echo "Usage: make [target]"
	@echo ""
	@echo "Targets:"
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-15s\033[0m %s\n", $$1, $$2}'

install: ## Run initial setup script
	chmod +x setup.sh
	./setup.sh

dev: ## Start development server (docker-compose up --build)
	docker-compose up --build

seed: ## Re-seed the database with fresh demo data
	docker-compose exec backend python scripts/seed_data.py

test: ## Run backend tests (local first, Docker fallback)
	@if [ -x backend/.venv/bin/pytest ]; then \
		echo "Running backend tests with backend/.venv/bin/pytest"; \
		PYTHONPATH=backend backend/.venv/bin/pytest backend/tests; \
	elif command -v pytest >/dev/null 2>&1; then \
		echo "Running backend tests with system pytest"; \
		PYTHONPATH=backend pytest backend/tests; \
	else \
		echo "No local pytest found, falling back to Docker"; \
		docker-compose run --rm backend pytest; \
	fi

logs: ## Stream logs from all containers
	docker-compose logs -f

health: ## Check health of all services
	@echo "Checking Backend..."
	@curl -s -o /dev/null -w "%{http_code}" http://localhost:8000/api/health && echo " ✅ OK" || echo " ❌ Failed"
	@echo "Checking Frontend..."
	@curl -s -o /dev/null -w "%{http_code}" http://localhost:3000 && echo " ✅ OK" || echo " ❌ Failed"
	@echo "Checking Database..."
	@docker-compose exec postgres pg_isready -U localuser && echo "✅ OK" || echo "❌ Failed"

clean: ## Stop containers and remove volumes (fresh start)
	docker-compose down -v
	@echo "✨ Environment cleaned. Run 'make dev' to start fresh."
