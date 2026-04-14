from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional

from app.database import get_db
from app.models import Dictionary, Entry

router = APIRouter(prefix="/api/dictionaries", tags=["dictionaries"])


class DictionaryCreate(BaseModel):
    name: str
    source_language: str = "de"


class DictionaryUpdate(BaseModel):
    name: Optional[str] = None
    source_language: Optional[str] = None


class DictionaryResponse(BaseModel):
    id: str
    name: str
    source_language: str
    created_at: datetime
    entry_count: int

    class Config:
        from_attributes = True


@router.get("", response_model=list[DictionaryResponse])
async def list_dictionaries(db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Dictionary).order_by(Dictionary.created_at.desc())
    )
    dictionaries = result.scalars().all()
    
    response = []
    for dictionary in dictionaries:
        entries_result = await db.execute(
            select(Entry).where(Entry.dictionary_id == dictionary.id)
        )
        entries = entries_result.scalars().all()
        entry_count = len(entries)
        
        response.append(DictionaryResponse(
            id=str(dictionary.id),
            name=dictionary.name,
            source_language=dictionary.source_language,
            created_at=dictionary.created_at,
            entry_count=entry_count
        ))
    
    if not response:
        default_dict = Dictionary(
            name="My Dictionary",
            source_language="de"
        )
        db.add(default_dict)
        await db.commit()
        await db.refresh(default_dict)
        response.append(DictionaryResponse(
            id=str(default_dict.id),
            name=default_dict.name,
            source_language=default_dict.source_language,
            created_at=default_dict.created_at,
            entry_count=0
        ))
    
    return response


@router.post("", response_model=DictionaryResponse)
async def create_dictionary(
    data: DictionaryCreate,
    db: AsyncSession = Depends(get_db)
):
    dictionary = Dictionary(
        name=data.name,
        source_language=data.source_language
    )
    db.add(dictionary)
    await db.commit()
    await db.refresh(dictionary)
    
    return DictionaryResponse(
        id=str(dictionary.id),
        name=dictionary.name,
        source_language=dictionary.source_language,
        created_at=dictionary.created_at,
        entry_count=0
    )


@router.put("/{dictionary_id}", response_model=DictionaryResponse)
async def update_dictionary(
    dictionary_id: str,
    data: DictionaryUpdate,
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(Dictionary).where(Dictionary.id == dictionary_id)
    )
    dictionary = result.scalar_one_or_none()
    
    if not dictionary:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Dictionary not found"
        )
    
    if data.name is not None:
        dictionary.name = data.name
    if data.source_language is not None:
        dictionary.source_language = data.source_language
    
    await db.commit()
    await db.refresh(dictionary)
    
    entries_result = await db.execute(
        select(Entry).where(Entry.dictionary_id == dictionary.id)
    )
    entry_count = len(entries_result.scalars().all())
    
    return DictionaryResponse(
        id=str(dictionary.id),
        name=dictionary.name,
        source_language=dictionary.source_language,
        created_at=dictionary.created_at,
        entry_count=entry_count
    )


@router.delete("/{dictionary_id}")
async def delete_dictionary(
    dictionary_id: str,
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(Dictionary).where(Dictionary.id == dictionary_id)
    )
    dictionary = result.scalar_one_or_none()
    
    if not dictionary:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Dictionary not found"
        )
    
    await db.delete(dictionary)
    await db.commit()
    
    return {"message": "Dictionary deleted successfully"}
