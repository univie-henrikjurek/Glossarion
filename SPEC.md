# Glossarion - Implementation Plan

## Overview

A self-hosted multilingual dictionary app optimized for Raspberry Pi with offline capabilities.

## Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                        Client Layer                                  │
│  ┌─────────────────┐    ┌─────────────────┐                         │
│  │  Web Browser   │    │  Mobile PWA     │                         │
│  │  (React SPA)   │◄──►│  (Offline Capable)│                        │
│  └────────┬────────┘    └────────┬────────┘                         │
│           │                      │                                   │
│           └──────────┬───────────┘                                   │
│                      │                                               │
│                      ▼                                               │
│  ┌───────────────────────────────────────────────────────────────┐  │
│  │                    Network Layer (WireGuard VPN)               │  │
│  └───────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│                      Raspberry Pi (Docker/Portainer)                  │
│                                                                       │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │                      Docker Network                           │   │
│  │  ┌────────────┐  ┌────────────┐  ┌────────────────────┐      │   │
│  │  │  Frontend  │  │   Backend   │  │  LibreTranslate   │      │   │
│  │  │  (nginx)   │◄─┤  (FastAPI)  │◄─┤  (Self-hosted)     │      │   │
│  │  │  :80       │  │   :8000     │  │    :3000          │      │   │
│  │  └────────────┘  └──────┬─────┘  └────────────────────┘      │   │
│  │                         │                                      │   │
│  │                         ▼                                      │   │
│  │  ┌───────────────────────────────────────────────────────┐    │   │
│  │  │                    PostgreSQL (:5432)                   │    │   │
│  │  └───────────────────────────────────────────────────────┘    │   │
│  └──────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────┘
```

## Technology Stack

| Layer | Technology | Rationale |
|-------|------------|-----------|
| Backend | Python 3.11 + FastAPI | Async-first, excellent for I/O, Pydantic validation |
| ORM | SQLAlchemy 2.0 + asyncpg | Type-safe, async support, ARM-compatible |
| Database | PostgreSQL 15 | Robust, JSON support, ARM image available |
| Frontend | React 18 + Vite + TanStack Table | Fast builds, excellent table library |
| State | Zustand + React Query | Lightweight, offline-first ready |
| Styling | Tailwind CSS | Utility-first, responsive, small bundle |
| Translation | LibreTranslate (Docker) | Self-hosted, no API costs, privacy |
| Proxy | nginx | Lightweight, SSL termination ready |
| Deployment | Docker Compose | ARM-optimized, Portainer compatible |

## Data Model

### Entity Relationship

```
┌─────────────────┐         ┌─────────────────┐
│     Entry       │         │   Translation   │
├─────────────────┤         ├─────────────────┤
│ id (UUID, PK)   │────┐    │ id (UUID, PK)   │
│ context         │    │    │ entry_id (FK)   │
│ tags (JSON)     │    ├───►│ language_code   │
│ created_at      │    │    │ text            │
│ updated_at      │    │    │ status          │
└─────────────────┘    │    │ created_at      │
                       │    │ updated_at      │
                       │    └─────────────────┘
                       │
                       └───────────────────────► Multiple translations per language
```

## API Endpoints

### Entries

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/entries` | List all entries with translations |
| GET | `/api/entries/{id}` | Get single entry with translations |
| POST | `/api/entries` | Create new entry |
| PUT | `/api/entries/{id}` | Update entry |
| DELETE | `/api/entries/{id}` | Delete entry (cascade) |

### Translations

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/entries/{id}/translations` | Add translation |
| PUT | `/api/translations/{id}` | Update translation |
| DELETE | `/api/translations/{id}` | Delete translation |
| POST | `/api/entries/{id}/translate` | Auto-translate entry |

### Utilities

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/languages` | List supported languages |
| GET | `/api/sync` | Get all data for sync |
| POST | `/api/export` | Export as JSON/CSV |

## Offline Sync Strategy

### Architecture

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   Frontend      │────►│   Backend       │────►│   Database      │
│   (IndexedDB)   │◄────│   (FastAPI)     │◄────│   (PostgreSQL)  │
└─────────────────┘     └─────────────────┘     └─────────────────┘
        │
        └───────────────────────┘
              Sync via REST
```

### IndexedDB Schema

- `entries`: Store all entries locally
- `translations`: Store all translations locally
- `syncQueue`: Store pending changes for when online

## File Structure

```
glossarion/
├── backend/
│   ├── app/
│   │   ├── main.py              # FastAPI app
│   │   ├── config.py            # Settings
│   │   ├── database.py          # DB connection
│   │   ├── models/              # SQLAlchemy models
│   │   ├── schemas/             # Pydantic schemas
│   │   ├── api/                 # API routes
│   │   └── services/            # Business logic
│   ├── requirements.txt
│   └── Dockerfile
├── frontend/
│   ├── src/
│   │   ├── App.tsx              # Main app
│   │   ├── components/          # React components
│   │   ├── stores/              # Zustand store
│   │   ├── services/            # API client
│   │   └── index.css            # Tailwind styles
│   ├── package.json
│   ├── vite.config.ts
│   └── Dockerfile
├── docker-compose.yml
├── .env.example
└── README.md
```

## Raspberry Pi Optimization

- Alpine-based images (smaller footprint)
- ARM-compatible images
- Memory-optimized LibreTranslate configuration
- SQLite option for very low-memory setups (future)
