# EcoPulse AI – The Green Intelligence Monitor

EcoPulse AI is an ESG sustainability platform that tracks and optimizes the environmental impact of AI model usage.

## Quickstart (Docker)

Prereqs: Docker + Docker Compose.

1) Copy environment defaults:

```bash
cp .env.example .env
```

2) Build and start:

```bash
docker compose up --build
```

3) Open:

- Frontend: http://localhost:3000
- Backend API: http://localhost:8080/api
- AI Engine (FastAPI): http://localhost:8000/docs

## Default users

On first run, the backend seeds a small dataset and creates:

- `admin@ecopulse.ai` / `admin123` (role: `ADMIN`)
- `user@ecopulse.ai` / `user123` (role: `USER`)

## Architecture

- `backend/` (Spring Boot, Java 21): REST API, JWT auth, RBAC, PostgreSQL persistence, Redis caching + rate limiting, ESG PDF report generation.
- `ai-engine/` (FastAPI): analytics microservice (emissions calc, region intensity lookup, advisor, scheduler, etc.).
- `frontend/` (React + Tailwind + Recharts): dashboard + tools.

## Notes on security

- JWT + RBAC are enabled in the backend.
- Redis-based per-IP rate limiting is enabled.
- AES-256 field encryption is applied to selected DB fields (configurable via `FIELD_ENCRYPTION_KEY_B64`).
- TLS/HTTPS is supported via Spring Boot SSL config, but local `docker compose` runs HTTP by default.