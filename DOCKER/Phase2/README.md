# Phase 2 Docker Stack

React (JavaScript) + Vite frontend, Express backend, and Redis running with Docker Compose.

## Run with Docker

```bash
docker compose up --build
```

Open http://localhost:5173. The API health endpoint is available at http://localhost:5000/api/health.

## Run locally

Start Redis separately, then run `npm run dev` inside `backend` and `npm run dev` inside `frontend`.
