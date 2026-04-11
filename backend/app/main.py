from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import select, text
from sqlalchemy.orm import selectinload

from app.database import init_db, AsyncSessionLocal, engine
from app.models import Entry
from app.api import entries_router, translations_router, auth_router, dictionaries_router, invitations_router
from app.config import get_settings
from app.services import TranslatorService

settings = get_settings()


async def run_migrations():
    async with engine.begin() as conn:
        await conn.execute(text("""
            DO $$
            BEGIN
                -- Translation columns
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'translations' AND column_name = 'word_type') THEN
                    ALTER TABLE translations ADD COLUMN word_type VARCHAR(20);
                END IF;
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'translations' AND column_name = 'gender') THEN
                    ALTER TABLE translations ADD COLUMN gender VARCHAR(10);
                END IF;
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'translations' AND column_name = 'article') THEN
                    ALTER TABLE translations ADD COLUMN article VARCHAR(20);
                END IF;
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'translations' AND column_name = 'grammar_details') THEN
                    ALTER TABLE translations ADD COLUMN grammar_details JSON;
                END IF;
                
                -- Users table
                IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'users') THEN
                    CREATE TABLE users (
                        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                        username VARCHAR(50) UNIQUE NOT NULL,
                        email VARCHAR(100) UNIQUE NOT NULL,
                        password_hash VARCHAR(255) NOT NULL,
                        name VARCHAR(100),
                        created_at TIMESTAMP DEFAULT NOW(),
                        updated_at TIMESTAMP DEFAULT NOW()
                    );
                    CREATE INDEX idx_users_username ON users(username);
                    CREATE INDEX idx_users_email ON users(email);
                END IF;
                
                -- Dictionaries table
                IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'dictionaries') THEN
                    CREATE TABLE dictionaries (
                        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                        name VARCHAR(100) NOT NULL,
                        owner_id UUID NOT NULL REFERENCES users(id),
                        source_language VARCHAR(10) DEFAULT 'de',
                        created_at TIMESTAMP DEFAULT NOW(),
                        updated_at TIMESTAMP DEFAULT NOW()
                    );
                END IF;
                
                -- Dictionary members table
                IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'dictionary_members') THEN
                    CREATE TABLE dictionary_members (
                        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                        dictionary_id UUID NOT NULL REFERENCES dictionaries(id) ON DELETE CASCADE,
                        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                        role VARCHAR(20) NOT NULL DEFAULT 'editor',
                        invited_at TIMESTAMP DEFAULT NOW(),
                        UNIQUE(dictionary_id, user_id)
                    );
                END IF;
                
                -- Invitations table
                IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'invitations') THEN
                    CREATE TABLE invitations (
                        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                        dictionary_id UUID NOT NULL REFERENCES dictionaries(id) ON DELETE CASCADE,
                        token VARCHAR(64) UNIQUE NOT NULL,
                        role VARCHAR(20) NOT NULL DEFAULT 'editor',
                        created_by UUID NOT NULL REFERENCES users(id),
                        expires_at TIMESTAMP NOT NULL,
                        accepted VARCHAR(10) DEFAULT 'pending',
                        accepted_by UUID REFERENCES users(id),
                        accepted_at TIMESTAMP,
                        created_at TIMESTAMP DEFAULT NOW()
                    );
                    CREATE INDEX idx_invitations_token ON invitations(token);
                END IF;
                
                -- Dictionary ID on entries
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'entries' AND column_name = 'dictionary_id') THEN
                    ALTER TABLE entries ADD COLUMN dictionary_id UUID REFERENCES dictionaries(id);
                END IF;
            END $$;
        """))


@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db()
    await run_migrations()
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
app.include_router(auth_router)
app.include_router(dictionaries_router)
app.include_router(invitations_router)


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
                            "word_type": t.word_type,
                            "gender": t.gender,
                            "article": t.article,
                            "grammar_details": t.grammar_details,
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
