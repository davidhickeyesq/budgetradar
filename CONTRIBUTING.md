# Contributing to Marginal Efficiency Radar

First off, thanks for taking the time to contribute! 🎉

The following is a set of guidelines for contributing to `budgetradar`.

## 🛠️ Development Setup

This project is designed to be "Local First" and uses Docker Compose for all dependencies.

### Prerequisites

- [Docker Desktop](https://www.docker.com/products/docker-desktop) installed and running.
- `make` (optional, but recommended for running commands).

### Getting Started

1. **Clone the repository**

   ```bash
   git clone https://github.com/davidhickeyesq/budgetradar.git
   cd budgetradar
   ```

2. **Run Initial Setup** (Creates `.env` files)

   ```bash
   make install
   ```

3. **Start the Application** (Builds containers and starts services)

   ```bash
   make dev
   ```

   The app should now be running at [http://localhost:3000](http://localhost:3000).

### Common Commands

| Command | Description |
|---------|-------------|
| `make dev` | Start all services (Frontend, Backend, Postgres) |
| `make seed` | Re-populate the database with fresh demo data |
| `make test` | Run backend unit tests |
| `make clean` | Stop containers and remove all data volumes (Fresh start) |
| `make logs` | Stream logs from all services |

## 🧪 Testing

We use `pytest` for backend testing.

```bash
make test
```

## 📝 Coding Standards

- **Python**: Follow PEP 8 styles.
- **Frontend**: Functional React components with Hooks.
- **Commits**: Please write clear, descriptive commit messages.

## 🐛 Reporting Bugs

If you find a bug, please create a GitHub Issue with:
1. Steps to reproduce.
2. Expected behavior.
3. Actual behavior.
4. Screenshots if applicable.

## 🚀 Submitting a Pull Request

1. Fork the repo and create your branch from `main`.
2. If you've added code that should be tested, add tests.
3. Ensure the test suite passes.
4. Issue that pull request!

## 📜 License

By contributing, you agree that your contributions will be licensed under its MIT License.
