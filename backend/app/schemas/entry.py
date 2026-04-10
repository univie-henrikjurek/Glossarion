from datetime import datetime
from typing import Optional, Any
from pydantic import BaseModel, Field


class EntryBase(BaseModel):
    context: Optional[str] = None
    tags: list[str] = Field(default_factory=list)


class EntryCreate(EntryBase):
    source_language: Optional[str] = None


class EntryUpdate(BaseModel):
    context: Optional[str] = None
    tags: Optional[list[str]] = None


class EntryResponse(BaseModel):
    id: str
    context: Optional[str] = None
    tags: list[str] = Field(default_factory=list)
    translations: list["TranslationResponseBase"] = Field(default_factory=list)
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True


class TranslationResponseBase(BaseModel):
    id: str
    entry_id: str
    language_code: str
    text: str
    status: str
    word_type: Optional[str] = None
    gender: Optional[str] = None
    article: Optional[str] = None
    grammar_details: Optional[Any] = None
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True
