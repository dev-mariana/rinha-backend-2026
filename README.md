# Rinha Backend 2026

This repository contains the backend/API for the Rinha project (2026). The application provides endpoints and utilities for document indexing, text vectorization and similarity search using local indexes (for example `usearch`). It supports semantic search, data normalization, and explanation endpoints used by client applications.

---

Key features:
- Indexing of JSON documents and management of local search indexes.
- Text vectorization to enable semantic search.
- Search and explanation endpoints (see `explicacao_search.ts`, `src/search.ts`).
- Utility scripts for building/updating indexes in `scripts/`.

---

Requirements
- Bun.
- Python virtualenv for auxiliary scripts (see `env/`).

---

Install
```sh
bun install
```

Run (development)
```sh
bun run dev
```

Open the API locally at:
http://localhost:9999

---

Run with Docker
You can run the application with Docker using the provided `Dockerfile` and `docker-compose.yml`.

- Using `docker-compose` (recommended):

```sh
docker-compose up --build
```

This will build the image and start the service. By default the API will be available at `http://localhost:9999` unless overridden in `docker-compose.yml` or `nginx/nginx.conf`.

- Build and run with `docker`:

```sh
docker build -t rinha-backend:latest .
docker run --rm -p 9999:9999 --name rinha-backend rinha-backend:latest
```

If you need to run auxiliary scripts that require the Python virtual environment, enter the container or run them locally using the `env/` virtualenv.

---

Relevant structure
- `src/` — main TypeScript sources (`index.ts`, `search.ts`, `vectorize.ts`).
- `scripts/` — index-building utilities (`build_index.py`).
- `resources/` — indexes and auxiliary files (`index.usearch`, `normalization.json`).
- `env/` — Python virtual environment used by some scripts.

---

License

MIT 