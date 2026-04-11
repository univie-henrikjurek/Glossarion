from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.database import get_db
from app.models import Entry, Translation
from app.schemas import EntryCreate, EntryUpdate, EntryResponse, TranslationCreate, TranslationResponse
from app.services import TranslatorService, get_translator_service, get_grammar_service, get_wiktionary_service
from app.config import get_settings

router = APIRouter(prefix="/api/entries", tags=["entries"])
settings = get_settings()


@router.get("", response_model=list[EntryResponse])
async def list_entries(
    dictionary_id: str | None = Query(default=None),
    language: str | None = None,
    tag: str | None = None,
    db: AsyncSession = Depends(get_db)
):
    query = select(Entry).options(selectinload(Entry.translations))
    
    if dictionary_id:
        query = query.where(Entry.dictionary_id == dictionary_id)
    
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
    grammar_service=Depends(get_grammar_service),
    wiktionary_service=Depends(get_wiktionary_service),
    db: AsyncSession = Depends(get_db)
):
    source_lang = entry_data.source_language or settings.source_language
    
    entry = Entry(
        context=entry_data.context,
        tags=entry_data.tags,
        dictionary_id=entry_data.dictionary_id
    )
    db.add(entry)
    await db.flush()
    
    if entry_data.context:
        word_type = None
        gender = None
        article = None
        grammar_details = None
        
        grammar_info = grammar_service.analyze(entry_data.context, source_lang)
        if grammar_info.word_type:
            word_type = grammar_info.word_type
        
        wiktionary_info = wiktionary_service.lookup(entry_data.context, source_lang)
        if wiktionary_info.word_type:
            word_type = wiktionary_info.word_type
        if wiktionary_info.gender:
            gender = wiktionary_info.gender
        if wiktionary_info.article:
            article = wiktionary_info.article
        if wiktionary_info.details:
            grammar_details = {"wiktionary": wiktionary_info.details}
        if grammar_info.details:
            grammar_details = grammar_details or {}
            grammar_details["spacy"] = grammar_info.details
        
        translation = Translation(
            entry_id=entry.id,
            language_code=source_lang,
            text=entry_data.context,
            status="verified",
            word_type=word_type,
            gender=gender,
            article=article,
            grammar_details=grammar_details
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
    grammar_service=Depends(get_grammar_service),
    wiktionary_service=Depends(get_wiktionary_service),
    db: AsyncSession = Depends(get_db),
    target_langs: list[str] = Query(default=None)
):
    query = select(Entry).options(selectinload(Entry.translations)).where(Entry.id == entry_id)
    result = await db.execute(query)
    entry = result.scalar_one_or_none()
    
    if not entry:
        raise HTTPException(status_code=404, detail="Entry not found")
    
    if not entry.translations:
        raise HTTPException(status_code=400, detail="No translations found. Add a source translation first.")
    
    verified_translations = [t for t in entry.translations if t.status == 'verified']
    if verified_translations:
        source_translation = min(verified_translations, key=lambda t: t.created_at)
    else:
        source_translation = min(entry.translations, key=lambda t: t.created_at)
    source_lang = source_translation.language_code
    source_text = source_translation.text
    
    if target_langs is None:
        target_langs = [lang for lang in settings.target_language_list if lang != source_lang]
    else:
        target_langs = [lang for lang in target_langs if lang != source_lang]
    
    existing_langs = {t.language_code for t in entry.translations}
    target_langs = [lang for lang in target_langs if lang not in existing_langs]
    
    if not target_langs:
        return {"translations": [], "message": "All target languages already exist"}
    
    translations = await translator.translate_to_languages(
        source_text,
        source_lang=source_lang,
        target_langs=target_langs
    )
    
    created = []
    for lang_code, text in translations.items():
        word_type = None
        gender = None
        article = None
        grammar_details = None
        
        grammar_info = grammar_service.analyze(text, lang_code)
        if grammar_info.word_type:
            word_type = grammar_info.word_type
        
        wiktionary_info = wiktionary_service.lookup(text, lang_code)
        if wiktionary_info.word_type:
            word_type = wiktionary_info.word_type
        if wiktionary_info.gender:
            gender = wiktionary_info.gender
        if wiktionary_info.article:
            article = wiktionary_info.article
        if wiktionary_info.details:
            grammar_details = {"wiktionary": wiktionary_info.details}
        if grammar_info.details:
            grammar_details = grammar_details or {}
            grammar_details["spacy"] = grammar_info.details
        
        translation = Translation(
            entry_id=entry_id,
            language_code=lang_code,
            text=text,
            status="auto",
            word_type=word_type,
            gender=gender,
            article=article,
            grammar_details=grammar_details
        )
        db.add(translation)
        created.append({
            "language_code": lang_code,
            "text": text,
            "status": "auto",
            "word_type": word_type,
            "gender": gender,
            "article": article
        })
    
    entry.updated_at = datetime.utcnow()
    await db.commit()
    
    return {"translations": created}
