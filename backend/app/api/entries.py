from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.database import get_db
from app.models import Entry, Translation
from app.schemas import EntryCreate, EntryUpdate, EntryResponse, TranslationCreate, TranslationResponse
from app.services import TranslatorService, get_translator_service
from app.config import get_settings

router = APIRouter(prefix="/api/entries", tags=["entries"])
settings = get_settings()


@router.get("", response_model=list[EntryResponse])
async def list_entries(
    language: str | None = None,
    tag: str | None = None,
    db: AsyncSession = Depends(get_db)
):
    query = select(Entry).options(selectinload(Entry.translations))
    
    if tag:
        query = query.where(Entry.tags.contains([tag]))
    
    result = await db.execute(query)
    entries = result.scalars().all()
    
    if language:
        filtered = []
        for entry in entries:
            entry.translations = [t for t in entry.translations if t.language_code == language]
            filtered.append(entry)
        return filtered
    
    return entries


@router.post("", response_model=EntryResponse, status_code=status.HTTP_201_CREATED)
async def create_entry(
    entry_data: EntryCreate,
    db: AsyncSession = Depends(get_db)
):
    source_lang = entry_data.source_language or settings.source_language
    
    entry = Entry(
        context=entry_data.context,
        tags=entry_data.tags
    )
    db.add(entry)
    await db.flush()
    
    if entry_data.context:
        translation = Translation(
            entry_id=entry.id,
            language_code=source_lang,
            text=entry_data.context,
            status="verified"
        )
        db.add(translation)
    
    await db.commit()
    await db.refresh(entry)
    return entry


@router.get("/{entry_id}", response_model=EntryResponse)
async def get_entry(
    entry_id: str,
    db: AsyncSession = Depends(get_db)
):
    query = select(Entry).options(selectinload(Entry.translations)).where(Entry.id == entry_id)
    result = await db.execute(query)
    entry = result.scalar_one_or_none()
    
    if not entry:
        raise HTTPException(status_code=404, detail="Entry not found")
    
    return entry


@router.put("/{entry_id}", response_model=EntryResponse)
async def update_entry(
    entry_id: str,
    entry_data: EntryUpdate,
    db: AsyncSession = Depends(get_db)
):
    query = select(Entry).where(Entry.id == entry_id)
    result = await db.execute(query)
    entry = result.scalar_one_or_none()
    
    if not entry:
        raise HTTPException(status_code=404, detail="Entry not found")
    
    if entry_data.context is not None:
        entry.context = entry_data.context
    if entry_data.tags is not None:
        entry.tags = entry_data.tags
    
    entry.updated_at = datetime.utcnow()
    await db.commit()
    await db.refresh(entry)
    return entry


@router.delete("/{entry_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_entry(
    entry_id: str,
    db: AsyncSession = Depends(get_db)
):
    query = select(Entry).where(Entry.id == entry_id)
    result = await db.execute(query)
    entry = result.scalar_one_or_none()
    
    if not entry:
        raise HTTPException(status_code=404, detail="Entry not found")
    
    await db.delete(entry)
    await db.commit()


@router.post("/{entry_id}/translations", response_model=TranslationResponse, status_code=status.HTTP_201_CREATED)
async def add_translation(
    entry_id: str,
    translation_data: TranslationCreate,
    db: AsyncSession = Depends(get_db)
):
    query = select(Entry).where(Entry.id == entry_id)
    result = await db.execute(query)
    entry = result.scalar_one_or_none()
    
    if not entry:
        raise HTTPException(status_code=404, detail="Entry not found")
    
    translation = Translation(
        entry_id=entry_id,
        language_code=translation_data.language_code,
        text=translation_data.text,
        status=translation_data.status
    )
    db.add(translation)
    entry.updated_at = datetime.utcnow()
    await db.commit()
    await db.refresh(translation)
    
    return translation


@router.post("/{entry_id}/translate")
async def auto_translate(
    entry_id: str,
    translator: TranslatorService = Depends(get_translator_service),
    db: AsyncSession = Depends(get_db)
):
    query = select(Entry).options(selectinload(Entry.translations)).where(Entry.id == entry_id)
    result = await db.execute(query)
    entry = result.scalar_one_or_none()
    
    if not entry:
        raise HTTPException(status_code=404, detail="Entry not found")
    
    if not entry.translations:
        raise HTTPException(status_code=400, detail="No translations found. Add a source translation first.")
    
    source_translation = entry.translations[0]
    source_lang = source_translation.language_code
    source_text = source_translation.text
    
    target_langs = [lang for lang in settings.target_language_list if lang != source_lang]
    
    translations = await translator.translate_to_languages(
        source_text,
        source_lang=source_lang,
        target_langs=target_langs
    )
    
    created = []
    for lang_code, text in translations.items():
        translation = Translation(
            entry_id=entry_id,
            language_code=lang_code,
            text=text,
            status="auto"
        )
        db.add(translation)
        created.append({
            "language_code": lang_code,
            "text": text,
            "status": "auto"
        })
    
    entry.updated_at = datetime.utcnow()
    await db.commit()
    
    return {"translations": created}
