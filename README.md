# Glossarion

A self-hosted multilingual dictionary app with AI-powered translation, optimized for Raspberry Pi with offline capabilities.

## Features

- **Multi-language Support**: Store translations for any language
- **Self-hosted Translation**: Uses LibreTranslate (no API costs, full privacy)
- **Offline-First**: PWA with IndexedDB sync
- **Excel-like Interface**: Inline editing, dynamic columns
- **Raspberry Pi Ready**: Docker/Portainer optimized, ARM-compatible

## Architecture

```
┌─────────────────────┐     ┌─────────────────────┐
│   Web Browser/PWA  │◄───►│   Raspberry Pi      │
│   (React)          │     │   Docker Stack      │
└─────────────────────┘     └─────────────────────┘
                                      │
    ┌─────────────────────────────────┼─────────────────────────────────┐
    │                    Docker Network                                  │
    │  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐         │
    │  │ Frontend │  │ Backend  │  │  Libre   │  │   DB     │         │
    │  │  (nginx) │◄─┤ (FastAPI)│◄─┤ Translate│◄─┤(Postgres)│         │
    │  └──────────┘  └──────────┘  └──────────┘  └──────────┘         │
    └──────────────────────────────────────────────────────────────────┘
```

## Tech Stack

| Component | Technology |
|-----------|------------|
| Backend | Python 3.11 + FastAPI + SQLAlchemy 2.0 |
| Database | PostgreSQL 15 (Alpine) |
| Frontend | React 18 + Vite + TanStack Table |
| State | Zustand + React Query |
| Translation | LibreTranslate (self-hosted) |
| Styling | Tailwind CSS |
| Deployment | Docker Compose |

## Quick Start

### Prerequisites

- Docker & Docker Compose
- Raspberry Pi 4 (recommended) or any Linux server
- ~2GB RAM available

### 1. Clone & Configure

```bash
git clone https://github.com/yourusername/glossarion.git
cd glossarion

# Copy environment template
cp .env.example .env
# Edit .env with your settings (DB password, etc.)
```

### 2. Deploy with Docker Compose

```bash
# Build and start all services
docker-compose up -d

# Watch logs
docker-compose logs -f
```

### 3. Access the App

Open your browser and navigate to:
- `http://<your-pi-ip>:80` (HTTP)
- `http://localhost:80` (if running locally)

## Configuration

### Environment Variables (.env)

```env
# Database
POSTGRES_USER=glossarion
POSTGRES_PASSWORD=your_secure_password
POSTGRES_DB=glossarion

# Backend
DATABASE_URL=postgresql+asyncpg://glossarion:your_secure_password@db:5432/glossarion
LIBRETRANSLATE_URL=http://libretranslate:3000
CORS_ORIGINS=http://localhost:5173,http://localhost:80

# Optional: Change default languages for auto-translate
SOURCE_LANGUAGE=en
TARGET_LANGUAGES=de,fr,es
```

### Portainer Deployment

1. In Portainer, go to **Stacks** → **Add stack**
2. Paste the contents of `docker-compose.yml`
3. Add environment variables in the "Env" section
4. Deploy the stack

## Usage

### Adding Entries

1. Click the **+** button to add a new entry
2. Enter the text in your source language
3. Click **Auto-Translate** to generate translations
4. Verify/edit translations as needed
5. Click **Save**

### Editing Inline

- Double-click any cell to edit
- Press Enter to save
- Press Escape to cancel
- Status badge shows: `auto` (gray) or `verified` (green)

### Offline Mode

The app works offline after first load:
1. Service Worker caches the app
2. IndexedDB stores entries locally
3. Changes sync when back online
4. Offline indicator shows sync status

## API Reference

### Entries

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/entries` | List all entries |
| POST | `/api/entries` | Create entry |
| GET | `/api/entries/{id}` | Get single entry |
| PUT | `/api/entries/{id}` | Update entry |
| DELETE | `/api/entries/{id}` | Delete entry |

### Translations

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/entries/{id}/translations` | Add translation |
| PUT | `/api/translations/{id}` | Update translation |
| DELETE | `/api/translations/{id}` | Delete translation |
| POST | `/api/entries/{id}/translate` | Auto-translate |

### Sync

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/sync` | Get all data (for sync) |
| GET | `/api/languages` | List supported languages |
| POST | `/api/export` | Export as JSON/CSV |

## Development

### Local Development

```bash
# Backend
cd backend
python -m venv venv
source venv/bin/activate  # or venv\Scripts\activate on Windows
pip install -r requirements.txt
uvicorn app.main:app --reload

# Frontend (new terminal)
cd frontend
npm install
npm run dev
```

### Running Tests

```bash
# Backend
cd backend
pytest

# Frontend
cd frontend
npm test
```

## Project Structure

```
glossarion/
├── backend/
│   ├── app/
│   │   ├── main.py           # FastAPI app entry
│   │   ├── config.py         # Settings
│   │   ├── database.py       # DB connection
│   │   ├── models/           # SQLAlchemy models
│   │   ├── schemas/          # Pydantic schemas
│   │   ├── api/              # API routes
│   │   └── services/         # Business logic
│   ├── requirements.txt
│   └── Dockerfile
├── frontend/
│   ├── src/
│   │   ├── components/       # React components
│   │   ├── hooks/           # Custom hooks
│   │   ├── stores/           # Zustand stores
│   │   ├── services/         # API client
│   │   └── utils/            # Helpers
│   ├── package.json
│   └── Dockerfile
├── docker-compose.yml
├── .env.example
└── README.md
```

## Troubleshooting

### LibreTranslate not translating

Check that LibreTranslate container is running:
```bash
docker-compose logs libretranslate
```

If models are missing:
```bash
docker-compose exec libretranslate python -m libretranslate.download
```

### Database connection issues

```bash
# Check if PostgreSQL is ready
docker-compose exec db pg_isready

# View logs
docker-compose logs db
```

### Clear all data

```bash
docker-compose down -v  # Removes volumes
docker-compose up -d     # Fresh start
```

## License

MIT License - See LICENSE file for details.
