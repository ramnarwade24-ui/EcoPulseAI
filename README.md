## 🌍 Problem Statement

AI systems consume massive energy and show increasing carbon emissions. Organizations lack visibility and control over the environmental impact of their AI workloads.

EcoPulse AI solves this by providing real-time carbon tracking, energy optimization, and ESG-compliant sustainability reporting for AI systems.

## 🎯 Use Cases

- Enterprises monitoring carbon footprint of AI workloads  
- ESG compliance and sustainability audits  
- Green AI optimization for data centers  
- Energy-efficient ML model selection  
- Carbon budgeting & emission forecasting  

## 🔁 System Flow

User → React Dashboard → Spring Boot API  
Spring Boot API → FastAPI AI Engine  
FastAPI Engine → Carbon Estimation Models  
Spring Boot API → PostgreSQL + Redis  
Dashboard → ESG Reports (PDF)


## 📡 Core APIs

POST /api/auth/login  
POST /api/emissions/calculate  
GET  /api/footprint/summary  
POST /api/green-ai/optimize  
GET  /api/reports/esg

## 🚀 Deployment

EcoPulseAI is fully containerized and supports:
- Local deployment via Docker Compose
- Cloud deployment on AWS, GCP, or Azure
- CI/CD ready architecture

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
