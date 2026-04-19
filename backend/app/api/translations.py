from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models import Translation
from app.schemas import TranslationUpdate, TranslationResponse

router = APIRouter(prefix="/api/translations", tags=["translations"])


@router.put("/{translation_id}", response_model=TranslationResponse)
async def update_translation(
    translation_id: str,
    data: TranslationUpdate,
    db: AsyncSession = Depends(get_db)
):
    query = select(Translation).where(Translation.id == translation_id)
    result = await db.execute(query)
    translation = result.scalar_one_or_none()
    
    if not translation:
        raise HTTPException(status_code=404, detail="Translation not found")
    
    if data.text is not None:
        translation.text = data.text
    if data.status is not None:
        translation.status = data.status
    if data.word_type is not None:
        translation.word_type = data.word_type if data.word_type != '' else None
    if data.gender is not None:
        translation.gender = data.gender if data.gender != '' else None
    if data.article is not None:
        translation.article = data.article if data.article != '' else None
    if data.sign_language_url is not None:
        translation.sign_language_url = data.sign_language_url if data.sign_language_url != '' else None
    
    translation.updated_at = datetime.utcnow()
    await db.commit()
    await db.refresh(translation)
    return translation


@router.delete("/{translation_id}")
async def delete_translation(
    translation_id: str,
    db: AsyncSession = Depends(get_db)
):
    query = select(Translation).where(Translation.id == translation_id)
    result = await db.execute(query)
    translation = result.scalar_one_or_none()
    
    if not translation:
        raise HTTPException(status_code=404, detail="Translation not found")
    
    await db.delete(translation)
    await db.commit()
    return {"message": "Translation deleted"}
