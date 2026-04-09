from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.database import init_db, AsyncSessionLocal
from app.models import Entry
from app.api import entries_router, translations_router
from app.config import get_settings
from app.services import TranslatorService

settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db()
    yield


app = FastAPI(
    title="Glossarion API",
    description="Self-hosted multilingual dictionary API",
    version="1.0.0",
    lifespan=lifespan
)

cors_origins = [origin.strip() for origin in settings.cors_origins.split(",")]

app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(entries_router)
app.include_router(translations_router)


@app.get("/health")
async def health_check():
    translator = TranslatorService()
    lt_healthy = await translator.health_check()
    return {
        "status": "healthy",
        "libretranslate": "connected" if lt_healthy else "unavailable"
    }


@app.get("/api/languages")
async def list_languages():
    translator = TranslatorService()
    languages = await translator.get_languages()
    return {
        "source": settings.source_language,
        "targets": settings.target_language_list,
        "available": languages
    }


@app.get("/api/sync")
async def sync_data():
    async with AsyncSessionLocal() as session:
        result = await session.execute(select(Entry).options(selectinload(Entry.translations)))
        entries = result.scalars().all()
        return {
            "entries": [
                {
                    "id": e.id,
                    "context": e.context,
                    "tags": e.tags,
                    "created_at": e.created_at.isoformat(),
                    "updated_at": e.updated_at.isoformat(),
                    "translations": [
                        {
                            "id": t.id,
                            "entry_id": t.entry_id,
                            "language_code": t.language_code,
                            "text": t.text,
                            "status": t.status,
                            "created_at": t.created_at.isoformat(),
                            "updated_at": t.updated_at.isoformat()
                        }
                        for t in e.translations
                    ]
                }
                for e in entries
            ],
            "sync_timestamp": "now"
        }


@app.post("/api/export")
async def export_data(format: str = "json"):
    async with AsyncSessionLocal() as session:
        result = await session.execute(select(Entry).options(selectinload(Entry.translations)))
        entries = result.scalars().all()
        
        data = {
            "entries": [
                {
                    "context": e.context,
                    "tags": e.tags,
                    "translations": {t.language_code: t.text for t in e.translations}
                }
                for e in entries
            ]
        }
        
        if format == "csv":
            import csv
            import io
            output = io.StringIO()
            writer = csv.writer(output)
            writer.writerow(["context", "tags", "translations"])
            for e in entries:
                translations_str = "; ".join([f"{t.language_code}: {t.text}" for t in e.translations])
                writer.writerow([e.context, ",".join(e.tags or []), translations_str])
            return {"content": output.getvalue(), "format": "csv"}
        
        return {"content": data, "format": "json"}
